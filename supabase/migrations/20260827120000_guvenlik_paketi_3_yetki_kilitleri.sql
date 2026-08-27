-- Güvenlik paketi 3 — yetki kilitleri
--
-- Denetimde canlı veritabanında DOĞRULANAN dört açığı kapatır.
-- Hepsi kısıtlayıcıdır: veri silmez, kolon düşürmez, geri alınabilir.

-- ---------------------------------------------------------------------------
-- 1) profiles: kullanıcı kendini admin yapamasın
--
-- AÇIK (doğrulandı): "Users can update own profile" politikası yalnızca
-- USING/WITH CHECK (auth.uid() = id) kontrol ediyordu ve profiles üzerinde
-- hiçbir trigger yoktu. Postgres RLS kolon bazlı kısıt koyamaz; dolayısıyla
-- herhangi bir kullanıcı tarayıcı konsolundan
--     supabase.from('profiles').update({ is_admin: true }).eq('id', kendiId)
-- diyerek tam yönetici olabiliyordu. app/admin/*, app/admin/actions.ts ve
-- app/api/report/[id] yetkiyi bu kolondan okuduğu için açık tüm admin
-- katmanını tek hamlede düşürüyordu.
--
-- communities tablosunda aynı iş communities_guard trigger'ı ile çözülmüş,
-- profiles'ta eşdeğeri unutulmuş. Aynı deseni buraya taşıyoruz.
--
-- email de kilitleniyor: profiles.email giden tüm postanın kaynağı
-- (get_member_emails, get_event_rsvp_emails, claim_email_outbox). Doğrulamasız
-- değiştirilebilmesi, kullanıcının başkasının adresini yazıp oraya bildirim
-- akıtmasına izin veriyordu. E-posta değişimi artık yalnızca Supabase auth
-- akışından geçebilir.

CREATE OR REPLACE FUNCTION public.profiles_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Kayıt sırasında kimse kendine yönetici bayrağı basamaz.
    IF NOT public.is_admin() THEN
      NEW.is_admin := false;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: yönetici olmayan, korumalı kolonların eski değerini korur.
  IF NOT public.is_admin() THEN
    NEW.is_admin := OLD.is_admin;
    NEW.email    := OLD.email;
    NEW.id       := OLD.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard ON public.profiles;
CREATE TRIGGER profiles_guard
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_guard();

-- ---------------------------------------------------------------------------
-- 2) _check_cron_secret artık bir doğrulama oracle'ı değil
--
-- AÇIK (doğrulandı): fonksiyonun proacl'ı NULL, yani Postgres varsayılanı
-- geçerli: EXECUTE herkese (PUBLIC) açık. Anonim biri sırrı doğrudan bu uca
-- deneyerek sınayabiliyordu.
--
-- Bunu geri almak kasayı BOZMAZ: claim_email_outbox ve kardeşleri
-- SECURITY DEFINER, yani sahibi (postgres) yetkisiyle koşuyor ve içeriden
-- yaptıkları çağrı bu REVOKE'tan etkilenmiyor.

REVOKE ALL ON FUNCTION public._check_cron_secret(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._check_cron_secret(text) FROM anon, authenticated;

-- NOT: mark_reminder_sent / mark_promotion_email_sent'in sır kontrolü imza
-- değiştirdiği için ayrı dosyada (guvenlik_paketi_4_cron_imza.sql) duruyor;
-- o migration kod deploy'u ile AYNI ANDA uygulanmalı.

-- ---------------------------------------------------------------------------
-- 3) public_profiles: gizlilik ayarı artık gerçekten çalışıyor
--
-- AÇIK (doğrulandı): görünüm security_invoker = false ile tanımlı (yani
-- profiles RLS'ini tamamen baypas ediyor) ve hiç WHERE'i yoktu. Sonuç:
--   - ayarlar/gizlilik'teki profile_visibility ayarının hiçbir etkisi yoktu,
--   - ayarlar/hesap'taki hesap dondurma (account_active=false) görünürlüğü
--     değiştirmiyordu,
--   - anon rolü tüm kullanıcı tablosunu sayfalayarak hasat edebiliyordu.
--
-- E-postanın görünümde olmaması doğru bir karardı, korunuyor.

CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = false) AS
SELECT id, name, username, bio, avatar_url, location, created_at
FROM public.profiles
WHERE COALESCE(account_active, true)
  AND (
    COALESCE(profile_visibility, 'public') = 'public'
    OR id = auth.uid()
    OR public.is_admin()
  );

-- ---------------------------------------------------------------------------
-- 4) community_members: admin rolünü yalnızca kurucu verebilir
--
-- AÇIK (doğrulandı): app/api/community/[id]/member/[memberId]/route.ts
-- "admin rolünü yalnızca kurucu verir" kuralını uyguluyor, ama RLS bunu
-- zorlamıyordu: UPDATE politikasının WITH CHECK'i role IN ('member','admin')
-- diyor, aktörün kurucu olup olmadığına bakmıyordu. Topluluk admin'i API'yi
-- hiç kullanmadan tarayıcıdan istediğini admin yapabiliyordu.
--
-- WITH CHECK eski satırı göremediği için kural trigger'a yazılıyor
-- (communities_guard ile aynı desen).

CREATE OR REPLACE FUNCTION public.community_members_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  aktor_rol text;
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF public.is_admin() THEN
      RETURN NEW;  -- platform yöneticisi istisna
    END IF;

    SELECT cm.role INTO aktor_rol
    FROM community_members cm
    WHERE cm.community_id = OLD.community_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved';

    IF aktor_rol IS DISTINCT FROM 'founder' THEN
      RAISE EXCEPTION 'Rol değişikliğini yalnızca topluluğun kurucusu yapabilir';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS community_members_guard ON public.community_members;
CREATE TRIGGER community_members_guard
  BEFORE UPDATE ON public.community_members
  FOR EACH ROW EXECUTE FUNCTION public.community_members_guard();
