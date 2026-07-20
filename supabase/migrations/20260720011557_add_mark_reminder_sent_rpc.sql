-- Cron'un reminder_sent_at'i güvenle doldurması için tek amaçlı fonksiyon.
-- SECURITY DEFINER: RLS'i aşar AMA sadece bu tek sütunu, sadece hâlâ NULL ise günceller.
-- service_role anahtarı GEREKMEZ; anon client rpc ile çağırır.
CREATE OR REPLACE FUNCTION mark_reminder_sent(p_event_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE events
  SET reminder_sent_at = now()
  WHERE id = p_event_id AND reminder_sent_at IS NULL;
$$;

-- anon ve authenticated rolleri bu fonksiyonu çağırabilsin
GRANT EXECUTE ON FUNCTION mark_reminder_sent(uuid) TO anon, authenticated;
