-- Güvenlik paketi 4 — cron işaretleme fonksiyonlarına sır kontrolü
--
-- DİKKAT: bu migration fonksiyon İMZASI değiştirir. Eski kod tek argümanlı
-- sürümü çağırıyor. Bu yüzden app/api/cron/reminders/route.ts'in sırrı geçen
-- hâli DEPLOY EDİLDİKTEN sonra (ya da onunla aynı anda) uygulanmalı.
-- Erken uygulanırsa günlük cron hatırlatmaları işaretleyemez ve ertesi gün
-- aynı kişilere ikinci kez mail gider.
--
-- AÇIK (canlı DB'de doğrulandı): mark_reminder_sent(uuid) ve
-- mark_promotion_email_sent(uuid) SECURITY DEFINER, anon'a EXECUTE açık ve
-- HİÇBİR yetki kontrolü yapmıyorlardı — kardeş fonksiyonlar
-- _check_cron_secret çağırırken bu ikisi çağırmıyordu. Anonim biri herkese
-- açık events.id listesini gezip tek tek mark_reminder_sent çağırarak
-- platformdaki bütün hatırlatma e-postalarını kalıcı olarak susturabilirdi.
-- Aynı şekilde mark_promotion_email_sent bekleme listesi terfi bildirimlerini
-- öldürebilirdi.

DROP FUNCTION IF EXISTS public.mark_reminder_sent(uuid);
CREATE FUNCTION public.mark_reminder_sent(p_event_id uuid, p_secret text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._check_cron_secret(p_secret);
  UPDATE events
  SET reminder_sent_at = now()
  WHERE id = p_event_id AND reminder_sent_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_reminder_sent(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_reminder_sent(uuid, text) TO anon;

DROP FUNCTION IF EXISTS public.mark_promotion_email_sent(uuid);
CREATE FUNCTION public.mark_promotion_email_sent(p_waitlist_id uuid, p_secret text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._check_cron_secret(p_secret);
  UPDATE waitlist
  SET promotion_email_sent_at = now()
  WHERE id = p_waitlist_id AND promotion_email_sent_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_promotion_email_sent(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_promotion_email_sent(uuid, text) TO anon;
