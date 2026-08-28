-- QR ile giriş (check-in) — yol haritası 2.6
-- Tasarım: docs/superpowers/specs/2026-08-28-qr-checkin-design.md

ALTER TABLE public.rsvps
  ADD COLUMN IF NOT EXISTS checkin_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS checked_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS checked_in_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS rsvps_checkin_token_key ON public.rsvps (checkin_token);

-- Kolon bazlı koruma.
-- DİKKAT: kolon bazlı REVOKE, tablo bazlı GRANT'i geçersiz kılmaz — komut
-- hatasız geçer ama hiçbir şey yapmaz. O yüzden önce tablo yetkisi kaldırılıp
-- kolonlar tek tek veriliyor. (anon'un rsvps üzerinde zaten SELECT'i yok.)
REVOKE SELECT ON public.rsvps FROM authenticated;
GRANT  SELECT (id, event_id, user_id, created_at, checked_in_at, checked_in_by)
  ON public.rsvps TO authenticated;

-- Yetki yardımcısı: etkinliğin organizatörü VEYA topluluğun onaylı
-- kurucu/yöneticisi. Yalnızca dahili kullanım, dışarıya GRANT edilmiyor.
CREATE OR REPLACE FUNCTION public.etkinlik_yoneticisi_mi(p_event_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = p_event_id AND e.organizer_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM events e
      JOIN community_members cm ON cm.community_id = e.community_id
      WHERE e.id = p_event_id AND cm.user_id = auth.uid()
        AND cm.role IN ('founder','admin') AND cm.status = 'approved'
    );
$$;

-- Katılımcı yalnızca KENDİ token'ını alabilir.
CREATE OR REPLACE FUNCTION public.checkin_kodum(p_event_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT r.checkin_token FROM rsvps r
  WHERE r.event_id = p_event_id AND r.user_id = auth.uid();
$$;

-- Önizleme: hiçbir şeyi değiştirmez.
-- Kontrol sırası bağlayıcı: önce token aranır (yoksa boş küme, yetki
-- kontrolü yapılamaz çünkü hangi etkinlik olduğu bilinmiyor), sonra yetki.
CREATE OR REPLACE FUNCTION public.checkin_dogrula(p_token uuid)
RETURNS TABLE(rsvp_id uuid, event_id uuid, katilimci_adi text, checked_in_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_event uuid;
BEGIN
  SELECT r.event_id INTO v_event FROM rsvps r WHERE r.checkin_token = p_token;
  IF v_event IS NULL THEN RETURN; END IF;
  IF NOT public.etkinlik_yoneticisi_mi(v_event) THEN RAISE EXCEPTION 'yetkisiz'; END IF;

  RETURN QUERY
    SELECT r.id, r.event_id, p.name, r.checked_in_at
    FROM rsvps r JOIN profiles p ON p.id = r.user_id
    WHERE r.checkin_token = p_token;
END;
$$;

-- Girişi işler. İdempotent: ikinci okutma zamanı değiştirmez.
CREATE OR REPLACE FUNCTION public.checkin_yap(p_token uuid)
RETURNS TABLE(katilimci_adi text, checked_in_at timestamptz, yeni_giris boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_event uuid; v_rsvp uuid; v_mevcut timestamptz;
BEGIN
  SELECT r.event_id, r.id, r.checked_in_at INTO v_event, v_rsvp, v_mevcut
  FROM rsvps r WHERE r.checkin_token = p_token;
  IF v_rsvp IS NULL THEN RETURN; END IF;
  IF NOT public.etkinlik_yoneticisi_mi(v_event) THEN RAISE EXCEPTION 'yetkisiz'; END IF;

  IF v_mevcut IS NULL THEN
    UPDATE rsvps SET checked_in_at = now(), checked_in_by = auth.uid()
    WHERE id = v_rsvp;
  END IF;

  RETURN QUERY
    SELECT p.name, r.checked_in_at, (v_mevcut IS NULL)
    FROM rsvps r JOIN profiles p ON p.id = r.user_id
    WHERE r.id = v_rsvp;
END;
$$;

-- Yanlış okutmayı geri alır.
CREATE OR REPLACE FUNCTION public.checkin_geri_al(p_token uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_event uuid; v_rsvp uuid;
BEGIN
  SELECT r.event_id, r.id INTO v_event, v_rsvp
  FROM rsvps r WHERE r.checkin_token = p_token;
  IF v_rsvp IS NULL THEN RETURN; END IF;
  IF NOT public.etkinlik_yoneticisi_mi(v_event) THEN RAISE EXCEPTION 'yetkisiz'; END IF;

  UPDATE rsvps SET checked_in_at = NULL, checked_in_by = NULL WHERE id = v_rsvp;
END;
$$;

REVOKE ALL ON FUNCTION public.etkinlik_yoneticisi_mi(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.checkin_kodum(uuid)    FROM PUBLIC;
REVOKE ALL ON FUNCTION public.checkin_dogrula(uuid)  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.checkin_yap(uuid)      FROM PUBLIC;
REVOKE ALL ON FUNCTION public.checkin_geri_al(uuid)  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.checkin_kodum(uuid)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.checkin_dogrula(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.checkin_yap(uuid)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.checkin_geri_al(uuid) TO authenticated;
