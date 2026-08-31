-- Katılım karnesi: sayaçlar SECURITY DEFINER fonksiyondan.
--
-- NEDEN FONKSİYON — profil sayfası "Katıldığı" sayısını `rsvps` tablosunu
-- okuyarak hesaplıyordu. Ama `anon` rolünün rsvps üzerinde HİÇ yetkisi yok
-- (yalnızca authenticated'a kolon bazlı SELECT verilmiş) ve sayfa sorgunun
-- hatasını yutuyordu: sorgu 42501 dönüyor, `rsvps` null oluyor, sayaç sessizce
-- 0 yazıyordu. Yani giriş yapmamış her ziyaretçi için katılım verisi
-- görünmezdi — bir "katılım karnesi" için kabul edilemez.
--
-- ALTERNATİF REDDEDİLDİ: `GRANT SELECT ... ON rsvps TO anon` sorunu çözerdi
-- ama kimin nereye katıldığını herkese, kazınabilir biçimde açardı. Şu an bu
-- veri anonime tamamen kapalı; tek satırla tersine çevirmek sessiz bir
-- gizlilik genişlemesi olurdu — hem de tam gizlilik anahtarı eklerken.
-- Fonksiyon SAYIYI veriyor, satırları değil.

-- -----------------------------------------------------------------------------
-- katilim_karnesi
-- -----------------------------------------------------------------------------
-- GÖRÜNÜRLÜK KURALI: SECURITY DEFINER RLS'i atladığı için sayımlar ELLE
-- daraltılıyor — yalnızca ONAYLI topluluğa ait (ya da topluluğu olmayan)
-- kayıtlar sayılıyor. Aksi halde onay bekleyen bir topluluğun varlığı sayı
-- üzerinden dolaylı olarak sızardı.
--
-- Sayı HERKESE AYNI okunuyor, sahibine de. Karne paylaşılan bir şey; bakan
-- kişiye göre değişen bir sayı, profilini paylaşan kullanıcıyı yanıltırdı.
CREATE OR REPLACE FUNCTION public.katilim_karnesi(p_user_id uuid)
RETURNS TABLE (topluluk int, duzenledigi int, katildigi int, checkin int, gorunur boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
DECLARE
  v_tercih boolean;
BEGIN
  SELECT COALESCE(pr.show_participation, true) INTO v_tercih
    FROM profiles pr WHERE pr.id = p_user_id;

  -- Profil yok: hiç satır dönme (çağıran `data?.[0]` ile undefined görür).
  IF NOT FOUND THEN RETURN; END IF;

  -- Kapalıysa sayı VERİLMEZ. Sahibi ve yönetici istisna: kendi karnesini
  -- görebilmeli, yoksa ayarı kapatan kişi ne gizlediğini göremezdi.
  IF NOT v_tercih AND p_user_id IS DISTINCT FROM auth.uid() AND NOT public.is_admin() THEN
    RETURN QUERY SELECT 0, 0, 0, 0, false;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    -- Onaylı topluluklardaki onaylı üyelikler.
    (SELECT count(*)::int
       FROM community_members cm
       JOIN communities c ON c.id = cm.community_id
      WHERE cm.user_id = p_user_id AND cm.status = 'approved'
        AND c.status = 'approved'),

    -- SERİ KATLANIR: 12 tekrarlı bir seri kurmak BİR organizasyon işidir.
    -- Sitenin her yerinde seri tek kart olarak katlanıyor (etkinlik_vitrin);
    -- sayaç ham satır saysaydı seri özelliğinden sonra "12" yazardı.
    (SELECT count(DISTINCT COALESCE(e.series_id, e.id))::int
       FROM events e
       LEFT JOIN communities c ON c.id = e.community_id
      WHERE e.organizer_id = p_user_id
        AND (e.community_id IS NULL OR c.status = 'approved')),

    -- SERİ KATLANMAZ: üç ay boyunca haftalık giden kişi on iki kez gitmiştir,
    -- karne bunu göstermeli. Yalnızca GEÇMİŞ buluşmalar — gelecekteki RSVP
    -- henüz bir katılım değil.
    (SELECT count(*)::int
       FROM rsvps r
       JOIN events e ON e.id = r.event_id
       LEFT JOIN communities c ON c.id = e.community_id
      WHERE r.user_id = p_user_id AND e.event_date < now()
        AND (e.community_id IS NULL OR c.status = 'approved')),

    -- Check-in ZENGİNLEŞTİRME, tanım DEĞİL: bugün veritabanında hiç check-in
    -- yok, "katildigi"yı buna bağlasaydık her profilde sonsuza kadar 0 yazardı.
    (SELECT count(*)::int
       FROM rsvps r
       JOIN events e ON e.id = r.event_id
       LEFT JOIN communities c ON c.id = e.community_id
      WHERE r.user_id = p_user_id AND e.event_date < now()
        AND r.checked_in_at IS NOT NULL
        AND (e.community_id IS NULL OR c.status = 'approved')),

    true;
END;
$function$;

-- Postgres'te yeni fonksiyon PUBLIC'e EXECUTE ile doğar; yalnızca GRANT yazmak
-- koruma değildir.
REVOKE ALL ON FUNCTION public.katilim_karnesi(uuid) FROM PUBLIC;
-- anon DA alıyor: profil sayfası giriş yapmamış ziyaretçiye de açık ve
-- karnenin görünmesinin bütün amacı bu.
GRANT EXECUTE ON FUNCTION public.katilim_karnesi(uuid) TO anon, authenticated;
