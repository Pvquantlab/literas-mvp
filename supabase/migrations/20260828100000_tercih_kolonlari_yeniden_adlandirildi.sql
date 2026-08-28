-- Bildirim tercihi kolonları gerçekte ne yaptıklarını söylüyor
--
-- SORUN: üç kolon `push_` ön ekiyle duruyordu ama platformda push bildirimi
-- altyapısı YOK. Bu anahtarlar fiilen E-POSTA gönderimini yönetiyor —
-- email_izni() fonksiyonu bunları okuyup mail kuyruğunu kapılıyor.
-- Kodu okuyan biri haklı olarak "push bildirimi ayarı" sanıyordu.
--
-- 27.08.2026 denetiminde bilinçli borç olarak bırakılmıştı; şimdi kapatılıyor.
--
-- KAPSAM: yalnızca gerçekten mail kapılayan ÜÇ kolon. Diğer iki push_ kolonu
-- (push_new_messages, push_suggested_events) henüz var olmayan özellikler
-- için duruyor ve hiçbir şeyi yönetmiyor — adları da o gün doğru olacak,
-- dokunulmadı.
--
-- SIRA: bu migration kod deploy'u ile YAKIN ZAMANLI çalıştırılmalı. Kolon adı
-- değişince eski kod ile yeni şema uyuşmaz; etkilenen tek yer
-- /ayarlar/bildirimler sayfası (okuma hatası verir, veri kaybı olmaz).

ALTER TABLE public.profiles RENAME COLUMN push_event_reminders        TO email_event_reminders;
ALTER TABLE public.profiles RENAME COLUMN push_new_members            TO email_new_members;
ALTER TABLE public.profiles RENAME COLUMN push_community_announcements TO email_community_announcements;

-- email_izni() yeni adlarla yeniden kuruluyor. Mantık aynı:
-- işlemsel mailler (promotion/event_change/event_cancel) kapatılamaz,
-- dondurulmuş hesap hiçbir şey almaz.
CREATE OR REPLACE FUNCTION public.email_izni(p_user uuid, p_template text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT
        COALESCE(p.account_active, true)
        AND CASE p_template
          WHEN 'promotion'    THEN true
          WHEN 'event_change' THEN true
          WHEN 'event_cancel' THEN true
          WHEN 'reminder'     THEN COALESCE(p.email_event_reminders, true)
          WHEN 'join_request' THEN COALESCE(p.email_new_members, true)
          WHEN 'announcement' THEN COALESCE(p.email_community_announcements, true)
          ELSE true
        END
      FROM profiles p
      WHERE p.id = p_user
    ),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.email_izni(uuid, text) FROM PUBLIC;
