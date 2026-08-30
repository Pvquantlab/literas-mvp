-- Tekrarlayan etkinlik serileri — 1/4: tablo, kolonlar, kısıtlar, yetkiler.
--
-- Spec: docs/superpowers/specs/2026-08-30-tekrarlayan-etkinlik-serileri-design.md

-- -----------------------------------------------------------------------------
-- 1. event_series tablosu
-- -----------------------------------------------------------------------------
-- RRULE değil üç frekans: BYSETPOS/EXDATE/sonsuz seri bu ürünün ihtiyacı değil
-- ve her tüketiciye ayrı yorumlayıcı yazmayı gerektirirdi.
CREATE TABLE IF NOT EXISTS public.event_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  organizer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  frekans text NOT NULL CHECK (frekans IN ('haftalik','iki_haftalik','aylik')),
  baslangic timestamptz NOT NULL,
  -- 26 = haftalık yarım yıl. events satır sayısını ve toplu UPDATE'te RLS'in
  -- satır başına koşturduğu community_members EXISTS sorgusunu sınırlıyor.
  tekrar_sayisi int NOT NULL CHECK (tekrar_sayisi BETWEEN 2 AND 26),
  -- İstemci üretimli istek kimliği. UNIQUE(series_id, event_date) iki kez
  -- basılan "Oluştur"u ENGELLEMEZ (ikinci çağrı yeni series_id üretir,
  -- çatışmaz). Gerçek ikizlenme koruması bu.
  istek_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS event_series_istek_benzersiz
  ON public.event_series (organizer_id, istek_id) WHERE istek_id IS NOT NULL;

-- "sonrakiler" kapsamı seriyi bölerken yeni satır istek_id'siz doğar;
-- bu yüzden index KISMİ.
CREATE INDEX IF NOT EXISTS idx_event_series_community
  ON public.event_series (community_id);

-- -----------------------------------------------------------------------------
-- 2. event_series RLS — okuma açık, yazma TAMAMEN kapalı
-- -----------------------------------------------------------------------------
ALTER TABLE public.event_series ENABLE ROW LEVEL SECURITY;

-- events SELECT politikasının aynası: onaylanmamış topluluğun serisi yalnızca
-- kendi organizatörüne ve yöneticiye görünür.
DROP POLICY IF EXISTS "Seriler herkese acik" ON public.event_series;
CREATE POLICY "Seriler herkese acik" ON public.event_series
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = community_id AND c.status = 'approved'
    )
    OR organizer_id = auth.uid()
    OR public.is_admin()
  );

-- INSERT/UPDATE/DELETE için NE politika NE grant var — bilinçli.
-- app_secrets / email_outbox kalıbı (schema.sql:264-265): yazan tek şey
-- SECURITY DEFINER fonksiyonlar.
--
-- REVOKE ALL şart: baseline panelden (supabase_admin olarak) koşturulduğunda
-- varsayılan authenticated'a arwdDxtm veriyor. O hâlde herhangi bir kayıtlı
-- kullanıcı DELETE FROM event_series çağırabilir ve series_id ON DELETE SET
-- NULL olduğu için TÜM SERİLER tek seferde dağılırdı.
REVOKE ALL ON TABLE public.event_series FROM anon, authenticated;
GRANT SELECT ON TABLE public.event_series TO anon, authenticated;

-- DİKKAT: bu tablo schema.sql'deki toplu "GRANT INSERT, UPDATE, DELETE"
-- listelerine EKLENMEZ. Kolon/politika bazlı koruma tablo bazlı GRANT'i
-- EZMEZ (community_announcements yorumunda yazılı, bir kez yaşandı).

-- -----------------------------------------------------------------------------
-- 3. events'e dört kolon
-- -----------------------------------------------------------------------------
-- ON DELETE SET NULL, CASCADE DEĞİL: CASCADE seçilseydi seriyi silmek events
-- satırlarını, onlar üzerinden rsvps ve waitlist kayıtlarını uçururdu.
-- Seri silinince tekrarlar bağımsız etkinliğe döner; toplu silme ayrı işlem.
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS series_id uuid
  REFERENCES public.event_series(id) ON DELETE SET NULL;
-- Üretim anındaki sıra. Silme/ekleme sonrası ASLA yeniden numaralanmaz;
-- boşluk normaldir ve hiçbir kapsam/sıralama ölçütü DEĞİLDİR — kapsamlar
-- event_date ile çözülür.
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS occurrence_index int;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS updated_at timestamptz;
-- "Bu tekrar elle değiştirildi." Toplu güncelleme bu satırları ATLAR.
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS seri_disina_alindi_at timestamptz;

-- -----------------------------------------------------------------------------
-- 4. Kısıtlar ve indeksler
-- -----------------------------------------------------------------------------
-- series_id NULL olan satırlar Postgres'te çakışmaz → tekil etkinlikler
-- bu kısıttan etkilenmez.
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_seri_tarih_benzersiz;
ALTER TABLE public.events
  ADD CONSTRAINT events_seri_tarih_benzersiz UNIQUE (series_id, event_date);

CREATE INDEX IF NOT EXISTS idx_events_series
  ON public.events (series_id, event_date);

-- Katlama view'ının kendi WHERE event_date >= now() koşulu bugün İNDEKSSİZ:
-- event_date üzerinde yalnızca kısmi idx_events_reminder var.
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events (event_date);
CREATE INDEX IF NOT EXISTS idx_events_community_date
  ON public.events (community_id, event_date);

-- Buluşma başına RSVP kararının bilinen bedeli: kullanıcı başına rsvps satırı
-- seri boyu kadar artıyor ve rsvps'te user_id ile BAŞLAYAN hiçbir indeks yok.
CREATE INDEX IF NOT EXISTS idx_rsvps_user ON public.rsvps (user_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 5. events üzerinde kolon bazlı yazma yetkisi
-- -----------------------------------------------------------------------------
-- schema.sql:1161'deki "GRANT INSERT, UPDATE, DELETE ON TABLE
-- public.communities, public.events TO anon, authenticated" TABLO BAZLI ve
-- kolon daraltması yok. series_id eklenir eklenmez kullanıcı kendi etkinliğini
-- başkasının serisine yazabilir, occurrence_index'i bozabilir,
-- seri_disina_alindi_at'ı temizleyip düzenleme izini silebilirdi.
--
-- ÖNCE REVOKE, SONRA KOLON BAZLI GRANT. Kolon bazlı REVOKE tablo bazlı GRANT'i
-- EZMEZ; ayrıca kolonsuz REVOKE o ayrıcalık için kolon ACL'ini de siler.
-- Sıra önemli. (20260828160000_rsvps_yazma_kolon_yetkisi.sql örneği.)
REVOKE INSERT, UPDATE ON TABLE public.events FROM anon, authenticated;

GRANT INSERT (title, description, location, event_date, organizer_id,
              community_id, cover_image_url, max_attendees)
  ON public.events TO authenticated;

GRANT UPDATE (title, description, location, event_date, cover_image_url,
              max_attendees)
  ON public.events TO authenticated;

-- DELETE tablo bazlı kalıyor; "Organizatör kendi etkinliğini siler"
-- politikası ona dayanıyor (rsvps DELETE emsali, schema.sql:1177).
--
-- Listede OLMAYANLAR: series_id, occurrence_index, updated_at,
-- seri_disina_alindi_at, attendee_count, reminder_sent_at, search_vector,
-- created_at. Onları yalnızca SECURITY DEFINER fonksiyonlar yazabilir.
