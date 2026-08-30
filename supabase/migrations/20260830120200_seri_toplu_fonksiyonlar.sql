-- Tekrarlayan etkinlik serileri — 3/4: toplu güncelleme ve silme.

-- -----------------------------------------------------------------------------
-- 1. seri_guncelle — iki toplu kapsam
-- -----------------------------------------------------------------------------
-- 'sonrakiler' SERİYİ BÖLER: pivot ve sonrası yeni bir event_series satırına
-- taşınır (Google Takvim davranışı). Bölmeseydik iki yarı tek kart olarak
-- katlanır, temsilci en yakın tekrar olurdu ve YENİ BAŞLIKLA ARAMA HİÇ SONUÇ
-- VERMEZDİ. Bölünce iki yarı ayrı ayrı katlanır ve ikisi de aranabilir.
DROP FUNCTION IF EXISTS public.seri_guncelle(uuid, text, timestamptz, text, text,
  text, int, text, boolean);
CREATE OR REPLACE FUNCTION public.seri_guncelle(
  p_series_id uuid,
  p_kapsam text,              -- 'sonrakiler' | 'tumu'
  p_from timestamptz,         -- pivot; 'tumu' kapsamında yok sayılır
  p_title text,
  p_description text,
  p_location text,
  p_max_attendees int,
  p_cover_image_url text,
  p_kapak_degissin boolean
)
RETURNS TABLE (guncellenen int, atlanan int, yeni_series_id uuid, ayrildi int, bildirilen int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
DECLARE
  v_com uuid;
  v_from timestamptz;
  v_yeni uuid;
  v_tasinan int;
  v_gun int := 0;
  v_atl int := 0;
  v_ayrildi int := 0;
  v_bildirilen int := 0;
  v_idler uuid[];
  v_istek_devral uuid;
BEGIN
  -- TEK SAVUNMA KATMANI. SECURITY DEFINER events politikalarını atlıyor;
  -- p_series_id istemciden geliyor ve series_id anon'a bile okunabilir.
  SELECT community_id INTO v_com FROM event_series WHERE id = p_series_id;
  IF v_com IS NULL THEN RAISE EXCEPTION 'seri bulunamadi'; END IF;
  IF NOT public.topluluk_yoneticisi_mi(v_com) THEN RAISE EXCEPTION 'yetkisiz'; END IF;

  IF p_kapsam NOT IN ('sonrakiler','tumu') THEN
    RAISE EXCEPTION 'gecersiz kapsam';
  END IF;

  IF p_kapsam = 'sonrakiler' AND p_from IS NULL THEN
    RAISE EXCEPTION 'pivot gerekli';
  END IF;

  -- GEÇMİŞ KORUMASI. eventEditSchema'da "gelecekte olmalı" kısıtı bilinçli
  -- olarak yok (tek etkinlikte zararsız); seri çapında bu boşluk tüm seriyi
  -- geçmişe atmayı mümkün kılardı.
  v_from := GREATEST(COALESCE(p_from, now()), now());
  IF p_kapsam = 'tumu' THEN v_from := now(); END IF;

  -- Etkilenecek satırlar: elle düzenlenmiş olanlar HARİÇ.
  SELECT array_agg(e.id) INTO v_idler FROM events e
   WHERE e.series_id = p_series_id
     AND e.event_date >= v_from
     AND e.seri_disina_alindi_at IS NULL;

  SELECT count(*)::int INTO v_atl FROM events e
   WHERE e.series_id = p_series_id
     AND e.event_date >= v_from
     AND e.seri_disina_alindi_at IS NOT NULL;

  IF v_idler IS NULL THEN
    RETURN QUERY SELECT 0, v_atl, NULL::uuid, 0, 0;
    RETURN;
  END IF;

  IF p_kapsam = 'sonrakiler' THEN
    SELECT count(*)::int INTO v_tasinan FROM events e WHERE e.id = ANY(v_idler);

    -- tekrar_sayisi CHECK BETWEEN 2 AND 26. İki satırdan azı taşınacaksa
    -- bölmek anlamsız: o satır(lar) seriden ÇIKARILIR (elle düzenlenmiş
    -- sayılır) ki yeni başlığıyla kendi kartında görünüp aranabilsin.
    IF v_tasinan < 2 THEN
      UPDATE events SET seri_disina_alindi_at = now() WHERE id = ANY(v_idler);
      GET DIAGNOSTICS v_ayrildi = ROW_COUNT;
    ELSE
      -- istek_id'yi yeni seriye DEVRETMEDEN once kaynaktan sok: kaynak satir
      -- (bu bolmede bosalmasa bile) HALEN ayni deger ile satirda duruyor,
      -- event_series_istek_benzersiz KISMI ama DEFERRABLE degil — ayni
      -- (organizer_id, istek_id) ile ikinci satiri INSERT etmek, kaynak
      -- henuz silinmemisken aninda 23505 verir. Once kaynaktan sokup NULL
      -- birakiyoruz, sonra yeni satira tasiyoruz.
      SELECT s.istek_id INTO v_istek_devral FROM event_series s WHERE s.id = p_series_id;
      IF v_istek_devral IS NOT NULL THEN
        UPDATE event_series SET istek_id = NULL WHERE id = p_series_id;
      END IF;

      INSERT INTO event_series (community_id, organizer_id, frekans, baslangic,
                                tekrar_sayisi, istek_id)
      SELECT s.community_id, s.organizer_id, s.frekans, v_from,
             LEAST(v_tasinan, 26), v_istek_devral
        FROM event_series s WHERE s.id = p_series_id
      RETURNING id INTO v_yeni;

      UPDATE events SET series_id = v_yeni WHERE id = ANY(v_idler);
    END IF;
  END IF;

  -- Beş alan da yazılır (form hepsini gönderiyor). event_date YOK.
  -- GERÇEKTEN DEĞİŞTİ mi kapısı: WHERE'e distinctness eklenmezse UPDATE
  -- kosulsuz calisir, updated_at her satira basilir ve asagidaki bildirim
  -- kosulsuz mail kuyruklar (bos "Kaydet" tikinca bile).
  UPDATE events SET
    title           = p_title,
    description     = p_description,
    location        = p_location,
    max_attendees   = p_max_attendees,
    cover_image_url = CASE WHEN p_kapak_degissin THEN p_cover_image_url
                           ELSE cover_image_url END,
    updated_at      = now()
  WHERE id = ANY(v_idler)
    AND (title           IS DISTINCT FROM p_title
      OR description     IS DISTINCT FROM p_description
      OR location        IS DISTINCT FROM p_location
      OR max_attendees   IS DISTINCT FROM p_max_attendees
      OR (p_kapak_degissin AND cover_image_url IS DISTINCT FROM p_cover_image_url));
  GET DIAGNOSTICS v_gun = ROW_COUNT;

  -- Kaynak seri boşaldıysa (pivot ilk tekrarsa hepsi taşınmış olur) artık
  -- kimsenin işaret etmediği satırı bırakmıyoruz.
  DELETE FROM event_series s
   WHERE s.id = p_series_id
     AND NOT EXISTS (SELECT 1 FROM events e WHERE e.series_id = s.id);

  -- BİLDİRİM: yalnizca GERCEKTEN degisen satir varsa. Bölme (v_yeni)
  -- gerceklesmisse bile hicbir alan degismediyse mail atilmaz — bölme
  -- kendi basina "degisiklik" sayilmiyor, form alanlarindaki fark sayiliyor.
  IF v_gun > 0 THEN
    -- kişi başına TEK mail, tekrar başına değil. 26 tekrarlı bir seri
    -- tekrar başına mail atsaydı tek işlemde 26 × katılımcı mail üretirdi.
    -- Adresler uygulama koduna HİÇ İNMİYOR: kasaya to_user_id yazılıyor,
    -- claim_email_outbox cron sırrıyla açıp profiles'tan adresi kendisi alıyor.
    INSERT INTO email_outbox (to_user_id, template, payload)
    SELECT DISTINCT r.user_id, 'event_change',
      jsonb_build_object(
        'tur', 'seri',
        'series_id', COALESCE(v_yeni, p_series_id),
        'title', p_title,
        'location', p_location,
        'adet', v_gun,
        'community_id', v_com,
        'community_name', (SELECT c.name FROM communities c WHERE c.id = v_com)
      )
    FROM rsvps r
    WHERE r.event_id = ANY(v_idler)
      AND r.user_id <> auth.uid()
      AND public.email_izni(r.user_id, 'event_change');
    GET DIAGNOSTICS v_bildirilen = ROW_COUNT;
  END IF;

  RETURN QUERY SELECT v_gun, v_atl, v_yeni, v_ayrildi, v_bildirilen;
END;
$function$;

-- -----------------------------------------------------------------------------
-- 2. seri_sil
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.seri_sil(uuid, text, timestamptz);
CREATE OR REPLACE FUNCTION public.seri_sil(
  p_series_id uuid,
  p_kapsam text,              -- 'sonrakiler' | 'tumu'
  p_from timestamptz
)
RETURNS TABLE (silinen int, atlanan int, bildirilen int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
DECLARE
  v_com uuid;
  v_from timestamptz;
  v_idler uuid[];
  v_sil int := 0;
  v_atl int := 0;
  v_bildirilen int := 0;
BEGIN
  SELECT community_id INTO v_com FROM event_series WHERE id = p_series_id;
  IF v_com IS NULL THEN RAISE EXCEPTION 'seri bulunamadi'; END IF;
  IF NOT public.topluluk_yoneticisi_mi(v_com) THEN RAISE EXCEPTION 'yetkisiz'; END IF;

  IF p_kapsam NOT IN ('sonrakiler','tumu') THEN
    RAISE EXCEPTION 'gecersiz kapsam';
  END IF;

  IF p_kapsam = 'sonrakiler' AND p_from IS NULL THEN
    RAISE EXCEPTION 'pivot gerekli';
  END IF;

  v_from := GREATEST(COALESCE(p_from, now()), now());
  IF p_kapsam = 'tumu' THEN v_from := now(); END IF;

  -- İkinci event_date >= now() koşulu fazlalık DEĞİL: 'tumu' dalında da
  -- geçmişi kilitleyen ikinci savunma. Katılım geçmişi ve check-in kayıtları
  -- korunuyor.
  -- seri_disina_alindi_at IS NULL: seri_guncelle ile SİMETRİK. Elle
  -- düzenlenmiş, kendi RSVP'lerini toplamış bir buluşma "tümünü sil" ile
  -- yok olmasın — rsvps/waitlist ON DELETE CASCADE geri dönüşsüz.
  SELECT array_agg(e.id) INTO v_idler FROM events e
   WHERE e.series_id = p_series_id
     AND e.event_date >= v_from
     AND e.event_date >= now()
     AND e.seri_disina_alindi_at IS NULL;

  SELECT count(*)::int INTO v_atl FROM events e
   WHERE e.series_id = p_series_id
     AND e.event_date >= v_from
     AND e.event_date >= now()
     AND e.seri_disina_alindi_at IS NOT NULL;

  IF v_idler IS NULL THEN
    RETURN QUERY SELECT 0, v_atl, 0;
    RETURN;
  END IF;

  -- BİLDİRİM SİLMEDEN ÖNCE yazılmak zorunda: rsvps.event_id ON DELETE CASCADE,
  -- yani silmeden sonra kime haber verileceği bilgisi kalmaz.
  -- Kişi başına TEK iptal maili.
  INSERT INTO email_outbox (to_user_id, template, payload)
  SELECT DISTINCT r.user_id, 'event_cancel',
    jsonb_build_object(
      'tur', 'seri',
      'title', (SELECT e.title FROM events e WHERE e.id = v_idler[1]),
      'adet', array_length(v_idler, 1),
      'community_id', v_com,
      'community_name', (SELECT c.name FROM communities c WHERE c.id = v_com)
    )
  FROM rsvps r
  WHERE r.event_id = ANY(v_idler)
    AND r.user_id <> auth.uid()
    AND public.email_izni(r.user_id, 'event_cancel');
  GET DIAGNOSTICS v_bildirilen = ROW_COUNT;

  -- Kuyruk temizliği: yoksa iptal mailinden SONRA "Yarın: X" gider ve
  -- mailin bağlantısı silinmiş uuid'ye 404 döner.
  DELETE FROM email_outbox
   WHERE sent_at IS NULL
     AND template = 'reminder'
     AND (payload->>'event_id')::uuid = ANY(v_idler);

  DELETE FROM events WHERE id = ANY(v_idler);
  GET DIAGNOSTICS v_sil = ROW_COUNT;

  DELETE FROM event_series s
   WHERE s.id = p_series_id
     AND NOT EXISTS (SELECT 1 FROM events e WHERE e.series_id = s.id);

  RETURN QUERY SELECT v_sil, v_atl, v_bildirilen;
END;
$function$;

-- -----------------------------------------------------------------------------
-- 3. Fonksiyon yetkileri
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.seri_guncelle(uuid, text, timestamptz, text, text,
  text, int, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seri_guncelle(uuid, text, timestamptz, text, text,
  text, int, text, boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.seri_sil(uuid, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seri_sil(uuid, text, timestamptz) TO authenticated;
