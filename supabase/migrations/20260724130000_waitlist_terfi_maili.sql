-- Terfi maili takibi.
-- rsvp_waitlist_promote trigger'i bekleme listesindekini otomatik RSVP'ye
-- ceviriyor ama kimseye haber vermiyor. Cron artik terfi edenlere mail atacak;
-- bu kolon ayni kisiye her sabah tekrar mail gitmesini engeller.

ALTER TABLE public.waitlist
  ADD COLUMN IF NOT EXISTS promotion_email_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_waitlist_promotion_pending
  ON public.waitlist (promoted_at)
  WHERE promoted_at IS NOT NULL AND promotion_email_sent_at IS NULL;

-- Cron'un tek amacli isaretleme fonksiyonu (mark_reminder_sent ile ayni desen).
CREATE OR REPLACE FUNCTION public.mark_promotion_email_sent(p_waitlist_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE waitlist
  SET promotion_email_sent_at = now()
  WHERE id = p_waitlist_id AND promotion_email_sent_at IS NULL;
$$;

GRANT EXECUTE ON FUNCTION public.mark_promotion_email_sent(uuid) TO anon, authenticated;
