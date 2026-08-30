-- Tekrarlayan etkinlik serileri — 2/4: yazma fonksiyonları.
--
-- SECURITY DEFINER, events UPDATE/DELETE politikalarını (schema.sql:1047-1061)
-- TAMAMEN atlar. Görev 1'de yazma kolon bazlıya indirildiği için bu fonksiyonlar
-- tek yazma yolu; dolayısıyla FONKSİYON İÇİ YETKİ KONTROLÜ TEK SAVUNMA
-- KATMANIDIR. series_id anon'a bile okunabilir olduğundan hedef uuid'yi bulmak
-- zahmetsiz.

-- -----------------------------------------------------------------------------
-- 1. seri_olustur — tek işlem, N tekrar
-- -----------------------------------------------------------------------------
-- Neden tek RPC: POST /api/event "strict" rate limitte (dakikada 3, lib/rate-
-- limit.ts). Seri N ayrı POST ile kurulamaz — 4. tekrarda 429 alır, yarım kalır
-- ve geri alma yoktur.
CREATE OR REPLACE FUNCTION public.seri_olustur(
  p_community_id uuid,
  p_title text,
  p_description text,
  p_location text,
  p_baslangic timestamptz,
  p_frekans text,
  p_tekrar_sayisi int,
  p_max_attendees int,
  p_cover_image_url text,
  p_istek_id uuid
)
RETURNS TABLE (series_id uuid, ilk_event_id uuid, uretilen int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
DECLARE
  v_series uuid;
  v_ilk uuid;
  v_bu uuid;
  v_adim interval;
  v_i int;
  v_tarih timestamptz;
  v_sayac int;
BEGIN
  IF NOT public.topluluk_yoneticisi_mi(p_community_id) THEN
    RAISE EXCEPTION 'yetkisiz';
  END IF;

  -- Savunma iki katmanda: API zod ile, burada CHECK ile aynı sınır.
  IF p_frekans NOT IN ('haftalik','iki_haftalik','aylik') THEN
    RAISE EXCEPTION 'gecersiz frekans';
  END IF;
  IF p_tekrar_sayisi < 2 OR p_tekrar_sayisi > 26 THEN
    RAISE EXCEPTION 'tekrar sayisi 2 ile 26 arasinda olmali';
  END IF;

  -- İkizlenme koruması: aynı istek_id ile ikinci çağrı YENİ seri üretmez,
  -- mevcut seriyi döndürür. (İki kez basılan "Oluştur" düğmesi.)
  IF p_istek_id IS NOT NULL THEN
    SELECT s.id INTO v_series FROM event_series s
     WHERE s.organizer_id = auth.uid() AND s.istek_id = p_istek_id;
    IF v_series IS NOT NULL THEN
      SELECT e.id INTO v_ilk FROM events e
       WHERE e.series_id = v_series ORDER BY e.event_date LIMIT 1;
      SELECT count(*)::int INTO v_sayac FROM events e WHERE e.series_id = v_series;
      RETURN QUERY SELECT v_series, v_ilk, v_sayac;
      RETURN;
    END IF;
  END IF;

  BEGIN
    INSERT INTO event_series (community_id, organizer_id, frekans, baslangic,
                              tekrar_sayisi, istek_id)
    VALUES (p_community_id, auth.uid(), p_frekans, p_baslangic,
            p_tekrar_sayisi, p_istek_id)
    RETURNING id INTO v_series;
  EXCEPTION WHEN unique_violation THEN
    -- Eszamanli ikinci istek: ilk istek commit etmis. Yeni seri uretmiyoruz,
    -- onun kurdugu seriyi donduruyoruz.
    SELECT s.id INTO v_series FROM event_series s
     WHERE s.organizer_id = auth.uid() AND s.istek_id = p_istek_id;
    SELECT e.id INTO v_ilk FROM events e
     WHERE e.series_id = v_series ORDER BY e.event_date LIMIT 1;
    SELECT count(*)::int INTO v_sayac FROM events e WHERE e.series_id = v_series;
    RETURN QUERY SELECT v_series, v_ilk, v_sayac;
    RETURN;
  END;

  v_adim := CASE p_frekans
              WHEN 'haftalik'     THEN interval '7 days'
              WHEN 'iki_haftalik' THEN interval '14 days'
              WHEN 'aylik'        THEN interval '1 month'
            END;

  FOR v_i IN 0 .. p_tekrar_sayisi - 1 LOOP
    -- Duvar saati aritmetiği: Türkiye 2016'dan beri sabit UTC+3 olsa da
    -- "her salı 19:00" anlamını yaz saatine bağlı bırakmıyoruz.
    -- Aylık frekansta Postgres ayın son gününe kendisi düşürür ve çarpım
    -- HER ZAMAN başlangıçtan yapıldığı için 31 Ocak + 2 ay = 31 Mart olur
    -- (adım adım eklenseydi 28 Mart'a kayardı).
    v_tarih := ((p_baslangic AT TIME ZONE 'Europe/Istanbul') + (v_adim * v_i))
                 AT TIME ZONE 'Europe/Istanbul';

    INSERT INTO events (title, description, location, event_date, organizer_id,
                        community_id, max_attendees, cover_image_url,
                        series_id, occurrence_index)
    VALUES (p_title, p_description, p_location, v_tarih, auth.uid(),
            p_community_id, p_max_attendees, p_cover_image_url,
            v_series, v_i)
    RETURNING id INTO v_bu;

    IF v_i = 0 THEN v_ilk := v_bu; END IF;
  END LOOP;

  RETURN QUERY SELECT v_series, v_ilk, p_tekrar_sayisi;
END;
$function$;

-- -----------------------------------------------------------------------------
-- 2. etkinlik_guncelle — tekil düzenleme + elle düzenleme izi
-- -----------------------------------------------------------------------------
-- Yetki topluluk_yoneticisi_mi ile ÇÖZÜLEMEZ: events.community_id NULLABLE,
-- yani topluluğa bağlı olmayan etkinliklerde kontrol boşa düşerdi.
-- etkinlik_yoneticisi_mi (schema.sql:830) checkCanManage()'in birebir DB
-- karşılığı: organizatör VEYA topluluğun onaylı founder/admin'i.
--
-- p_kapak_degissin: cover_image_url ÜÇ DURUMLU (route.ts:121). Alan gövdede
-- yoksa kapak DOKUNULMAZ, boş/null ise kaldırılır, URL ise değişir. Tek bir
-- text parametre bu üç durumu taşıyamaz — "NULL = dokunma" deseydik kapağı
-- kaldırmak imkânsız olurdu.
CREATE OR REPLACE FUNCTION public.etkinlik_guncelle(
  p_event_id uuid,
  p_title text,
  p_description text,
  p_location text,
  p_event_date timestamptz,
  p_max_attendees int,
  p_cover_image_url text,
  p_kapak_degissin boolean
)
RETURNS TABLE (guncellendi boolean, iz_yazildi boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
DECLARE
  e record;
  v_fark boolean;
  v_tarih_degisti boolean;
  v_yeni_kapak text;
BEGIN
  IF NOT public.etkinlik_yoneticisi_mi(p_event_id) THEN
    RAISE EXCEPTION 'yetkisiz';
  END IF;

  SELECT * INTO e FROM events WHERE id = p_event_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'etkinlik bulunamadi'; END IF;

  v_yeni_kapak := CASE WHEN p_kapak_degissin THEN p_cover_image_url
                       ELSE e.cover_image_url END;

  v_tarih_degisti := e.event_date IS DISTINCT FROM p_event_date;

  -- Damga GERÇEK farka bağlı ve ALTI alana birden bakıyor. route.ts:138-147'deki
  -- mevcut "changes" hesabı YENİDEN KULLANILMAZ — o hesap yalnızca
  -- title/event_date/location'a bakıyor, yani sadece açıklamayı değiştiren biri
  -- iz bırakmazdı. (O hesap MAİL tetikleyicisi olarak yerinde kalıyor; iki
  -- karar ayrı.)
  v_fark :=
       e.title          IS DISTINCT FROM p_title
    OR e.description    IS DISTINCT FROM p_description
    OR e.location       IS DISTINCT FROM p_location
    OR v_tarih_degisti
    OR e.max_attendees  IS DISTINCT FROM p_max_attendees
    OR e.cover_image_url IS DISTINCT FROM v_yeni_kapak;

  -- Hiçbir şey değiştirmeden "Kaydet"e basmak iz bırakmamalı.
  IF NOT v_fark THEN
    RETURN QUERY SELECT false, false;
    RETURN;
  END IF;

  -- UNIQUE (series_id, event_date) capsaminda kaliyoruz: seri_disina_alindi_at
  -- damgasi series_id'yi TEMIZLEMIYOR. Ham 23505 yerine Turkce mesaj.
  IF v_tarih_degisti AND e.series_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM events x
     WHERE x.series_id = e.series_id
       AND x.event_date = p_event_date
       AND x.id <> p_event_id
  ) THEN
    RAISE EXCEPTION 'o tarihte seride baska bulusma var';
  END IF;

  UPDATE events SET
    title           = p_title,
    description     = p_description,
    location        = p_location,
    event_date      = p_event_date,
    max_attendees   = p_max_attendees,
    cover_image_url = v_yeni_kapak,
    updated_at      = now(),
    -- Seri üyesiyse artık "elle düzenlenmiş": toplu güncelleme bunu ATLAR.
    seri_disina_alindi_at = CASE WHEN series_id IS NOT NULL
                                 THEN now() ELSE seri_disina_alindi_at END,
    -- Tarih taşındıysa hatırlatma yeniden kuyruğa girebilmeli; yoksa taşınan
    -- buluşma için hatırlatma bir daha HİÇ gitmez. Kolon istemciye kapalı
    -- olduğu için sıfırlama burada olmak zorunda.
    reminder_sent_at = CASE WHEN v_tarih_degisti THEN NULL ELSE reminder_sent_at END
  WHERE id = p_event_id;

  RETURN QUERY SELECT true, (e.series_id IS NOT NULL);
END;
$function$;

-- -----------------------------------------------------------------------------
-- 3. Fonksiyon yetkileri
-- -----------------------------------------------------------------------------
-- Postgres'te yeni fonksiyon PUBLIC'e EXECUTE ile doğar. Yalnızca GRANT yazmak
-- koruma DEĞİLDİR — REVOKE olmadan anon da çağırabilir. (schema.sql:1201 civarı,
-- 20 fonksiyonda uygulanmış.)
REVOKE ALL ON FUNCTION public.seri_olustur(uuid, text, text, text, timestamptz,
  text, int, int, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seri_olustur(uuid, text, text, text, timestamptz,
  text, int, int, text, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.etkinlik_guncelle(uuid, text, text, text,
  timestamptz, int, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.etkinlik_guncelle(uuid, text, text, text,
  timestamptz, int, text, boolean) TO authenticated;

-- anon'a hiçbirinde EXECUTE verilmiyor.
