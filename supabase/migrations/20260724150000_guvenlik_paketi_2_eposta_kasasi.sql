-- GÜVENLİK PAKETİ 2 — E-posta kasası (public_profiles vitrini + email_outbox + RPC'ler)
-- 2026-07-24'te SQL Editor üzerinden canlıya uygulandı.

-- 1) Herkese açık profil vitrini (isim, avatar, bio — e-posta YOK)
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = false) AS
SELECT id, name, username, bio, avatar_url, location, created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 2) Kilitli mail kutusu
CREATE TABLE IF NOT EXISTS public.email_outbox (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  to_user_id uuid NOT NULL,
  template text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  sent_at timestamptz
);
ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_outbox FROM anon, authenticated;

-- 3) Gizli anahtar kasası (cron'un anahtarı burada durur)
CREATE TABLE IF NOT EXISTS public.app_secrets (
  key text PRIMARY KEY,
  value text NOT NULL
);
ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_secrets FROM anon, authenticated;

-- 4) Anahtar kontrolü yapan yardımcı
CREATE OR REPLACE FUNCTION public._check_cron_secret(p_secret text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v text;
BEGIN
  SELECT value INTO v FROM app_secrets WHERE key = 'cron_secret';
  IF v IS NULL OR p_secret IS NULL OR p_secret <> v THEN
    RAISE EXCEPTION 'yetkisiz';
  END IF;
END;
$$;

-- 5) Topluluk üyelerinin mailleri — SADECE o topluluğun founder/admin'i
CREATE OR REPLACE FUNCTION public.get_member_emails(p_community_id uuid, p_exclude uuid DEFAULT NULL)
RETURNS SETOF text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM community_members cm
    WHERE cm.community_id = p_community_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('founder','admin') AND cm.status = 'approved'
  ) THEN
    RAISE EXCEPTION 'yetkisiz';
  END IF;

  RETURN QUERY
    SELECT p.email FROM community_members cm
    JOIN profiles p ON p.id = cm.user_id
    WHERE cm.community_id = p_community_id AND cm.status = 'approved'
      AND (p_exclude IS NULL OR cm.user_id <> p_exclude)
      AND p.email IS NOT NULL;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_member_emails(uuid, uuid) TO authenticated;

-- 6) Etkinlik katılımcılarının mailleri — SADECE organizatör veya founder/admin
CREATE OR REPLACE FUNCTION public.get_event_rsvp_emails(p_event_id uuid, p_exclude uuid DEFAULT NULL)
RETURNS SETOF text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (
    EXISTS (SELECT 1 FROM events e WHERE e.id = p_event_id AND e.organizer_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM events e
      JOIN community_members cm ON cm.community_id = e.community_id
      WHERE e.id = p_event_id AND cm.user_id = auth.uid()
        AND cm.role IN ('founder','admin') AND cm.status = 'approved'
    )
  ) THEN
    RAISE EXCEPTION 'yetkisiz';
  END IF;

  RETURN QUERY
    SELECT p.email FROM rsvps r
    JOIN profiles p ON p.id = r.user_id
    WHERE r.event_id = p_event_id
      AND (p_exclude IS NULL OR r.user_id <> p_exclude)
      AND p.email IS NOT NULL;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_event_rsvp_emails(uuid, uuid) TO authenticated;

-- 7) Tek üyenin iletişimi — üyelik onay maili için, SADECE founder/admin
CREATE OR REPLACE FUNCTION public.get_member_contact(p_membership_id uuid)
RETURNS TABLE(name text, email text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM community_members target
    JOIN community_members me ON me.community_id = target.community_id
    WHERE target.id = p_membership_id
      AND me.user_id = auth.uid()
      AND me.role IN ('founder','admin') AND me.status = 'approved'
  ) THEN
    RAISE EXCEPTION 'yetkisiz';
  END IF;

  RETURN QUERY
    SELECT p.name, p.email
    FROM community_members target
    JOIN profiles p ON p.id = target.user_id
    WHERE target.id = p_membership_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_member_contact(uuid) TO authenticated;

-- 8) Katılım isteği bildirimi — kurucunun maili DIŞARI VERİLMEDEN kutuya atılır
CREATE OR REPLACE FUNCTION public.queue_join_notification(p_community_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_founder uuid;
  v_cname text;
  v_rname text;
BEGIN
  SELECT c.founder_id, c.name INTO v_founder, v_cname
  FROM communities c WHERE c.id = p_community_id AND c.status = 'approved';
  IF v_founder IS NULL THEN
    RAISE EXCEPTION 'topluluk bulunamadı';
  END IF;

  SELECT p.name INTO v_rname FROM profiles p WHERE p.id = auth.uid();

  INSERT INTO email_outbox (to_user_id, template, payload)
  VALUES (
    v_founder,
    'join_request',
    jsonb_build_object(
      'requester_name', coalesce(v_rname, 'biri'),
      'community_name', v_cname,
      'community_id', p_community_id
    )
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.queue_join_notification(uuid) TO authenticated;

-- 9) Hatırlatma maillerini kutuya doldur — SADECE gizli anahtarla
CREATE OR REPLACE FUNCTION public.queue_event_reminders(p_event_id uuid, p_secret text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ev record;
BEGIN
  PERFORM public._check_cron_secret(p_secret);

  SELECT e.id, e.title, e.event_date, e.location, e.community_id
  INTO ev FROM events e
  WHERE e.id = p_event_id AND e.reminder_sent_at IS NULL;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  INSERT INTO email_outbox (to_user_id, template, payload)
  SELECT r.user_id, 'reminder',
    jsonb_build_object(
      'event_id', ev.id,
      'title', ev.title,
      'event_date', ev.event_date,
      'location', ev.location,
      'community_name', (SELECT c.name FROM communities c WHERE c.id = ev.community_id)
    )
  FROM rsvps r WHERE r.event_id = p_event_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.queue_event_reminders(uuid, text) TO anon, authenticated;

-- 10) Bekleme listesinden terfi edenlerin maillerini kutuya doldur — gizli anahtarla
CREATE OR REPLACE FUNCTION public.queue_promotion_emails(p_secret text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._check_cron_secret(p_secret);

  INSERT INTO email_outbox (to_user_id, template, payload)
  SELECT w.user_id, 'promotion',
    jsonb_build_object(
      'event_id', e.id,
      'title', e.title,
      'event_date', e.event_date,
      'location', e.location
    )
  FROM waitlist w
  JOIN events e ON e.id = w.event_id
  WHERE w.promoted_at IS NOT NULL
    AND w.promotion_email_sent_at IS NULL;

  UPDATE waitlist
  SET promotion_email_sent_at = now()
  WHERE promoted_at IS NOT NULL
    AND promotion_email_sent_at IS NULL;
END;
$$;
GRANT EXECUTE ON FUNCTION public.queue_promotion_emails(text) TO anon, authenticated;

-- 11) Kutuyu aç: gönderilmemiş mailleri ver — gizli anahtarla
CREATE OR REPLACE FUNCTION public.claim_email_outbox(p_secret text)
RETURNS TABLE(id bigint, email text, template text, payload jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._check_cron_secret(p_secret);

  RETURN QUERY
    SELECT o.id, p.email, o.template, o.payload
    FROM email_outbox o
    JOIN profiles p ON p.id = o.to_user_id
    WHERE o.sent_at IS NULL
      AND p.email IS NOT NULL
    ORDER BY o.id
    LIMIT 200;
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_email_outbox(text) TO anon, authenticated;

-- 12) Gönderildi işareti — gizli anahtarla
CREATE OR REPLACE FUNCTION public.mark_outbox_sent(p_ids bigint[], p_secret text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._check_cron_secret(p_secret);

  UPDATE email_outbox
  SET sent_at = now()
  WHERE id = ANY(p_ids) AND sent_at IS NULL;
END;
$$;
GRANT EXECUTE ON FUNCTION public.mark_outbox_sent(bigint[], text) TO anon, authenticated;
