-- Katılım karnesi: profildeki katılım bilgisi için ayrı gizlilik anahtarı.
--
-- DERS — 20260827120000_guvenlik_paketi_3_yetki_kilitleri.sql:81 şunu yazıyor:
-- "ayarlar/gizlilik'teki profile_visibility ayarının hiçbir etkisi yoktu".
-- Kolon DB'de vardı, ayarlar sayfasından yazılabiliyordu, ama HİÇBİR sorgu onu
-- okuyup filtre olarak kullanmıyordu. Bu kolon aynı akıbete uğramasın diye
-- değişiklik ÜÇ YERDE birden yapılıyor:
--   1. kolon (burada)
--   2. public_profiles vitrininin SELECT listesi (burada)
--   3. app/profile/[id]/page.tsx'in render koşulu (uygulama tarafı)
-- Üçüncüsü olmadan bu da "hiçbir etkisi olmayan" ikinci bir ayar olur.

-- -----------------------------------------------------------------------------
-- 1. Kolon
-- -----------------------------------------------------------------------------
-- Varsayılan true: mevcut profil görünürlüğü kararıyla tutarlı
-- (profile_visibility de 'public' varsayılanlı). Kimsenin profili bu
-- migration'la sessizce kapanmıyor.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS show_participation boolean NOT NULL DEFAULT true;

-- KOLON BAZLI GRANT GEREKMİYOR — bu depoda üç kez düşülen tuzak burada
-- GEÇERLİ DEĞİL. profiles tablo bazlı GRANT'li (schema.sql: "GRANT INSERT,
-- UPDATE, DELETE ON TABLE public.profiles TO anon, authenticated") ve UPDATE
-- politikası satır bazlı (auth.uid() = id). events/rsvps/
-- community_announcements'taki kolon daraltması burada yok, olmasına da gerek
-- yok: bu kolon bir ayrıcalık kolonu değil, kişinin kendi tercihi.
--
-- profiles_guard() trigger'ına da dokunulmuyor: o yalnızca is_admin, email ve
-- id'yi kilitliyor — kullanıcının kendi adına değiştiremeyeceği alanları.
-- show_participation bilinçli olarak o listede DEĞİL.

-- -----------------------------------------------------------------------------
-- 2. public_profiles vitrini
-- -----------------------------------------------------------------------------
-- Vitrin AÇIK kolon listesi kullanıyor (SELECT * değil), yani yeni kolon
-- kendiliğinden GELMEZ — elle eklenmesi şart. Bu iyi bir şey: hangi alanın
-- dışarı çıktığı her zaman görünür durumda.
--
-- security_invoker = false KORUNUYOR: profiles RLS'i yalnızca kişinin kendi
-- satırını görmesine izin veriyor, vitrin bu yüzden tanımlayıcı haklarıyla
-- koşuyor. Kolon eklemek bu kararı değiştirmiyor — show_participation zaten
-- gizli bir veri değil, "beni nasıl gösterme" tercihi.
--
-- CREATE OR REPLACE VIEW mevcut kolonların sırasını/tipini değiştiremez;
-- yeni kolon SONA ekleniyor, o yüzden sorunsuz.
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = false) AS
SELECT id, name, username, bio, avatar_url, location, created_at, show_participation
FROM profiles
WHERE COALESCE(account_active, true)
  AND (COALESCE(profile_visibility, 'public'::text) = 'public'::text
       OR id = auth.uid()
       OR is_admin());

-- Ek GRANT gerekmiyor: vitrin üzerinde tablo bazlı GRANT SELECT zaten var,
-- yeni kolonu kapsıyor.
