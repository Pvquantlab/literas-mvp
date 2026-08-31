-- Katılım karnesi — gizlilik kapısı public_profiles vitriniyle hizalanıyor.
--
-- BULUNAN AÇIK: katilim_karnesi SECURITY DEFINER olduğu için RLS'i atlıyor ve
-- daraltmayı elle yapıyordu, ama okuduğu tek gizlilik kolonu
-- show_participation'dı. Vitrin (public_profiles) account_active ve
-- profile_visibility'yi de süzüyor — yani SAYFA yolu kapalıyken RPC yolu
-- AÇIKTI.
--
-- Somut senaryo: A hesabını donduruyor ya da profilini gizli yapıyor;
-- /profile/A herkese notFound() dönüyor. Ama saldırgan tarayıcı paketindeki
-- anon anahtarıyla community_members'tan uuid toplayıp her biri için
-- rpc/katilim_karnesi çağırıyor ve giriş yapmadan sayaçları alıyor. Sızan
-- katildigi/checkin sayaçları tam olarak anon'un rsvps üzerinde HİÇ yetkisi
-- olmayan veriden türüyor — bu fonksiyonun var olma sebebi olan kararın
-- (GRANT SELECT ON rsvps TO anon reddi) yan kapısı.
--
-- Düzeltme: gizli/dondurulmuş profilde HİÇ SATIR DÖNMÜYOR — profil-yok
-- davranışının aynısı, böylece varlık bilgisi de sızmıyor.
CREATE OR REPLACE FUNCTION public.katilim_karnesi(p_user_id uuid)
RETURNS TABLE (topluluk int, duzenledigi int, katildigi int, checkin int, gorunur boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
DECLARE
  v_tercih boolean;
  v_aktif boolean;
  v_gorunurluk text;
BEGIN
  SELECT COALESCE(pr.show_participation, true),
         COALESCE(pr.account_active, true),
         COALESCE(pr.profile_visibility, 'public')
    INTO v_tercih, v_aktif, v_gorunurluk
    FROM profiles pr WHERE pr.id = p_user_id;

  IF NOT FOUND THEN RETURN; END IF;

  -- VİTRİNLE AYNI KAPI (public_profiles WHERE koşulu). Profil gizli ya da
  -- hesap dondurulmuşsa hiç satır dönmüyor — "profil yok" ile ayırt edilemez.
  IF (NOT v_aktif OR v_gorunurluk <> 'public')
     AND p_user_id IS DISTINCT FROM auth.uid()
     AND NOT public.is_admin() THEN
    RETURN;
  END IF;

  -- Karne kapalıysa sayı verilmiyor ama profilin VARLIĞI gizli değil:
  -- gorunur=false ile sıfırlar dönüyor.
  IF NOT v_tercih AND p_user_id IS DISTINCT FROM auth.uid() AND NOT public.is_admin() THEN
    RETURN QUERY SELECT 0, 0, 0, 0, false;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    (SELECT count(*)::int
       FROM community_members cm
       JOIN communities c ON c.id = cm.community_id
      WHERE cm.user_id = p_user_id AND cm.status = 'approved'
        AND c.status = 'approved'),
    -- SERİ KATLANIR: 12 tekrarlı seri kurmak BİR organizasyon işidir.
    (SELECT count(DISTINCT COALESCE(e.series_id, e.id))::int
       FROM events e
       LEFT JOIN communities c ON c.id = e.community_id
      WHERE e.organizer_id = p_user_id
        AND (e.community_id IS NULL OR c.status = 'approved')),
    -- SERİ KATLANMAZ: haftalık giden kişi on iki kez gitmiştir. Yalnızca GEÇMİŞ.
    (SELECT count(*)::int
       FROM rsvps r
       JOIN events e ON e.id = r.event_id
       LEFT JOIN communities c ON c.id = e.community_id
      WHERE r.user_id = p_user_id AND e.event_date < now()
        AND (e.community_id IS NULL OR c.status = 'approved')),
    -- Check-in ZENGİNLEŞTİRME, tanım değil.
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
