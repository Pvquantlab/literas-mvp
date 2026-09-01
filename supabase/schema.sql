-- =============================================================================
-- literas — ŞEMA ANLIK GÖRÜNTÜSÜ (baseline)
-- Üretildiği tarih: 2026-08-28 · Kaynak: canlı Supabase (gwcanlhrzkvhrlbueakb)
-- =============================================================================
--
-- BU DOSYA NE İŞE YARAR
-- Felaket kurtarma ve şemanın sürüm kontrolünde durması. Boş bir veritabanına
-- baştan sona uygulandığında tüm şemayı yeniden kurar.
--
-- BU DOSYA NE DEĞİLDİR
-- Migration zincirinin parçası DEĞİL ve `supabase migration up` tarafından
-- çalıştırılmaz. Bilinçli bir karar: supabase/migrations/ altındaki 13 tarihsel
-- migration idempotent değil (IF NOT EXISTS'siz ADD COLUMN, DROP'suz CREATE
-- POLICY gibi). Bu dosya migration olarak eklenseydi, sıfırdan kurulumda ya
-- baseline ya da sonraki migration'lar çakışırdı.
--
--   * Şemayı DEĞİŞTİRMEK için → supabase/migrations/ altına yeni migration yaz.
--   * Şemayı SIFIRDAN KURMAK için → yalnızca bu dosyayı çalıştır.
--
-- GÜNCEL TUTMA
-- Şema değiştiğinde bu dosya bayatlar. Repoda daha önce tam bu yüzden silinen
-- bir supabase-schema.sql vardı. Yeniden üretmek için:
--
--   npx supabase link --project-ref gwcanlhrzkvhrlbueakb
--   npx supabase db dump --schema public --file supabase/schema.sql
--
-- (link işlemi veritabanı parolası ister.)
--
-- KAPSAM DIŞI
--   * auth/storage/realtime şemaları — Supabase kendi kuruyor.
--   * Referans verisi (topics, locations, topic_categories satırları) — şema
--     var, içerik yok. Yeniden kurulumda ayrıca yüklenmeli.
--   * Storage kovaları — aşağıda "STORAGE" bölümünde belgelendi.
--   * Rutin Supabase varsayılan yetkileri (TRIGGER/TRUNCATE/REFERENCES).
--     Yalnızca anlamlı olanlar (SELECT/INSERT/UPDATE/DELETE) aşağıda.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. UZANTILAR
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;


-- -----------------------------------------------------------------------------
-- 2. DİZİLER
-- -----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.locations_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.topic_categories_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.topic_suggestions_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.topics_id_seq;


-- -----------------------------------------------------------------------------
-- 3. YARDIMCI FONKSİYONLAR (tablolardan önce: generated kolonlar bunları kullanıyor)
-- -----------------------------------------------------------------------------

-- Türkçe FTS için aksan temizleyen IMMUTABLE sarmalayıcı.
-- unaccent() kendisi STABLE olduğu için generated kolonda doğrudan kullanılamaz.
CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS $function$
  select public.unaccent('public.unaccent', $1);
$function$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $function$
  SELECT COALESCE(
    (SELECT p.is_admin FROM profiles p WHERE p.id = auth.uid()), false);
$function$;


-- -----------------------------------------------------------------------------
-- 4. TABLOLAR
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL,
  name text,
  email text,
  avatar_url text,
  created_at timestamp with time zone DEFAULT now(),
  bio text,
  username text,
  location text,
  language text DEFAULT 'tr'::text,
  timezone text DEFAULT 'Europe/Istanbul'::text,
  account_active boolean DEFAULT true,
  contact_permission text DEFAULT 'community_members'::text,
  profile_visibility text DEFAULT 'public'::text,
  birth_date date,
  gender text DEFAULT 'unspecified'::text,
  looking_for text[] DEFAULT '{}'::text[],
  life_stages text[] DEFAULT '{}'::text[],
  interests text[] DEFAULT '{}'::text[],
  match_distance_km integer DEFAULT 80,
  instagram_url text,
  x_url text,
  youtube_url text,
  linkedin_url text,
  email_messages boolean DEFAULT true,
  email_replies boolean DEFAULT true,
  email_suggested_events boolean DEFAULT true,
  email_new_communities boolean DEFAULT false,
  email_platform_updates boolean DEFAULT true,
  email_surveys boolean DEFAULT false,
  email_connections boolean DEFAULT true,
  push_new_messages boolean DEFAULT true,
  email_event_reminders boolean DEFAULT true,
  email_community_announcements boolean DEFAULT true,
  email_new_members boolean DEFAULT true,
  push_suggested_events boolean DEFAULT false,
  is_admin boolean DEFAULT false,
  -- Katılım karnesi gizliliği. Kolon bazlı GRANT GEREKMİYOR: profiles tablo
  -- bazlı yetkili ve UPDATE politikası satır bazlı (auth.uid() = id). Bu bir
  -- ayrıcalık kolonu değil, kişinin kendi tercihi — profiles_guard() de bu
  -- yüzden ona dokunmuyor (o yalnızca is_admin/email/id kilitliyor).
  show_participation boolean DEFAULT true NOT NULL
);

CREATE TABLE IF NOT EXISTS public.communities (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  description text,
  cover_image_url text,
  city text,
  founder_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  category text,
  location_type text DEFAULT 'physical'::text,
  location_name text,
  status text DEFAULT 'pending_review'::text,
  reviewed_at timestamp with time zone,
  review_note text,
  search_vector tsvector GENERATED ALWAYS AS (((setweight(to_tsvector('turkish'::regconfig, immutable_unaccent(COALESCE(name, ''::text))), 'A'::"char") || setweight(to_tsvector('turkish'::regconfig, immutable_unaccent(COALESCE(description, ''::text))), 'B'::"char")) || setweight(to_tsvector('turkish'::regconfig, immutable_unaccent(COALESCE(city, ''::text))), 'C'::"char"))) STORED,
  member_count integer DEFAULT 0 NOT NULL,
  city_key text GENERATED ALWAYS AS (lower(translate(COALESCE(city, ''::text), 'İIıŞşĞğÜüÖöÇç'::text, 'iiissgguuoocc'::text))) STORED
);

CREATE TABLE IF NOT EXISTS public.events (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title text NOT NULL,
  description text,
  location text NOT NULL,
  event_date timestamp with time zone NOT NULL,
  organizer_id uuid NOT NULL,
  max_attendees integer,
  created_at timestamp with time zone DEFAULT now(),
  community_id uuid,
  cover_image_url text,
  reminder_sent_at timestamp with time zone,
  search_vector tsvector GENERATED ALWAYS AS (((setweight(to_tsvector('turkish'::regconfig, immutable_unaccent(COALESCE(title, ''::text))), 'A'::"char") || setweight(to_tsvector('turkish'::regconfig, immutable_unaccent(COALESCE(description, ''::text))), 'B'::"char")) || setweight(to_tsvector('turkish'::regconfig, immutable_unaccent(COALESCE(location, ''::text))), 'C'::"char"))) STORED,
  attendee_count integer DEFAULT 0 NOT NULL,
  -- Tekrarlayan etkinlik serileri (event_series, aşağıda). NULL = tekil
  -- etkinlik, bu kısıttan etkilenmez.
  series_id uuid,
  -- Üretim anındaki sıra. Silme/ekleme sonrası ASLA yeniden numaralanmaz;
  -- boşluk normaldir ve hiçbir kapsam/sıralama ölçütü DEĞİLDİR — kapsamlar
  -- event_date ile çözülür.
  occurrence_index integer,
  updated_at timestamp with time zone,
  -- "Bu tekrar elle değiştirildi." Toplu güncelleme (seri_guncelle/seri_sil)
  -- bu satırları ATLAR.
  seri_disina_alindi_at timestamp with time zone
);

-- Tekrarlayan etkinlik serisi. RRULE değil üç sabit frekans: BYSETPOS/EXDATE/
-- sonsuz seri bu ürünün ihtiyacı değil ve her tüketiciye ayrı yorumlayıcı
-- yazmayı gerektirirdi.
CREATE TABLE IF NOT EXISTS public.event_series (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  community_id uuid NOT NULL,
  organizer_id uuid NOT NULL,
  frekans text NOT NULL,
  baslangic timestamp with time zone NOT NULL,
  -- 26 = haftalık yarım yıl. events satır sayısını ve toplu UPDATE'te RLS'in
  -- satır başına koşturduğu community_members EXISTS sorgusunu sınırlıyor.
  tekrar_sayisi integer NOT NULL,
  -- İstemci üretimli istek kimliği. UNIQUE(series_id, event_date) iki kez
  -- basılan "Oluştur"u ENGELLEMEZ (ikinci çağrı yeni series_id üretir,
  -- çatışmaz). Gerçek ikizlenme koruması event_series_istek_benzersiz
  -- (bölüm 6 İNDEKSLER).
  istek_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.community_members (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  community_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text DEFAULT 'member'::text NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rsvps (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  event_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  checkin_token uuid DEFAULT gen_random_uuid() NOT NULL,
  checked_in_at timestamp with time zone,
  checked_in_by uuid
);

CREATE TABLE IF NOT EXISTS public.waitlist (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  event_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  promoted_at timestamp with time zone,
  promotion_email_sent_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.reports (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  reporter_id uuid NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  reason text NOT NULL,
  description text,
  status text DEFAULT 'pending'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  reviewed_at timestamp with time zone,
  reviewed_by uuid,
  admin_note text
);

CREATE TABLE IF NOT EXISTS public.community_drafts (
  user_id uuid NOT NULL,
  data jsonb DEFAULT '{}'::jsonb NOT NULL,
  current_step text DEFAULT 'konum'::text,
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.topics (
  id integer DEFAULT nextval('topics_id_seq'::regclass) NOT NULL,
  slug text NOT NULL,
  name text NOT NULL,
  search_text text,
  is_popular boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.topic_categories (
  id integer DEFAULT nextval('topic_categories_id_seq'::regclass) NOT NULL,
  slug text NOT NULL,
  name text NOT NULL,
  display_order integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.topic_category_map (
  topic_id integer NOT NULL,
  category_id integer NOT NULL
);

CREATE TABLE IF NOT EXISTS public.community_topics (
  community_id uuid NOT NULL,
  topic_id integer NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.topic_suggestions (
  id integer DEFAULT nextval('topic_suggestions_id_seq'::regclass) NOT NULL,
  suggested_name text NOT NULL,
  suggested_by uuid,
  status text DEFAULT 'pending'::text NOT NULL,
  admin_note text,
  created_at timestamp with time zone DEFAULT now(),
  reviewed_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.locations (
  id integer DEFAULT nextval('locations_id_seq'::regclass) NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  parent_id integer,
  latitude double precision,
  longitude double precision,
  search_text text NOT NULL,
  display_name text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- E-posta kasası: adresler uygulama koduna hiç inmez, mail gövdesi burada
-- birikir ve yalnızca cron sırrıyla açılır.
CREATE TABLE IF NOT EXISTS public.email_outbox (
  id bigint NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  to_user_id uuid NOT NULL,
  template text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb NOT NULL,
  sent_at timestamp with time zone
);
ALTER TABLE public.email_outbox ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY;

-- Cron sırrı burada durur. RLS açık ve HİÇ politikası yok = tamamen kilitli;
-- yalnızca SECURITY DEFINER fonksiyonlar okuyabilir.
CREATE TABLE IF NOT EXISTS public.app_secrets (
  key text NOT NULL,
  value text NOT NULL
);

-- Topluluk duyuruları: organizatörün etkinlikten bağımsız üye iletişimi.
CREATE TABLE IF NOT EXISTS public.community_announcements (
  id           uuid NOT NULL DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL,
  -- Yazar silinse de duyuru kalsın: kalan üyeler geçmişi kaybetmemeli.
  author_id    uuid,
  title        text NOT NULL,
  body         text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz,
  -- Kaç kişiye ULAŞTI. Üye sayısıyla aynı olmak zorunda değil: bildirim
  -- tercihini kapatmış üyeler get_member_emails tarafından süzülüyor.
  sent_count   integer NOT NULL DEFAULT 0
);


-- -----------------------------------------------------------------------------
-- 5. KISITLAR
-- -----------------------------------------------------------------------------

ALTER TABLE public.app_secrets ADD CONSTRAINT app_secrets_pkey PRIMARY KEY (key);
ALTER TABLE public.communities ADD CONSTRAINT communities_pkey PRIMARY KEY (id);
ALTER TABLE public.community_announcements ADD CONSTRAINT community_announcements_pkey PRIMARY KEY (id);
ALTER TABLE public.community_drafts ADD CONSTRAINT community_drafts_pkey PRIMARY KEY (user_id);
ALTER TABLE public.community_members ADD CONSTRAINT community_members_pkey PRIMARY KEY (id);
ALTER TABLE public.community_topics ADD CONSTRAINT community_topics_pkey PRIMARY KEY (community_id, topic_id);
ALTER TABLE public.email_outbox ADD CONSTRAINT email_outbox_pkey PRIMARY KEY (id);
ALTER TABLE public.event_series ADD CONSTRAINT event_series_pkey PRIMARY KEY (id);
ALTER TABLE public.events ADD CONSTRAINT events_pkey PRIMARY KEY (id);
ALTER TABLE public.locations ADD CONSTRAINT locations_pkey PRIMARY KEY (id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
ALTER TABLE public.reports ADD CONSTRAINT reports_pkey PRIMARY KEY (id);
ALTER TABLE public.rsvps ADD CONSTRAINT rsvps_pkey PRIMARY KEY (id);
ALTER TABLE public.topic_categories ADD CONSTRAINT topic_categories_pkey PRIMARY KEY (id);
ALTER TABLE public.topic_category_map ADD CONSTRAINT topic_category_map_pkey PRIMARY KEY (topic_id, category_id);
ALTER TABLE public.topic_suggestions ADD CONSTRAINT topic_suggestions_pkey PRIMARY KEY (id);
ALTER TABLE public.topics ADD CONSTRAINT topics_pkey PRIMARY KEY (id);
ALTER TABLE public.waitlist ADD CONSTRAINT waitlist_pkey PRIMARY KEY (id);

ALTER TABLE public.community_members ADD CONSTRAINT community_members_community_id_user_id_key UNIQUE (community_id, user_id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);
ALTER TABLE public.rsvps ADD CONSTRAINT rsvps_event_id_user_id_key UNIQUE (event_id, user_id);
ALTER TABLE public.topic_categories ADD CONSTRAINT topic_categories_slug_key UNIQUE (slug);
ALTER TABLE public.topics ADD CONSTRAINT topics_slug_key UNIQUE (slug);
ALTER TABLE public.waitlist ADD CONSTRAINT waitlist_event_id_user_id_key UNIQUE (event_id, user_id);

ALTER TABLE public.communities ADD CONSTRAINT communities_location_type_check CHECK ((location_type = ANY (ARRAY['physical'::text, 'online'::text])));
ALTER TABLE public.communities ADD CONSTRAINT communities_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'pending_review'::text, 'approved'::text, 'rejected'::text])));
ALTER TABLE public.community_drafts ADD CONSTRAINT community_drafts_current_step_check CHECK ((current_step = ANY (ARRAY['konum'::text, 'konular'::text, 'ad'::text, 'aciklama'::text, 'gonder'::text])));
ALTER TABLE public.community_members ADD CONSTRAINT community_members_role_check CHECK ((role = ANY (ARRAY['founder'::text, 'admin'::text, 'member'::text])));
ALTER TABLE public.community_members ADD CONSTRAINT community_members_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text])));
ALTER TABLE public.event_series ADD CONSTRAINT event_series_frekans_check CHECK ((frekans = ANY (ARRAY['haftalik'::text, 'iki_haftalik'::text, 'aylik'::text])));
ALTER TABLE public.event_series ADD CONSTRAINT event_series_tekrar_sayisi_check CHECK ((tekrar_sayisi >= 2) AND (tekrar_sayisi <= 26));
ALTER TABLE public.locations ADD CONSTRAINT locations_type_check CHECK ((type = ANY (ARRAY['il'::text, 'ilce'::text])));
ALTER TABLE public.profiles ADD CONSTRAINT profiles_contact_permission_check CHECK ((contact_permission = ANY (ARRAY['everyone'::text, 'community_members'::text, 'nobody'::text])));
ALTER TABLE public.profiles ADD CONSTRAINT profiles_gender_check CHECK ((gender = ANY (ARRAY['unspecified'::text, 'woman'::text, 'man'::text, 'non_binary'::text])));
ALTER TABLE public.profiles ADD CONSTRAINT profiles_profile_visibility_check CHECK ((profile_visibility = ANY (ARRAY['public'::text, 'private'::text])));
ALTER TABLE public.reports ADD CONSTRAINT reports_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'reviewed'::text, 'dismissed'::text, 'actioned'::text])));
ALTER TABLE public.reports ADD CONSTRAINT reports_target_type_check CHECK ((target_type = ANY (ARRAY['event'::text, 'community'::text, 'user'::text])));
ALTER TABLE public.topic_suggestions ADD CONSTRAINT topic_suggestions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])));

ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.communities ADD CONSTRAINT communities_founder_id_fkey FOREIGN KEY (founder_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.community_announcements ADD CONSTRAINT community_announcements_author_id_fkey FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE public.community_announcements ADD CONSTRAINT community_announcements_community_id_fkey FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE;
ALTER TABLE public.community_drafts ADD CONSTRAINT community_drafts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.community_members ADD CONSTRAINT community_members_community_id_fkey FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE;
ALTER TABLE public.community_members ADD CONSTRAINT community_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.community_topics ADD CONSTRAINT community_topics_community_id_fkey FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE;
ALTER TABLE public.community_topics ADD CONSTRAINT community_topics_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE;
ALTER TABLE public.event_series ADD CONSTRAINT event_series_community_id_fkey FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE;
ALTER TABLE public.event_series ADD CONSTRAINT event_series_organizer_id_fkey FOREIGN KEY (organizer_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.events ADD CONSTRAINT events_community_id_fkey FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE;
ALTER TABLE public.events ADD CONSTRAINT events_organizer_id_fkey FOREIGN KEY (organizer_id) REFERENCES profiles(id) ON DELETE CASCADE;
-- ON DELETE SET NULL, CASCADE DEĞİL: CASCADE seçilseydi seriyi silmek events
-- satırlarını, onlar üzerinden rsvps ve waitlist kayıtlarını uçururdu. Seri
-- silinince tekrarlar bağımsız etkinliğe döner; toplu silme ayrı işlem
-- (seri_sil RPC'si).
ALTER TABLE public.events ADD CONSTRAINT events_series_id_fkey FOREIGN KEY (series_id) REFERENCES event_series(id) ON DELETE SET NULL;
ALTER TABLE public.locations ADD CONSTRAINT locations_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES locations(id) ON DELETE CASCADE;
ALTER TABLE public.reports ADD CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.reports ADD CONSTRAINT reports_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);
ALTER TABLE public.rsvps ADD CONSTRAINT rsvps_checked_in_by_fkey FOREIGN KEY (checked_in_by) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE public.rsvps ADD CONSTRAINT rsvps_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
ALTER TABLE public.rsvps ADD CONSTRAINT rsvps_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.topic_category_map ADD CONSTRAINT topic_category_map_category_id_fkey FOREIGN KEY (category_id) REFERENCES topic_categories(id) ON DELETE CASCADE;
ALTER TABLE public.topic_category_map ADD CONSTRAINT topic_category_map_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE;
ALTER TABLE public.topic_suggestions ADD CONSTRAINT topic_suggestions_suggested_by_fkey FOREIGN KEY (suggested_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.waitlist ADD CONSTRAINT waitlist_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
ALTER TABLE public.waitlist ADD CONSTRAINT waitlist_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


-- -----------------------------------------------------------------------------
-- 6. İNDEKSLER
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS communities_search_vector_idx ON public.communities USING gin (search_vector);
CREATE INDEX IF NOT EXISTS community_announcements_community_created_idx ON public.community_announcements USING btree (community_id, created_at DESC);
CREATE INDEX IF NOT EXISTS events_search_vector_idx ON public.events USING gin (search_vector);
CREATE INDEX IF NOT EXISTS community_topics_topic_idx ON public.community_topics USING btree (topic_id);
CREATE UNIQUE INDEX IF NOT EXISTS event_series_istek_benzersiz ON public.event_series USING btree (organizer_id, istek_id) WHERE (istek_id IS NOT NULL);
-- idx_events_community_id BİLİNÇLİ OLARAK YOK: idx_events_community_date
-- (community_id, event_date) onu sütun öneki olarak TAMAMEN kapsıyor; eski
-- indeks hiçbir sorgu planı için artık seçilemiyordu (Görev 1-4 incelemesinde
-- tespit edildi, düşürüldü —
-- supabase/migrations/20260830120400_olu_indeks_dusuruldu.sql).
CREATE INDEX IF NOT EXISTS idx_events_community_date ON public.events USING btree (community_id, event_date);
-- Katlama view'ının (etkinlik_vitrin, bölüm 9) kendi WHERE event_date >= now()
-- koşulu bu indeks olmadan İNDEKSSİZDİ: event_date üzerinde yalnızca kısmi
-- idx_events_reminder vardı.
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events USING btree (event_date);
CREATE INDEX IF NOT EXISTS idx_events_reminder ON public.events USING btree (event_date) WHERE (reminder_sent_at IS NULL);
-- series_id NULL olan satırlar Postgres'te çakışmaz → tekil etkinlikler bu
-- kısıttan etkilenmez.
ALTER TABLE public.events ADD CONSTRAINT events_seri_tarih_benzersiz UNIQUE (series_id, event_date);
CREATE INDEX IF NOT EXISTS idx_events_series ON public.events USING btree (series_id, event_date);
-- Buluşma başına RSVP kararının bilinen bedeli: kullanıcı başına rsvps satırı
-- seri boyu kadar artıyor ve rsvps'te user_id ile BAŞLAYAN hiçbir indeks yoktu.
CREATE INDEX IF NOT EXISTS idx_rsvps_user ON public.rsvps USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_waitlist_promotion_pending ON public.waitlist USING btree (promoted_at) WHERE ((promoted_at IS NOT NULL) AND (promotion_email_sent_at IS NULL));

-- Trigger'ın (etkinlik_silinince_kuyrugu_temizle) taradığı ifade indekssizdi
-- ve email_outbox gönderilmiş satırları HİÇ budamıyor: tarama maliyeti sürekli
-- büyüyor. Kısmi olduğu için yalnızca BEKLEYEN satırları kapsıyor.
-- İFADE trigger'ın yüklemiyle BİREBİR aynı olmalı: `::uuid`li hâli eşleşmez.
-- Ölçüm (300.000 gönderilmiş + az bekleyen): 43,997 ms -> 1,794 ms, indeks 16 kB.
CREATE INDEX IF NOT EXISTS email_outbox_bekleyen_event_idx
  ON public.email_outbox ((payload->>'event_id')) WHERE (sent_at IS NULL);
CREATE INDEX IF NOT EXISTS locations_parent_idx ON public.locations USING btree (parent_id);
CREATE INDEX IF NOT EXISTS locations_search_idx ON public.locations USING btree (search_text);
CREATE INDEX IF NOT EXISTS locations_type_idx ON public.locations USING btree (type);
CREATE INDEX IF NOT EXISTS reports_status_idx ON public.reports USING btree (status, created_at DESC);
CREATE INDEX IF NOT EXISTS reports_target_idx ON public.reports USING btree (target_type, target_id);
CREATE UNIQUE INDEX IF NOT EXISTS reports_unique_reporter_target ON public.reports USING btree (reporter_id, target_type, target_id);
CREATE UNIQUE INDEX IF NOT EXISTS rsvps_checkin_token_key ON public.rsvps USING btree (checkin_token);
CREATE INDEX IF NOT EXISTS topics_popular_idx ON public.topics USING btree (is_popular) WHERE (is_popular = true);
CREATE INDEX IF NOT EXISTS topics_search_idx ON public.topics USING btree (search_text);
CREATE INDEX IF NOT EXISTS waitlist_event_created_idx ON public.waitlist USING btree (event_id, created_at) WHERE (promoted_at IS NULL);


-- -----------------------------------------------------------------------------
-- 7. FONKSİYONLAR
-- -----------------------------------------------------------------------------

-- Kayıt olan her auth kullanıcısı için profil satırı açar.
-- KRİTİK: aşağıdaki auth.users trigger'ı olmadan kayıt akışı sessizce bozulur —
-- kullanıcı oluşur ama profili olmaz.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  INSERT INTO profiles (id, name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$function$;

-- Kullanıcı kendini admin yapamasın, e-postasını doğrulamasız değiştiremesin.
CREATE OR REPLACE FUNCTION public.profiles_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT public.is_admin() THEN
      NEW.is_admin := false;
    END IF;
    RETURN NEW;
  END IF;

  IF NOT public.is_admin() THEN
    NEW.is_admin := OLD.is_admin;
    NEW.email    := OLD.email;
    NEW.id       := OLD.id;
  END IF;

  RETURN NEW;
END;
$function$;

-- Kullanıcı topluluğun onay durumunu ve kurucusunu değiştiremesin.
CREATE OR REPLACE FUNCTION public.communities_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    IF TG_OP = 'INSERT' THEN
      NEW.status := 'pending_review';
      NEW.reviewed_at := NULL;
      NEW.review_note := NULL;
    ELSE
      NEW.status := OLD.status;
      NEW.founder_id := OLD.founder_id;
      NEW.reviewed_at := OLD.reviewed_at;
      NEW.review_note := OLD.review_note;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Admin rolünü yalnızca kurucu verebilir (RLS bunu zorlayamıyor).
CREATE OR REPLACE FUNCTION public.community_members_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  aktor_rol text;
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF public.is_admin() THEN
      RETURN NEW;
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
$function$;

CREATE OR REPLACE FUNCTION public.check_rsvp_capacity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
declare
  event_max integer;
  current_count integer;
begin
  select max_attendees into event_max from public.events where id = new.event_id;
  if event_max is null then
    return new;
  end if;

  select count(*) into current_count from public.rsvps where event_id = new.event_id;

  if current_count >= event_max then
    raise exception 'EVENT_FULL' using errcode = 'P0001';
  end if;

  return new;
end;
$function$;

-- RSVP iptal edilince bekleme listesinden ilk sıradakini otomatik geçirir.
CREATE OR REPLACE FUNCTION public.promote_from_waitlist()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
declare
  next_user uuid;
  event_max integer;
  current_count integer;
begin
  select max_attendees into event_max from public.events where id = old.event_id;
  if event_max is null then
    return old;
  end if;

  select count(*) into current_count from public.rsvps where event_id = old.event_id;
  if current_count >= event_max then
    return old;
  end if;

  select user_id into next_user
  from public.waitlist
  where event_id = old.event_id and promoted_at is null
  order by created_at asc
  limit 1;

  if next_user is null then
    return old;
  end if;

  update public.waitlist
  set promoted_at = now()
  where event_id = old.event_id and user_id = next_user and promoted_at is null;

  insert into public.rsvps (event_id, user_id)
  values (old.event_id, next_user)
  on conflict do nothing;

  return old;
end;
$function$;

CREATE OR REPLACE FUNCTION public.sync_attendee_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
declare eid uuid;
begin
  eid := coalesce(new.event_id, old.event_id);
  update events set attendee_count = (
    select count(*) from rsvps where event_id = eid
  ) where id = eid;

  if tg_op = 'UPDATE' and old.event_id is distinct from new.event_id then
    update events set attendee_count = (
      select count(*) from rsvps where event_id = old.event_id
    ) where id = old.event_id;
  end if;
  return null;
end $function$;

CREATE OR REPLACE FUNCTION public.sync_member_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
declare cid uuid;
begin
  cid := coalesce(new.community_id, old.community_id);
  update communities set member_count = (
    select count(*) from community_members
    where community_id = cid and status = 'approved'
  ) where id = cid;

  if tg_op = 'UPDATE' and old.community_id is distinct from new.community_id then
    update communities set member_count = (
      select count(*) from community_members
      where community_id = old.community_id and status = 'approved'
    ) where id = old.community_id;
  end if;
  return null;
end $function$;

-- ---- E-posta kasası ---------------------------------------------------------

CREATE OR REPLACE FUNCTION public._check_cron_secret(p_secret text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v text;
BEGIN
  SELECT value INTO v FROM app_secrets WHERE key = 'cron_secret';
  IF v IS NULL OR p_secret IS NULL OR p_secret <> v THEN
    RAISE EXCEPTION 'yetkisiz';
  END IF;
END;
$function$;

-- Bildirim tercihi kapısı. İşlemsel mailler (promotion/event_change/
-- event_cancel) kapatılamaz; dondurulmuş hesap hiçbir şey almaz.
CREATE OR REPLACE FUNCTION public.email_izni(p_user uuid, p_template text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.queue_event_reminders(p_event_id uuid, p_secret text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
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
  FROM rsvps r
  WHERE r.event_id = p_event_id
    AND public.email_izni(r.user_id, 'reminder');
END;
$function$;

CREATE OR REPLACE FUNCTION public.queue_promotion_emails(p_secret text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.queue_join_notification(p_community_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
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

  IF NOT public.email_izni(v_founder, 'join_request') THEN
    RETURN;
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
$function$;

CREATE OR REPLACE FUNCTION public.claim_email_outbox(p_secret text)
RETURNS TABLE(id bigint, email text, template text, payload jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.mark_outbox_sent(p_ids bigint[], p_secret text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  PERFORM public._check_cron_secret(p_secret);

  UPDATE email_outbox
  SET sent_at = now()
  WHERE id = ANY(p_ids) AND sent_at IS NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_reminder_sent(p_event_id uuid, p_secret text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  PERFORM public._check_cron_secret(p_secret);
  UPDATE events
  SET reminder_sent_at = now()
  WHERE id = p_event_id AND reminder_sent_at IS NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_promotion_email_sent(p_waitlist_id uuid, p_secret text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  PERFORM public._check_cron_secret(p_secret);
  UPDATE waitlist
  SET promotion_email_sent_at = now()
  WHERE id = p_waitlist_id AND promotion_email_sent_at IS NULL;
END;
$function$;

-- ---- Yetkili e-posta okuyucuları --------------------------------------------
-- Üçü de yetki kontrolünü fonksiyonun İÇİNDE yapıp yetkisizde exception atar.

CREATE OR REPLACE FUNCTION public.get_member_emails(p_community_id uuid, p_exclude uuid DEFAULT NULL::uuid)
RETURNS SETOF text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
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
      AND p.email IS NOT NULL
      AND public.email_izni(cm.user_id, 'announcement');
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_event_rsvp_emails(p_event_id uuid, p_exclude uuid DEFAULT NULL::uuid)
RETURNS SETOF text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
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
      AND p.email IS NOT NULL
      AND public.email_izni(r.user_id, 'event_change');
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_member_contact(p_membership_id uuid)
RETURNS TABLE(name text, email text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
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
$function$;

-- ---- Topluluk duyuruları — yol haritası Aşama 3 -----------------------------
-- get_member_emails içindeki founder/admin kontrolü üç RLS politikasında ve
-- iki sayfa kapısında tekrar edilecekti. Tek yerde tutuluyor ki ayrışamasınlar.
--
-- SECURITY DEFINER olması ayrıca RLS özyinelemesini önlüyor: politika
-- community_members'a bakıyor, o da kendi politikasını tetiklemiyor.
--
-- GRANT vermek güvenli: fonksiyon içeride auth.uid() kullanıyor, yani çağıran
-- yalnızca KENDİ yetkisini sorabiliyor. Dönen bilgi zaten kendisinin bildiği
-- bir şey. (etkinlik_yoneticisi_mi için verilen kararla birebir aynı.)
CREATE OR REPLACE FUNCTION public.topluluk_yoneticisi_mi(p_community_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT EXISTS (
    SELECT 1 FROM community_members cm
    WHERE cm.community_id = p_community_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('founder','admin')
      AND cm.status = 'approved'
  );
$function$;

-- ---- QR ile giriş (check-in) — yol haritası 2.6 -----------------------------
-- Beşi de SECURITY DEFINER; yetki kontrolü fonksiyonun İÇİNDE (auth.uid()
-- ile). checkin_token istemciye hiç düşmez, yalnızca QR geometrisine gömülü.

-- Yetki yardımcısı: etkinliğin organizatörü VEYA topluluğun onaylı
-- kurucu/yöneticisi. Yalnızca dahili kullanım.
CREATE OR REPLACE FUNCTION public.etkinlik_yoneticisi_mi(p_event_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = p_event_id AND e.organizer_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM events e
      JOIN community_members cm ON cm.community_id = e.community_id
      WHERE e.id = p_event_id AND cm.user_id = auth.uid()
        AND cm.role IN ('founder','admin') AND cm.status = 'approved'
    );
$function$;

-- Katılımcı yalnızca KENDİ token'ını alabilir.
CREATE OR REPLACE FUNCTION public.checkin_kodum(p_event_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT r.checkin_token FROM rsvps r
  WHERE r.event_id = p_event_id AND r.user_id = auth.uid();
$function$;

-- Önizleme: hiçbir şeyi değiştirmez.
-- Kontrol sırası bağlayıcı: önce token aranır (yoksa boş küme, yetki
-- kontrolü yapılamaz çünkü hangi etkinlik olduğu bilinmiyor), sonra yetki.
CREATE OR REPLACE FUNCTION public.checkin_dogrula(p_token uuid)
RETURNS TABLE(rsvp_id uuid, event_id uuid, katilimci_adi text, checked_in_at timestamp with time zone)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
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
$function$;

-- Girişi işler. İdempotent: ikinci okutma zamanı değiştirmez.
CREATE OR REPLACE FUNCTION public.checkin_yap(p_token uuid)
RETURNS TABLE(katilimci_adi text, checked_in_at timestamp with time zone, yeni_giris boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_event uuid; v_rsvp uuid; v_yeni boolean;
BEGIN
  SELECT r.event_id, r.id INTO v_event, v_rsvp
  FROM rsvps r WHERE r.checkin_token = p_token;
  IF v_rsvp IS NULL THEN RETURN; END IF;
  IF NOT public.etkinlik_yoneticisi_mi(v_event) THEN RAISE EXCEPTION 'yetkisiz'; END IF;

  -- Koşul UPDATE'in İÇİNDE: önce okuyup sonra koşullu yazsaydık iki yönetici
  -- aynı anda okuttuğunda ikisi de "boş" görüp yazar, checked_in_by son
  -- yazanın olurdu. Bu haliyle satır kilidi tek yazana veriliyor.
  --
  -- DİKKAT: WHERE'deki kolonlar `rsvps.` ile nitelenmek ZORUNDA — fonksiyonun
  -- checked_in_at adında bir OUT parametresi var, çıplak yazılırsa plpgsql
  -- değişkenle karıştırıp belirsizlik hatası veriyor.
  UPDATE rsvps SET checked_in_at = now(), checked_in_by = auth.uid()
  WHERE rsvps.id = v_rsvp AND rsvps.checked_in_at IS NULL;

  v_yeni := FOUND;

  RETURN QUERY
    SELECT p.name, r.checked_in_at, v_yeni
    FROM rsvps r JOIN profiles p ON p.id = r.user_id
    WHERE r.id = v_rsvp;
END;
$function$;

-- Yanlış okutmayı geri alır.
CREATE OR REPLACE FUNCTION public.checkin_geri_al(p_token uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_event uuid; v_rsvp uuid;
BEGIN
  SELECT r.event_id, r.id INTO v_event, v_rsvp
  FROM rsvps r WHERE r.checkin_token = p_token;
  IF v_rsvp IS NULL THEN RETURN; END IF;
  IF NOT public.etkinlik_yoneticisi_mi(v_event) THEN RAISE EXCEPTION 'yetkisiz'; END IF;

  UPDATE rsvps SET checked_in_at = NULL, checked_in_by = NULL WHERE id = v_rsvp;
END;
$function$;

-- ---- Tekrarlayan etkinlik serileri — yol haritası Aşama 3 -------------------
-- SECURITY DEFINER, events UPDATE/DELETE politikalarını (bölüm 11) TAMAMEN
-- atlar. Yazma kolon bazlıya indirildiği için (bölüm 12 YETKİLER) bu
-- fonksiyonlar tek yazma yolu; dolayısıyla FONKSİYON İÇİ YETKİ KONTROLÜ TEK
-- SAVUNMA KATMANIDIR. series_id anon'a bile okunabilir olduğundan hedef
-- uuid'yi bulmak zahmetsiz.

-- seri_olustur — tek işlem, N tekrar. Neden tek RPC: POST /api/event "strict"
-- rate limitte (dakikada 3, lib/rate-limit.ts). Seri N ayrı POST ile
-- kurulamaz — 4. tekrarda 429 alır, yarım kalır ve geri alma yoktur.
CREATE OR REPLACE FUNCTION public.seri_olustur(
  p_community_id uuid,
  p_title text,
  p_description text,
  p_location text,
  p_baslangic timestamptz,
  p_frekans text,
  p_tekrar_sayisi int,
  p_max_attendees int,
  p_cover_image_url text,
  p_istek_id uuid
)
RETURNS TABLE (series_id uuid, ilk_event_id uuid, uretilen int, yeni_mi boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
DECLARE
  v_series uuid;
  v_ilk uuid;
  v_bu uuid;
  v_adim interval;
  v_i int;
  v_tarih timestamptz;
  v_sayac int;
BEGIN
  IF NOT public.topluluk_yoneticisi_mi(p_community_id) THEN
    RAISE EXCEPTION 'yetkisiz';
  END IF;

  -- Savunma iki katmanda: API zod ile, burada CHECK ile aynı sınır.
  IF p_frekans NOT IN ('haftalik','iki_haftalik','aylik') THEN
    RAISE EXCEPTION 'gecersiz frekans';
  END IF;
  IF p_tekrar_sayisi < 2 OR p_tekrar_sayisi > 26 THEN
    RAISE EXCEPTION 'tekrar sayisi 2 ile 26 arasinda olmali';
  END IF;

  -- İkizlenme koruması: aynı istek_id ile ikinci çağrı YENİ seri üretmez,
  -- mevcut seriyi döndürür. (İki kez basılan "Oluştur" düğmesi.)
  IF p_istek_id IS NOT NULL THEN
    SELECT s.id INTO v_series FROM event_series s
     WHERE s.organizer_id = auth.uid() AND s.istek_id = p_istek_id;
    IF v_series IS NOT NULL THEN
      SELECT e.id INTO v_ilk FROM events e
       WHERE e.series_id = v_series ORDER BY e.event_date LIMIT 1;
      SELECT count(*)::int INTO v_sayac FROM events e WHERE e.series_id = v_series;
      RETURN QUERY SELECT v_series, v_ilk, v_sayac, false;
      RETURN;
    END IF;
  END IF;

  BEGIN
    INSERT INTO event_series (community_id, organizer_id, frekans, baslangic,
                              tekrar_sayisi, istek_id)
    VALUES (p_community_id, auth.uid(), p_frekans, p_baslangic,
            p_tekrar_sayisi, p_istek_id)
    RETURNING id INTO v_series;
  EXCEPTION WHEN unique_violation THEN
    -- Eszamanli ikinci istek: ilk istek commit etmis. Yeni seri uretmiyoruz,
    -- onun kurdugu seriyi donduruyoruz.
    SELECT s.id INTO v_series FROM event_series s
     WHERE s.organizer_id = auth.uid() AND s.istek_id = p_istek_id;
    SELECT e.id INTO v_ilk FROM events e
     WHERE e.series_id = v_series ORDER BY e.event_date LIMIT 1;
    SELECT count(*)::int INTO v_sayac FROM events e WHERE e.series_id = v_series;
    RETURN QUERY SELECT v_series, v_ilk, v_sayac, false;
    RETURN;
  END;

  v_adim := CASE p_frekans
              WHEN 'haftalik'     THEN interval '7 days'
              WHEN 'iki_haftalik' THEN interval '14 days'
              WHEN 'aylik'        THEN interval '1 month'
            END;

  FOR v_i IN 0 .. p_tekrar_sayisi - 1 LOOP
    -- Duvar saati aritmetiği: Türkiye 2016'dan beri sabit UTC+3 olsa da
    -- "her salı 19:00" anlamını yaz saatine bağlı bırakmıyoruz.
    -- Aylık frekansta Postgres ayın son gününe kendisi düşürür ve çarpım
    -- HER ZAMAN başlangıçtan yapıldığı için 31 Ocak + 2 ay = 31 Mart olur
    -- (adım adım eklenseydi 28 Mart'a kayardı).
    v_tarih := ((p_baslangic AT TIME ZONE 'Europe/Istanbul') + (v_adim * v_i))
                 AT TIME ZONE 'Europe/Istanbul';

    INSERT INTO events (title, description, location, event_date, organizer_id,
                        community_id, max_attendees, cover_image_url,
                        series_id, occurrence_index)
    VALUES (p_title, p_description, p_location, v_tarih, auth.uid(),
            p_community_id, p_max_attendees, p_cover_image_url,
            v_series, v_i)
    RETURNING id INTO v_bu;

    IF v_i = 0 THEN v_ilk := v_bu; END IF;
  END LOOP;

  RETURN QUERY SELECT v_series, v_ilk, p_tekrar_sayisi, true;
END;
$function$;

-- etkinlik_guncelle — tekil düzenleme + elle düzenleme izi. Yetki
-- topluluk_yoneticisi_mi ile ÇÖZÜLEMEZ: events.community_id NULLABLE, yani
-- topluluğa bağlı olmayan etkinliklerde kontrol boşa düşerdi.
-- etkinlik_yoneticisi_mi checkCanManage()'in birebir DB karşılığı:
-- organizatör VEYA topluluğun onaylı founder/admin'i.
--
-- p_kapak_degissin: cover_image_url ÜÇ DURUMLU (app/api/event/[id]/route.ts).
-- Alan gövdede yoksa kapak DOKUNULMAZ, boş/null ise kaldırılır, URL ise
-- değişir. Tek bir text parametre bu üç durumu taşıyamaz — "NULL = dokunma"
-- deseydik kapağı kaldırmak imkânsız olurdu.
CREATE OR REPLACE FUNCTION public.etkinlik_guncelle(
  p_event_id uuid,
  p_title text,
  p_description text,
  p_location text,
  p_event_date timestamptz,
  p_max_attendees int,
  p_cover_image_url text,
  p_kapak_degissin boolean
)
RETURNS TABLE (guncellendi boolean, iz_yazildi boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
DECLARE
  e record;
  v_fark boolean;
  v_tarih_degisti boolean;
  v_yeni_kapak text;
BEGIN
  IF NOT public.etkinlik_yoneticisi_mi(p_event_id) THEN
    RAISE EXCEPTION 'yetkisiz';
  END IF;

  SELECT * INTO e FROM events WHERE id = p_event_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'etkinlik bulunamadi'; END IF;

  v_yeni_kapak := CASE WHEN p_kapak_degissin THEN p_cover_image_url
                       ELSE e.cover_image_url END;

  v_tarih_degisti := e.event_date IS DISTINCT FROM p_event_date;

  -- Damga GERÇEK farka bağlı ve ALTI alana birden bakıyor. route.ts'teki
  -- mevcut "changes" hesabı YENİDEN KULLANILMAZ — o hesap yalnızca
  -- title/event_date/location'a bakıyor, yani sadece açıklamayı değiştiren biri
  -- iz bırakmazdı. (O hesap MAİL tetikleyicisi olarak yerinde kalıyor; iki
  -- karar ayrı.)
  v_fark :=
       e.title          IS DISTINCT FROM p_title
    OR e.description    IS DISTINCT FROM p_description
    OR e.location       IS DISTINCT FROM p_location
    OR v_tarih_degisti
    OR e.max_attendees  IS DISTINCT FROM p_max_attendees
    OR e.cover_image_url IS DISTINCT FROM v_yeni_kapak;

  -- Hiçbir şey değiştirmeden "Kaydet"e basmak iz bırakmamalı.
  IF NOT v_fark THEN
    RETURN QUERY SELECT false, false;
    RETURN;
  END IF;

  -- UNIQUE (series_id, event_date) capsaminda kaliyoruz: seri_disina_alindi_at
  -- damgasi series_id'yi TEMIZLEMIYOR. Ham 23505 yerine Turkce mesaj.
  IF v_tarih_degisti AND e.series_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM events x
     WHERE x.series_id = e.series_id
       AND x.event_date = p_event_date
       AND x.id <> p_event_id
  ) THEN
    RAISE EXCEPTION 'o tarihte seride baska bulusma var';
  END IF;

  UPDATE events SET
    title           = p_title,
    description     = p_description,
    location        = p_location,
    event_date      = p_event_date,
    max_attendees   = p_max_attendees,
    cover_image_url = v_yeni_kapak,
    updated_at      = now(),
    -- Seri üyesiyse artık "elle düzenlenmiş": toplu güncelleme bunu ATLAR.
    seri_disina_alindi_at = CASE WHEN series_id IS NOT NULL
                                 THEN now() ELSE seri_disina_alindi_at END,
    -- Tarih taşındıysa hatırlatma yeniden kuyruğa girebilmeli; yoksa taşınan
    -- buluşma için hatırlatma bir daha HİÇ gitmez. Kolon istemciye kapalı
    -- olduğu için sıfırlama burada olmak zorunda.
    reminder_sent_at = CASE WHEN v_tarih_degisti THEN NULL ELSE reminder_sent_at END
  WHERE id = p_event_id;

  RETURN QUERY SELECT true, (e.series_id IS NOT NULL);
END;
$function$;

-- seri_guncelle — iki toplu kapsam. 'sonrakiler' SERİYİ BÖLER: pivot ve
-- sonrası yeni bir event_series satırına taşınır (Google Takvim davranışı).
-- Bölmeseydik iki yarı tek kart olarak katlanır, temsilci en yakın tekrar
-- olurdu ve YENİ BAŞLIKLA ARAMA HİÇ SONUÇ VERMEZDİ. Bölünce iki yarı ayrı
-- ayrı katlanır ve ikisi de aranabilir.
CREATE OR REPLACE FUNCTION public.seri_guncelle(
  p_series_id uuid,
  p_kapsam text,              -- 'sonrakiler' | 'tumu'
  p_from timestamptz,         -- pivot; 'tumu' kapsamında yok sayılır
  p_title text,
  p_description text,
  p_location text,
  p_max_attendees int,
  p_cover_image_url text,
  p_kapak_degissin boolean
)
RETURNS TABLE (guncellenen int, atlanan int, yeni_series_id uuid, ayrildi int, bildirilen int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
DECLARE
  v_com uuid;
  v_from timestamptz;
  v_yeni uuid;
  v_tasinan int;
  v_gun int := 0;
  v_atl int := 0;
  v_ayrildi int := 0;
  v_bildirilen int := 0;
  v_idler uuid[];
  v_istek_devral uuid;
  v_kaynak_bosalacak boolean;
BEGIN
  -- TEK SAVUNMA KATMANI. SECURITY DEFINER events politikalarını atlıyor;
  -- p_series_id istemciden geliyor ve series_id anon'a bile okunabilir.
  SELECT community_id INTO v_com FROM event_series WHERE id = p_series_id;
  IF v_com IS NULL THEN RAISE EXCEPTION 'seri bulunamadi'; END IF;
  IF NOT public.topluluk_yoneticisi_mi(v_com) THEN RAISE EXCEPTION 'yetkisiz'; END IF;

  IF p_kapsam NOT IN ('sonrakiler','tumu') THEN
    RAISE EXCEPTION 'gecersiz kapsam';
  END IF;

  IF p_kapsam = 'sonrakiler' AND p_from IS NULL THEN
    RAISE EXCEPTION 'pivot gerekli';
  END IF;

  -- GEÇMİŞ KORUMASI. eventEditSchema'da "gelecekte olmalı" kısıtı bilinçli
  -- olarak yok (tek etkinlikte zararsız); seri çapında bu boşluk tüm seriyi
  -- geçmişe atmayı mümkün kılardı.
  v_from := GREATEST(COALESCE(p_from, now()), now());
  IF p_kapsam = 'tumu' THEN v_from := now(); END IF;

  -- Etkilenecek satırlar: elle düzenlenmiş olanlar HARİÇ.
  SELECT array_agg(e.id) INTO v_idler FROM events e
   WHERE e.series_id = p_series_id
     AND e.event_date >= v_from
     AND e.seri_disina_alindi_at IS NULL;

  SELECT count(*)::int INTO v_atl FROM events e
   WHERE e.series_id = p_series_id
     AND e.event_date >= v_from
     AND e.seri_disina_alindi_at IS NOT NULL;

  IF v_idler IS NULL THEN
    RETURN QUERY SELECT 0, v_atl, NULL::uuid, 0, 0;
    RETURN;
  END IF;

  IF p_kapsam = 'sonrakiler' THEN
    SELECT count(*)::int INTO v_tasinan FROM events e WHERE e.id = ANY(v_idler);

    -- tekrar_sayisi CHECK BETWEEN 2 AND 26. İki satırdan azı taşınacaksa
    -- bölmek anlamsız: o satır(lar) seriden ÇIKARILIR (elle düzenlenmiş
    -- sayılır) ki yeni başlığıyla kendi kartında görünüp aranabilsin.
    IF v_tasinan < 2 THEN
      UPDATE events SET seri_disina_alindi_at = now() WHERE id = ANY(v_idler);
      GET DIAGNOSTICS v_ayrildi = ROW_COUNT;
    ELSE
      -- istek_id yalnizca kaynak seri BU BOLMEYLE BOSALACAKSA devrediliyor.
      -- Kaynak hayatta kalirsa erken tekrarlar onda; ikizlenme anahtari da
      -- onda kalmali — aksi halde yeni yari (mesela seri_sil ile) silindiginde
      -- anahtar tamamen kaybolur ve bayat bir sekmeden gelen retry, hayatta
      -- kalan kaynagin yanina ikinci bir tam seri kurar.
      SELECT NOT EXISTS (
        SELECT 1 FROM events e
         WHERE e.series_id = p_series_id AND e.id <> ALL(v_idler)
      ) INTO v_kaynak_bosalacak;

      -- NULL'lama adimi kaynak bosalacak dalda bile gerekli: kismi benzersiz
      -- indeks (event_series_istek_benzersiz) DEFERRABLE degil, INSERT aninda
      -- kontrol edilir ve kaynak satir o an hala (silinmeden once) duruyor.
      IF v_kaynak_bosalacak THEN
        SELECT s.istek_id INTO v_istek_devral FROM event_series s WHERE s.id = p_series_id;
        IF v_istek_devral IS NOT NULL THEN
          UPDATE event_series SET istek_id = NULL WHERE id = p_series_id;
        END IF;
      ELSE
        v_istek_devral := NULL;
      END IF;

      INSERT INTO event_series (community_id, organizer_id, frekans, baslangic,
                                tekrar_sayisi, istek_id)
      SELECT s.community_id, s.organizer_id, s.frekans, v_from,
             LEAST(v_tasinan, 26), v_istek_devral
        FROM event_series s WHERE s.id = p_series_id
      RETURNING id INTO v_yeni;

      UPDATE events SET series_id = v_yeni WHERE id = ANY(v_idler);
    END IF;
  END IF;

  -- Beş alan da yazılır (form hepsini gönderiyor). event_date YOK.
  -- GERÇEKTEN DEĞİŞTİ mi kapısı: WHERE'e distinctness eklenmezse UPDATE
  -- kosulsuz calisir, updated_at her satira basilir ve asagidaki bildirim
  -- kosulsuz mail kuyruklar (bos "Kaydet" tikinca bile).
  UPDATE events SET
    title           = p_title,
    description     = p_description,
    location        = p_location,
    max_attendees   = p_max_attendees,
    cover_image_url = CASE WHEN p_kapak_degissin THEN p_cover_image_url
                           ELSE cover_image_url END,
    updated_at      = now()
  WHERE id = ANY(v_idler)
    AND (title           IS DISTINCT FROM p_title
      OR description     IS DISTINCT FROM p_description
      OR location        IS DISTINCT FROM p_location
      OR max_attendees   IS DISTINCT FROM p_max_attendees
      OR (p_kapak_degissin AND cover_image_url IS DISTINCT FROM p_cover_image_url));
  GET DIAGNOSTICS v_gun = ROW_COUNT;

  -- Kaynak seri boşaldıysa (pivot ilk tekrarsa hepsi taşınmış olur) artık
  -- kimsenin işaret etmediği satırı bırakmıyoruz.
  DELETE FROM event_series s
   WHERE s.id = p_series_id
     AND NOT EXISTS (SELECT 1 FROM events e WHERE e.series_id = s.id);

  -- BİLDİRİM: yalnizca GERCEKTEN degisen satir varsa. Bölme (v_yeni)
  -- gerceklesmisse bile hicbir alan degismediyse mail atilmaz — bölme
  -- kendi basina "degisiklik" sayilmiyor, form alanlarindaki fark sayiliyor.
  IF v_gun > 0 THEN
    -- kişi başına TEK mail, tekrar başına değil. 26 tekrarlı bir seri
    -- tekrar başına mail atsaydı tek işlemde 26 × katılımcı mail üretirdi.
    -- Adresler uygulama koduna HİÇ İNMİYOR: kasaya to_user_id yazılıyor,
    -- claim_email_outbox cron sırrıyla açıp profiles'tan adresi kendisi alıyor.
    INSERT INTO email_outbox (to_user_id, template, payload)
    SELECT DISTINCT r.user_id, 'event_change',
      jsonb_build_object(
        'tur', 'seri',
        'series_id', COALESCE(v_yeni, p_series_id),
        'title', p_title,
        'location', p_location,
        'adet', v_gun,
        'community_id', v_com,
        'community_name', (SELECT c.name FROM communities c WHERE c.id = v_com)
      )
    FROM rsvps r
    WHERE r.event_id = ANY(v_idler)
      AND r.user_id <> auth.uid()
      AND public.email_izni(r.user_id, 'event_change');
    GET DIAGNOSTICS v_bildirilen = ROW_COUNT;
  END IF;

  RETURN QUERY SELECT v_gun, v_atl, v_yeni, v_ayrildi, v_bildirilen;
END;
$function$;

-- seri_sil — 'tumu' dalında da ikinci event_date >= now() koşulu fazlalık
-- DEĞİL: geçmişi kilitleyen ikinci savunma. seri_disina_alindi_at IS NULL
-- koşulu seri_guncelle ile SİMETRİK — elle düzenlenmiş, kendi RSVP'lerini
-- toplamış bir buluşma "tümünü sil" ile yok olmasın (rsvps/waitlist
-- ON DELETE CASCADE geri dönüşsüz).
CREATE OR REPLACE FUNCTION public.seri_sil(
  p_series_id uuid,
  p_kapsam text,              -- 'sonrakiler' | 'tumu'
  p_from timestamptz
)
RETURNS TABLE (silinen int, atlanan int, bildirilen int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
DECLARE
  v_com uuid;
  v_from timestamptz;
  v_idler uuid[];
  v_sil int := 0;
  v_atl int := 0;
  v_bildirilen int := 0;
BEGIN
  SELECT community_id INTO v_com FROM event_series WHERE id = p_series_id;
  IF v_com IS NULL THEN RAISE EXCEPTION 'seri bulunamadi'; END IF;
  IF NOT public.topluluk_yoneticisi_mi(v_com) THEN RAISE EXCEPTION 'yetkisiz'; END IF;

  IF p_kapsam NOT IN ('sonrakiler','tumu') THEN
    RAISE EXCEPTION 'gecersiz kapsam';
  END IF;

  IF p_kapsam = 'sonrakiler' AND p_from IS NULL THEN
    RAISE EXCEPTION 'pivot gerekli';
  END IF;

  v_from := GREATEST(COALESCE(p_from, now()), now());
  IF p_kapsam = 'tumu' THEN v_from := now(); END IF;

  SELECT array_agg(e.id) INTO v_idler FROM events e
   WHERE e.series_id = p_series_id
     AND e.event_date >= v_from
     AND e.event_date >= now()
     AND e.seri_disina_alindi_at IS NULL;

  SELECT count(*)::int INTO v_atl FROM events e
   WHERE e.series_id = p_series_id
     AND e.event_date >= v_from
     AND e.event_date >= now()
     AND e.seri_disina_alindi_at IS NOT NULL;

  IF v_idler IS NULL THEN
    RETURN QUERY SELECT 0, v_atl, 0;
    RETURN;
  END IF;

  -- BİLDİRİM SİLMEDEN ÖNCE yazılmak zorunda: rsvps.event_id ON DELETE CASCADE,
  -- yani silmeden sonra kime haber verileceği bilgisi kalmaz.
  -- Kişi başına TEK iptal maili.
  INSERT INTO email_outbox (to_user_id, template, payload)
  SELECT DISTINCT r.user_id, 'event_cancel',
    jsonb_build_object(
      'tur', 'seri',
      'title', (SELECT e.title FROM events e WHERE e.id = v_idler[1]),
      'adet', array_length(v_idler, 1),
      'community_id', v_com,
      'community_name', (SELECT c.name FROM communities c WHERE c.id = v_com)
    )
  FROM rsvps r
  WHERE r.event_id = ANY(v_idler)
    AND r.user_id <> auth.uid()
    AND public.email_izni(r.user_id, 'event_cancel');
  GET DIAGNOSTICS v_bildirilen = ROW_COUNT;

  -- Kuyruk temizliği: yoksa iptal mailinden SONRA "Yarın: X" gider ve
  -- mailin bağlantısı silinmiş uuid'ye 404 döner.
  DELETE FROM email_outbox
   WHERE sent_at IS NULL
     AND template = 'reminder'
     AND (payload->>'event_id')::uuid = ANY(v_idler);

  DELETE FROM events WHERE id = ANY(v_idler);
  GET DIAGNOSTICS v_sil = ROW_COUNT;

  DELETE FROM event_series s
   WHERE s.id = p_series_id
     AND NOT EXISTS (SELECT 1 FROM events e WHERE e.series_id = s.id);

  RETURN QUERY SELECT v_sil, v_atl, v_bildirilen;
END;
$function$;


-- -----------------------------------------------------------------------------
-- 8. TRIGGER'LAR
-- -----------------------------------------------------------------------------

-- KRİTİK: bu trigger auth şemasında. Olmadan kayıt olan kullanıcıya profil
-- satırı açılmaz ve uygulama sessizce bozulur.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS profiles_guard ON public.profiles;
CREATE TRIGGER profiles_guard BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_guard();

DROP TRIGGER IF EXISTS communities_guard ON public.communities;
CREATE TRIGGER communities_guard BEFORE INSERT OR UPDATE ON public.communities
  FOR EACH ROW EXECUTE FUNCTION public.communities_guard();

DROP TRIGGER IF EXISTS community_members_guard ON public.community_members;
CREATE TRIGGER community_members_guard BEFORE UPDATE ON public.community_members
  FOR EACH ROW EXECUTE FUNCTION public.community_members_guard();

DROP TRIGGER IF EXISTS trg_member_count ON public.community_members;
CREATE TRIGGER trg_member_count AFTER INSERT OR DELETE OR UPDATE ON public.community_members
  FOR EACH ROW EXECUTE FUNCTION public.sync_member_count();

DROP TRIGGER IF EXISTS rsvp_capacity_check ON public.rsvps;
CREATE TRIGGER rsvp_capacity_check BEFORE INSERT ON public.rsvps
  FOR EACH ROW EXECUTE FUNCTION public.check_rsvp_capacity();

DROP TRIGGER IF EXISTS rsvp_waitlist_promote ON public.rsvps;
CREATE TRIGGER rsvp_waitlist_promote AFTER DELETE ON public.rsvps
  FOR EACH ROW EXECUTE FUNCTION public.promote_from_waitlist();

DROP TRIGGER IF EXISTS trg_attendee_count ON public.rsvps;
CREATE TRIGGER trg_attendee_count AFTER INSERT OR DELETE OR UPDATE ON public.rsvps
  FOR EACH ROW EXECUTE FUNCTION public.sync_attendee_count();


-- -----------------------------------------------------------------------------
-- 9. GÖRÜNÜM
-- -----------------------------------------------------------------------------
-- Profil vitrini: e-posta ASLA yer almaz; gizli profil ve dondurulmuş hesap
-- filtrelenir. security_invoker=false çünkü profiles RLS'i yalnızca kişinin
-- kendi satırını görmesine izin veriyor.
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = false) AS
-- show_participation vitrine BİLİNÇLİ eklendi: profil sayfası katılım bloğunu
-- gizleyebilmek için okuyor. Vitrin açık kolon listesi kullandığı için yeni
-- kolonlar kendiliğinden GELMEZ — hangi alanın dışarı çıktığı hep görünür.
SELECT id, name, username, bio, avatar_url, location, created_at, show_participation
FROM profiles
WHERE COALESCE(account_active, true)
  AND (COALESCE(profile_visibility, 'public'::text) = 'public'::text
       OR id = auth.uid()
       OR is_admin());

-- Etkinlik vitrini: tekrarlayan seri gelecekteki en yakın tekrara katlanır.
-- security_invoker = true ZORUNLU: unutulursa view events SELECT politikasını
-- (bölüm 11) atlar ve onaylanmamış topluluk etkinlikleri sızar. Görünür bir
-- patlama olmaz; sessiz bir güvenlik açığıdır.
--
-- Yalnızca WHERE içeriyor → çağıranın sorgusuna düzleştirilir (pull-up), yani
-- .textSearch, city_key ilike ve community_id koşulları doğrudan events'e
-- uygulanır ve GIN/b-tree indeksleri kullanılır.
--
-- SELECT e.* : kolon listesi events ile birebir aynı kalmalı. search_vector
-- (generated tsvector) de dahil — keşfetteki .textSearch onu okuyor.
CREATE OR REPLACE VIEW public.etkinlik_vitrin WITH (security_invoker = true) AS
SELECT e.*
FROM public.events e
WHERE e.event_date >= now()
  AND (
    -- tekil etkinlik
    e.series_id IS NULL
    -- elle düzenlenmiş tekrar: artık serinin temsilcisi değil, kendi kartı var
    OR e.seri_disina_alindi_at IS NOT NULL
    -- seri temsilcisi = aynı seride kendisinden önce gelen gelecek tekrar YOK
    OR NOT EXISTS (
      SELECT 1 FROM public.events e2
      WHERE e2.series_id = e.series_id
        AND e2.seri_disina_alindi_at IS NULL
        AND e2.event_date >= now()
        AND e2.event_date < e.event_date
    )
  );

-- View'lar GRANT gerektirir (emsal: public_profiles, bölüm 12 YETKİLER).
-- Unutulursa altı yüzey "permission denied for view" alır.
GRANT SELECT ON public.etkinlik_vitrin TO anon, authenticated;

-- seri_kalanlar — rozet sayacı. Bu sayı view'ın target list'inde korele alt
-- sorgu olarak DURMUYOR: orada olsaydı satır başına koşardı ve asıl maliyet
-- kaynağı olurdu. Sayfa topladığı seri kimliklerini tek çağrıda soruyor.
--
-- SECURITY INVOKER (varsayılan) BİLİNÇLİ: sayım çağıranın RLS'i altında
-- yapılır, yani görmediği bir seri için sayı üretmez.
CREATE OR REPLACE FUNCTION public.seri_kalanlar(p_series_ids uuid[])
RETURNS TABLE (series_id uuid, kalan int, frekans text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, pg_temp
AS $function$
  SELECT e.series_id, count(*)::int, s.frekans
    FROM public.events e
    JOIN public.event_series s ON s.id = e.series_id
   WHERE e.series_id = ANY(p_series_ids)
     AND e.event_date >= now()
     AND e.seri_disina_alindi_at IS NULL
   GROUP BY e.series_id, s.frekans;
$function$;

-- Katılım karnesi sayaçları. NEDEN FONKSİYON: anon rolünün rsvps üzerinde HİÇ
-- yetkisi yok, profil sayfası da hatayı yutuyordu — "Katıldığı" giriş yapmamış
-- her ziyaretçide sessizce 0 yazıyordu. GRANT SELECT ... TO anon alternatifi
-- reddedildi: kimin nereye katıldığını herkese kazınabilir biçimde açardı.
-- Fonksiyon SAYIYI veriyor, satırları değil.
--
-- SECURITY DEFINER RLS'i atladığı için sayımlar ELLE daraltılıyor: yalnızca
-- ONAYLI topluluğa ait (ya da topluluğu olmayan) kayıtlar sayılıyor — aksi
-- halde onay bekleyen bir topluluğun varlığı sayı üzerinden sızardı.
--
-- Gizlilik kuralı fonksiyonun İÇİNDE. profile_visibility'nin bir dönem
-- "hiçbir etkisi olmayan" ayar olmasının sebebi kuralın hiçbir yerde
-- uygulanmamasıydı; burada veri veritabanından hiç çıkmıyor.
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

  -- Bu kapi olmadan sayfa yolu kapaliyken RPC yolu ACIK kaliyordu: gizli/
  -- dondurulmus profilin sayaclari anon'a siziyordu — hem de anon'un rsvps'e
  -- HIC erisemedigi veriden tureyen sayilar. Hic satir donmuyor, yani
  -- "profil yok" ile ayirt edilemez.
  -- Parantezleme vitrindekiyle BIREBIR: gorunur <=> aktif AND (public OR ben OR
  -- admin). account_active KOSULSUZ bir AND — sahibi/yonetici kacisi yalnizca
  -- profile_visibility icin gecerli. Onceki hali account_active'i de kacisin
  -- icine almisti: dondurulmus hesabin sahibi vitrinde 404 alirken fonksiyondan
  -- sayac aliyordu. Sizinti degildi ama iki kapi ayrisiyordu.
  IF (NOT v_aktif
      OR (v_gorunurluk <> 'public'
          AND p_user_id IS DISTINCT FROM auth.uid()
          AND NOT public.is_admin())) THEN
    RETURN;
  END IF;

  -- Sahibi ve yönetici istisna: kendi karnesini görebilmeli.
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

-- -----------------------------------------------------------------------------
-- ilgi_onerileri — ilgi alanlarına göre topluluk önerisi.
-- -----------------------------------------------------------------------------
-- `profiles.interests` bu sorgudan ÖNCE üç yerde yazılıp SIFIR yerde
-- okunuyordu (depoda üçüncü "ölü ayar": profile_visibility, show_participation,
-- interests). Zincir: interests → topics (birebir, yoksa önek) →
-- topic_category_map → aynı kategorideki konular → community_topics.
-- Ayrıntılı gerekçe: migrations/20260901100000_ilgi_onerileri.sql

CREATE OR REPLACE FUNCTION public.ilgi_onerileri(p_limit int DEFAULT 4)
RETURNS TABLE (
  id uuid, name text, city text, category text, cover_image_url text,
  member_count int, skor int, eslesen_ilgiler text[], dogrudan_ilgiler text[]
)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
WITH ben AS (
  -- AÇIK YÜKLEM ZORUNLU. profiles_select_authenticated politikası
  -- `(auth.uid() = id) OR is_admin()` — yüklemsiz bir SELECT, YÖNETİCİ
  -- çağırdığında BÜTÜN profillerin ilgi alanlarını birleştirirdi.
  SELECT unnest(coalesce(p.interests, '{}'::text[])) AS ham
    FROM public.profiles p
   WHERE p.id = auth.uid()
),
kirp AS (
  -- TEK NORMALLEŞTİRME NOKTASI. Eskiden uzunluk kapısı `btrim(ham)` ile
  -- ölçülüyor ama eşleşme anahtarı KIRPILMAMIŞ `ham`'dan kuruluyordu:
  -- '  Felsefe  ' kapıyı geçip hiçbir konuya vurmuyordu, 'Felsefe ' ise önek
  -- koluna düşüp "Felsefe Okumaları" üzerinden YANLIŞ kart üretiyordu.
  -- `btrim`in varsayılanı yalnızca boşluk siler; sekme/CR/LF açıkça veriliyor.
  SELECT btrim(ham, E' \t\r\n') AS ham FROM ben
),
n AS (
  -- TRANSLATE ÖNCE, LOWER SONRA. Ters sırada lower('İ') iki kod noktası
  -- üretiyor ('i' + U+0307) ve translate onu artık yakalayamıyor:
  -- 'i̇ngilizce' ≠ 'ingilizce'. Aynı kural topics.search_text'i üretiyor.
  --
  -- NORMALİZE ANAHTAR BAŞINA TEK TEMSİLCİ: 'Şiir' ile 'şiir' aynı ilgi
  -- alanıdır. Ham metin üzerinden tekilleştirmek skoru iki kez sayıyor ve
  -- gerekçe satırına "şiir ve Şiir ilgi alanlarından" yazdırıyordu.
  --
  -- ÜÇ KARAKTER EŞİĞİ ARTIK BURADA DEĞİL, `onek` KOLUNDA: birebir kol
  -- yayılamaz (topics.search_text BENZERSİZ), eşik oradayken katalogdaki iki
  -- gerçek konu ('Go', 'C#') sessizce eleniyordu.
  SELECT DISTINCT ON (lower(translate(ham, 'çğıİIöşüÇĞÖŞÜ', 'cgiiiosucgosu')))
         ham,
         lower(translate(ham, 'çğıİIöşüÇĞÖŞÜ', 'cgiiiosucgosu')) AS k
    FROM kirp
   WHERE ham <> ''
   ORDER BY lower(translate(ham, 'çğıİIöşüÇĞÖŞÜ', 'cgiiiosucgosu')), ham
),
g AS (
  -- JOKER KAPISI. `interests` serbest metin: interest-picker.tsx'te "kendin
  -- ekle" kutusu var, ilgiAlanlariSchema yalnızca trim/1-60 karaktere bakıyor.
  -- Ölçüm (01.09.2026) — '%' TEK BAŞINA uzunluk kapısına takılıyordu, yani
  -- eski yorumdaki örnek gerçekleşemiyordu. Gerçek tehlike üç ve daha uzun
  -- desenlerde: '___' kaçırmasız 569 konu, '%e%' 332 konu, '%ap' 19 konu —
  -- her biri konusu olan üç onaylı topluluğun ÜÇÜNÜ birden işaretlerdi.
  SELECT ham, k, replace(replace(replace(k, '\', '\\'), '%', '\%'), '_', '\_') AS esc
    FROM n
),
birebir AS (
  SELECT g.ham, t.id AS topic_id
    FROM g JOIN public.topics t ON t.search_text = g.k
),
onek AS (
  -- YALNIZCA o etiket için birebir HİÇ sonuç yoksa. Önek kolu TAŞIYICI:
  -- "Kısa Öykü" birebir hiçbir konuya vurmuyor, yalnızca önekle
  -- "Kısa Öyküler"e ulaşıyor.
  --
  -- KELİME SINIRI YA DA KISA EK. `LIKE 'doga%'` ham karakter öneki:
  -- "Doğaçlama"yı da yakalıyordu, o da film-dizi-medya kategorisinde, yani
  -- "doğa" yazan kullanıcıya felsefe ve fotoğraf kulübü çıkıyor, kartın
  -- altında "doğa ilgi alanından" yazıyordu (ölçüm 01.09.2026: 2 satır).
  -- Düz kelime sınırı yetmez, taşıyıcı vakayı öldürürdü; bu yüzden VEYA ile
  -- en fazla üç karakterlik ek. Ölçüldü: "Kısa Öykü"->"Kısa Öyküler",
  -- "Konser"->"Konser Arkadaşları", "Sergi"->"Sergi Turları" korunuyor;
  -- "Doğaçlama" (ek 5) düşüyor.
  --
  -- ÜÇ KARAKTER EŞİĞİ YALNIZCA BURADA. Ölçüm (01.09.2026, 571 konu): en kötü
  -- iki karakterli önek 'ka' -> 26 konu, en kötü tek karakterli 'k' -> 71.
  -- (Eski yorumdaki "'üç' yüzlerce konuya yayılırdı" ölçülmemişti: 'uc%' 1
  -- konu döndürüyor.)
  SELECT g.ham, t.id AS topic_id
    FROM g
    JOIN public.topics t
      ON t.search_text LIKE g.esc || '%'
     AND (t.search_text LIKE g.esc || ' %'
          OR length(t.search_text) - length(g.k) <= 3)
   WHERE length(g.ham) >= 3
     AND NOT EXISTS (SELECT 1 FROM birebir b WHERE b.ham = g.ham)
),
coz AS (SELECT * FROM birebir UNION ALL SELECT * FROM onek),
onayli AS (SELECT count(*)::numeric AS toplam FROM public.communities WHERE status = 'approved'),
genis AS (
  -- AYIRT EDİCİLİK KAPISI. Onaylı katalogun yarısından fazlasına ulaşan bir
  -- konu kategorisi kişiselleştirme sinyali değil, gürültüdür.
  --
  -- KAPI ARTIK YALNIZCA KATEGORİ YAYILIMINI BUDUYOR (bkz. `eslesme`);
  -- birebir konu vuruşu her hâlükârda geçer.
  --
  -- MUTLAK TABAN (>= 3): eşik oransal olduğu için küçük katalogda gevşemiyor,
  -- TERSİNE sıkışıyordu. N=1'de eşik 0,5 olup tek topluluğun dokunduğu HER
  -- kategori eleniyor ve fonksiyon hangi ilgi alanı girilirse girilsin 0 satır
  -- döndürüyordu; N=3'e kadar eşleşmelerin bir kısmı kayboluyordu. Ölçüldü:
  -- taban eklendiğinde N=4 ve N=5 sonuçları BİREBİR aynı kalıyor.
  --
  -- YALNIZCA KULLANICININ ULAŞTIĞI KATEGORİLER: `kat` zaten yalnızca bunları
  -- yokluyor, sonuç birebir aynı; ama tarama katalogla değil ilgi alanı
  -- sayısıyla orantılı kalıyor. (Ölçüm: 10.000 topluluklu sentetik katalogda
  -- korelesiz hâli tek başına ~50-70 ms ve tek ilgi alanlı çağrının %83'ü.)
  --
  -- Ölçüm (01.09.2026, N=5): yalnızca 'sosyal' eleniyor (3/5 = %60).
  SELECT m.category_id
    FROM public.topic_category_map m
    JOIN public.community_topics ct ON ct.topic_id = m.topic_id
    JOIN public.communities c ON c.id = ct.community_id AND c.status = 'approved'
   WHERE m.category_id IN (
           SELECT m0.category_id
             FROM public.topic_category_map m0
             JOIN coz ON coz.topic_id = m0.topic_id)
   GROUP BY m.category_id
  HAVING count(DISTINCT ct.community_id) >= 3
     AND count(DISTINCT ct.community_id)::numeric > 0.5 * (SELECT toplam FROM onayli)
),
kat AS (
  SELECT DISTINCT coz.ham, m.category_id AS cid
    FROM coz
    JOIN public.topic_category_map m ON m.topic_id = coz.topic_id
   -- NOT IN DEĞİL NOT EXISTS: alt sorgu tek bir NULL döndürseydi NOT IN
   -- tüm sonucu sessizce boşaltırdı.
   WHERE NOT EXISTS (SELECT 1 FROM genis WHERE genis.category_id = m.category_id)
),
eslesme AS (
  -- KATEGORİ YAYILIMI — ayırt edicilik kapısına TABİ, `dogrudan` = false.
  SELECT kat.ham, ct.community_id, false AS dogrudan
    FROM kat
    JOIN public.topic_category_map m2 ON m2.category_id = kat.cid
    JOIN public.community_topics ct ON ct.topic_id = m2.topic_id
  UNION ALL
  -- DOĞRUDAN KOL — KAPIDAN MUAF. Kullanıcının çözülen konusu topluluğun konu
  -- listesinde birebir duruyor: zincirin en güçlü sinyali, kategorisi
  -- kalabalık diye elenemez. `dogrudan` bayrağı hem sıralamayı hem arayüzdeki
  -- gerekçe cümlesini besliyor.
  SELECT coz.ham, ct.community_id, true
    FROM coz
    JOIN public.community_topics ct ON ct.topic_id = coz.topic_id
)
SELECT c.id, c.name, c.city, c.category, c.cover_image_url, c.member_count,
       count(DISTINCT e.ham)::int AS skor,
       array_agg(DISTINCT e.ham) AS eslesen_ilgiler,
       coalesce(array_agg(DISTINCT e.ham) FILTER (WHERE e.dogrudan), '{}'::text[])
         AS dogrudan_ilgiler
  FROM public.communities c
  JOIN eslesme e ON e.community_id = c.id
 -- RLS'E BIRAKILMIYOR: "Topluluklar okunabilir" politikası
 -- `status='approved' OR founder_id=auth.uid() OR is_admin()` — yüklemsiz
 -- bırakılsaydı kurucuya kendi inceleme bekleyen topluluğu ÖNERİLİRDİ.
 WHERE c.status = 'approved'
   AND c.founder_id IS DISTINCT FROM auth.uid()
   -- Zaten üye olduğun YA DA isteği BEKLEYEN topluluk öneri değildir: katılma
   -- isteği kullanıcının verebileceği en güçlü ilgi sinyali, o topluluğa dört
   -- yuvadan birini harcamak israf. Reddetme/ayrılma satırı SİLDİĞİ için bu
   -- kalıcı bir gizlenme yaratmıyor.
   AND NOT EXISTS (
     SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = c.id AND cm.user_id = auth.uid())
 GROUP BY c.id, c.name, c.city, c.category, c.cover_image_url, c.member_count, c.created_at
 -- Çok ilgi alanına birden dokunan topluluk önce; eşitlikte BİREBİR konu
 -- vuruşu olan, sonra kalabalık, sonra yeni. İkinci basamak olmadan tek ilgi
 -- alanı 'Fotoğrafçılık' olan kullanıcıya adı ve konusu literal olarak
 -- "Fotoğrafçılık" olan kulüp, felsefe-kahve topluluğunun ALTINDA kalıyordu.
 ORDER BY count(DISTINCT e.ham) DESC,
          count(DISTINCT e.ham) FILTER (WHERE e.dogrudan) DESC,
          c.member_count DESC NULLS LAST, c.created_at DESC
 LIMIT greatest(1, least(p_limit, 12));
$function$;

-- -----------------------------------------------------------------------------
-- etkinlik_silinince_kuyrugu_temizle — silinen etkinliğin bekleyen postaları
-- -----------------------------------------------------------------------------
-- Etkinlik silindiğinde `email_outbox`'ta o etkinliğe ait gönderilmemiş
-- satırlar kalıyordu: kullanıcı iptal mailinden SONRA "Yarın: X" alıyor ve
-- bağlantı silinmiş uuid'ye 404 dönüyordu. İki boşluk vardı — `seri_sil`
-- yalnızca 'reminder' temizliyordu ('promotion' da event_id taşıyor) ve
-- TEKİL silme yolu hiç temizlemiyordu.
--
-- Trigger, RPC değil: email_outbox'ın sıfır politikası ve sıfır GRANT'i var,
-- yalnızca SECURITY DEFINER dokunabiliyor; RPC olsaydı "kimin hangi etkinliğin
-- kuyruğunu silme hakkı var" sorusu elle çözülecekti. Trigger'da o soru yok.
--
-- Ölçüt `event_id`: bu anahtarı YALNIZCA reminder ve promotion taşıyor.
-- event_cancel/event_change/join_request taşımıyor — kritik, çünkü `seri_sil`
-- iptal bildirimini silmeden ÖNCE kuyruğa yazıyor.
-- Ayrıntı: migrations/20260901140000_kuyruk_hijyeni.sql
CREATE OR REPLACE FUNCTION public.etkinlik_silinince_kuyrugu_temizle()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
BEGIN
  -- ÇEVRİM YÖNÜ HAYATİ: metni uuid'ye DEĞİL, uuid'yi metne çeviriyoruz.
  -- Ters yönde (`(payload->>'event_id')::uuid`) kuyruğa uuid olmayan tek bir
  -- event_id düşse 22P02 bu trigger'ın İÇİNDE patlar ve `DELETE FROM events`
  -- ifadesini komple geri alır: tekil iptal, seri_sil, topluluk silme ve
  -- hesap silme (events CASCADE) dâhil HEPSİ 500 döner. Bu yönde bozuk değer
  -- yalnızca EŞLEŞMEZ.
  -- Önceki `payload ? 'event_id'` koruması İŞE YARAMIYORDU: WHERE içindeki
  -- AND'ler için kısa devre garantisi yok, planlayıcı çevrimi korumadan önce
  -- koşabilir. Anahtar yoksa ->> zaten NULL döner ve IN eşleşmez.
  DELETE FROM email_outbox o
   WHERE o.sent_at IS NULL
     AND o.payload->>'event_id' IN (SELECT s.id::text FROM silinen s);
  RETURN NULL;
END
$function$;

-- Trigger fonksiyondan SONRA tanımlanmak ZORUNDA: bu dosya taze bir veritabanına
-- baştan sona uygulanıyor, sıra bozulursa CREATE TRIGGER var olmayan fonksiyonu
-- arar ve şema kurulumu patlar.
-- FOR EACH STATEMENT + geçiş tablosu: seri_sil 26 tekrarı tek DELETE ile siler,
-- satır bazlı trigger 26 kez koşardı.
DROP TRIGGER IF EXISTS events_kuyruk_temizligi ON public.events;
CREATE TRIGGER events_kuyruk_temizligi
  AFTER DELETE ON public.events
  REFERENCING OLD TABLE AS silinen
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.etkinlik_silinince_kuyrugu_temizle();

REVOKE ALL ON FUNCTION public.seri_kalanlar(uuid[]) FROM PUBLIC;
-- anon da alıyor: ana sayfa ve keşfet giriş yapmamış kullanıcıya da açık.
GRANT EXECUTE ON FUNCTION public.seri_kalanlar(uuid[]) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.katilim_karnesi(uuid) FROM PUBLIC;
-- anon DA alıyor: profil sayfası giriş yapmamış ziyaretçiye de açık ve
-- karnenin görünmesinin bütün amacı bu.
GRANT EXECUTE ON FUNCTION public.katilim_karnesi(uuid) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.ilgi_onerileri(int) FROM PUBLIC;
-- anon'a VERİLMİYOR: misafirin ilgi alanı yok, auth.uid() null döner.
GRANT EXECUTE ON FUNCTION public.ilgi_onerileri(int) TO authenticated;


-- -----------------------------------------------------------------------------
-- 10. RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_category_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- app_secrets ve email_outbox: RLS açık, POLİTİKA YOK = tamamen kilitli.
-- Yalnızca SECURITY DEFINER fonksiyonlar erişebilir. Bilinçli.


-- -----------------------------------------------------------------------------
-- 11. RLS POLİTİKALARI
-- -----------------------------------------------------------------------------

-- profiles
CREATE POLICY "profiles_select_authenticated" ON public.profiles FOR SELECT TO authenticated
  USING ((auth.uid() = id) OR is_admin());
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- communities
CREATE POLICY "Topluluklar okunabilir" ON public.communities FOR SELECT
  USING ((status = 'approved'::text) OR (founder_id = auth.uid()) OR is_admin());
CREATE POLICY "Giris yapmis kullanici topluluk kurar" ON public.communities FOR INSERT
  WITH CHECK (auth.uid() = founder_id);
CREATE POLICY "Founder toplulugunu gunceller" ON public.communities FOR UPDATE
  USING ((auth.uid() = founder_id) OR is_admin())
  WITH CHECK ((auth.uid() = founder_id) OR is_admin());
CREATE POLICY "Founder toplulugunu siler" ON public.communities FOR DELETE
  USING (auth.uid() = founder_id);

-- community_announcements
-- Duyuru üye iletişimidir ("salon değişti", "kapı kodu 1234"). Postayı zaten
-- yalnızca üyeler alıyor; sayfa da aynı kitleyi görmeli.
CREATE POLICY "Duyurulari onayli uye okur" ON public.community_announcements
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM community_members cm
    WHERE cm.community_id = community_announcements.community_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
  ));
CREATE POLICY "Duyuruyu yonetici yazar" ON public.community_announcements
  FOR INSERT WITH CHECK (
    public.topluluk_yoneticisi_mi(community_id) AND author_id = auth.uid()
  );
CREATE POLICY "Duyuruyu yonetici gunceller" ON public.community_announcements
  FOR UPDATE USING (public.topluluk_yoneticisi_mi(community_id));
CREATE POLICY "Duyuruyu yonetici siler" ON public.community_announcements
  FOR DELETE USING (public.topluluk_yoneticisi_mi(community_id));

-- events
CREATE POLICY "Events okunabilir" ON public.events FOR SELECT
  USING ((community_id IS NULL) OR (organizer_id = auth.uid()) OR is_admin() OR (EXISTS (
    SELECT 1 FROM communities c
    WHERE c.id = events.community_id AND ((c.status = 'approved'::text) OR (c.founder_id = auth.uid())))));
CREATE POLICY "Giriş yapmış kullanıcı etkinlik oluşturur" ON public.events FOR INSERT
  WITH CHECK ((auth.uid() = organizer_id) AND ((community_id IS NULL) OR (EXISTS (
    SELECT 1 FROM community_members cm
    WHERE cm.community_id = events.community_id AND cm.user_id = auth.uid()
      AND cm.role = ANY (ARRAY['founder'::text, 'admin'::text]) AND cm.status = 'approved'::text))));
CREATE POLICY "Yetkili kisi etkinligi gunceller" ON public.events FOR UPDATE
  USING ((auth.uid() = organizer_id) OR (EXISTS (
    SELECT 1 FROM community_members cm
    WHERE cm.community_id = events.community_id AND cm.user_id = auth.uid()
      AND cm.role = ANY (ARRAY['founder'::text, 'admin'::text]) AND cm.status = 'approved'::text)))
  WITH CHECK ((auth.uid() = organizer_id) OR (EXISTS (
    SELECT 1 FROM community_members cm
    WHERE cm.community_id = events.community_id AND cm.user_id = auth.uid()
      AND cm.role = ANY (ARRAY['founder'::text, 'admin'::text]) AND cm.status = 'approved'::text)));
CREATE POLICY "Yetkili kisi etkinligi siler" ON public.events FOR DELETE
  USING ((auth.uid() = organizer_id) OR (EXISTS (
    SELECT 1 FROM community_members cm
    WHERE cm.community_id = events.community_id AND cm.user_id = auth.uid()
      AND cm.role = ANY (ARRAY['founder'::text, 'admin'::text]) AND cm.status = 'approved'::text)));

-- event_series
-- events SELECT politikasının aynası: onaylanmamış topluluğun serisi yalnızca
-- kendi organizatörüne ve yöneticiye görünür. INSERT/UPDATE/DELETE için NE
-- politika NE grant var — bilinçli (bölüm 12 YETKİLER'de ayrıca yorumlu):
-- yazan tek şey SECURITY DEFINER fonksiyonlar (app_secrets/email_outbox
-- kalıbı). REVOKE ALL şart: baseline panelden (supabase_admin olarak)
-- koşturulduğunda varsayılan authenticated'a arwdDxtm veriyor; o hâlde
-- herhangi bir kayıtlı kullanıcı DELETE FROM event_series çağırabilir ve
-- series_id ON DELETE SET NULL olduğu için TÜM SERİLER tek seferde dağılırdı.
CREATE POLICY "Seriler herkese acik" ON public.event_series
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = community_id AND c.status = 'approved'
    )
    OR organizer_id = auth.uid()
    OR public.is_admin()
  );

-- community_members
CREATE POLICY "Uyelikler okunabilir" ON public.community_members FOR SELECT USING (true);
CREATE POLICY "Kullanici katilim istegi gonderir" ON public.community_members FOR INSERT
  WITH CHECK ((auth.uid() = user_id) AND (((role = 'member'::text) AND (status = 'pending'::text))
    OR ((role = 'founder'::text) AND (status = 'approved'::text) AND (EXISTS (
      SELECT 1 FROM communities c
      WHERE c.id = community_members.community_id AND c.founder_id = auth.uid()
        AND c.status = 'pending_review'::text)))));
CREATE POLICY "Founder admin uyelik gunceller" ON public.community_members FOR UPDATE
  USING (EXISTS (SELECT 1 FROM community_members cm
    WHERE cm.community_id = community_members.community_id AND cm.user_id = auth.uid()
      AND cm.role = ANY (ARRAY['founder'::text, 'admin'::text]) AND cm.status = 'approved'::text))
  WITH CHECK ((role = ANY (ARRAY['member'::text, 'admin'::text]))
    AND (status = ANY (ARRAY['pending'::text, 'approved'::text])));
CREATE POLICY "Founder admin uye cikarir" ON public.community_members FOR DELETE
  USING ((role <> 'founder'::text) AND ((auth.uid() = user_id) OR (EXISTS (
    SELECT 1 FROM community_members cm
    WHERE cm.community_id = community_members.community_id AND cm.user_id = auth.uid()
      AND cm.role = ANY (ARRAY['founder'::text, 'admin'::text]) AND cm.status = 'approved'::text))));

-- rsvps
CREATE POLICY "RSVPs okunabilir" ON public.rsvps FOR SELECT USING (true);
CREATE POLICY "Sadece toplulugun onayli uyesi RSVP yapar" ON public.rsvps FOR INSERT
  WITH CHECK ((auth.uid() = user_id) AND (EXISTS (
    SELECT 1 FROM events e JOIN community_members cm ON cm.community_id = e.community_id
    WHERE e.id = rsvps.event_id AND cm.user_id = auth.uid() AND cm.status = 'approved'::text)));
CREATE POLICY "Kendi RSVP'sini sil" ON public.rsvps FOR DELETE
  USING (auth.uid() = user_id);

-- waitlist
CREATE POLICY "waitlist_select_own_or_manager" ON public.waitlist FOR SELECT TO authenticated
  USING ((auth.uid() = user_id) OR (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = waitlist.event_id AND ((e.organizer_id = auth.uid()) OR (EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = e.community_id AND cm.user_id = auth.uid()
        AND cm.status = 'approved'::text
        AND cm.role = ANY (ARRAY['founder'::text, 'admin'::text])))))));
CREATE POLICY "waitlist_insert_own" ON public.waitlist FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "waitlist_delete_own" ON public.waitlist FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- reports
CREATE POLICY "reports_select_admin" ON public.reports FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));
CREATE POLICY "reports_insert_own" ON public.reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "reports_update_admin" ON public.reports FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- community_drafts
CREATE POLICY "own draft select" ON public.community_drafts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "own draft insert" ON public.community_drafts FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "own draft update" ON public.community_drafts FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "own draft delete" ON public.community_drafts FOR DELETE USING (user_id = auth.uid());

-- community_topics
CREATE POLICY "community_topics readable by all" ON public.community_topics FOR SELECT USING (true);
CREATE POLICY "community_topics writable by founder" ON public.community_topics FOR ALL
  USING (EXISTS (SELECT 1 FROM communities c
    WHERE c.id = community_topics.community_id AND c.founder_id = auth.uid()));

-- referans tabloları: herkese okunur
CREATE POLICY "topics readable by all" ON public.topics FOR SELECT USING (true);
CREATE POLICY "topic_categories readable by all" ON public.topic_categories FOR SELECT USING (true);
CREATE POLICY "topic_category_map readable by all" ON public.topic_category_map FOR SELECT USING (true);
CREATE POLICY "locations readable by all" ON public.locations FOR SELECT USING (true);

-- topic_suggestions
CREATE POLICY "topic_suggestions read own" ON public.topic_suggestions FOR SELECT
  USING (suggested_by = auth.uid());
CREATE POLICY "topic_suggestions insert by authenticated" ON public.topic_suggestions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);


-- -----------------------------------------------------------------------------
-- 12. YETKİLER
-- -----------------------------------------------------------------------------
-- Yalnızca anlamlı olanlar. Supabase'in varsayılan yetkileri
-- (TRIGGER/TRUNCATE/REFERENCES) ALTER DEFAULT PRIVILEGES ile zaten geliyor.

GRANT SELECT ON TABLE public.communities, public.events, public.community_members,
  public.community_topics, public.topics, public.topic_categories,
  public.topic_category_map, public.locations, public.public_profiles TO anon, authenticated;
GRANT SELECT ON TABLE public.profiles, public.community_drafts,
  public.topic_suggestions TO authenticated;
GRANT SELECT ON TABLE public.profiles TO anon;

-- event_series: yalnızca SELECT, üstteki toplu listeye BİLİNÇLİ OLARAK
-- EKLENMEDİ (community_announcements yorumunda yazılı, bir kez yaşandı: kolon/
-- politika bazlı koruma tablo bazlı GRANT'i EZMEZ). INSERT/UPDATE/DELETE için
-- ne politika ne grant var — yazan tek şey aşağıdaki SECURITY DEFINER
-- fonksiyonlar (seri_olustur/seri_guncelle/seri_sil). REVOKE ALL şart:
-- panelden (supabase_admin olarak) koşturulduğunda varsayılan authenticated'a
-- arwdDxtm veriyor; REVOKE olmadan herhangi bir kayıtlı kullanıcı
-- DELETE FROM event_series çağırabilir ve series_id ON DELETE SET NULL
-- olduğu için TÜM SERİLER tek seferde dağılırdı.
REVOKE ALL ON TABLE public.event_series FROM anon, authenticated;
GRANT SELECT ON TABLE public.event_series TO anon, authenticated;

-- rsvps: kolon bazlı. checkin_token DIŞARIDA bırakılır — herkesin başkasının
-- giriş kodunu okuyup onun adına giriş yapabilmesini engeller.
-- DİKKAT: kolon bazlı REVOKE, tablo bazlı GRANT'i geçersiz kılmaz — komut
-- hatasız geçer ama hiçbir şey yapmaz. Bu yüzden önce tablo yetkisi
-- kaldırılıp kolonlar tek tek veriliyor.
REVOKE SELECT ON public.rsvps FROM authenticated;
GRANT  SELECT (id, event_id, user_id, created_at, checked_in_at, checked_in_by)
  ON public.rsvps TO authenticated;

GRANT INSERT, UPDATE, DELETE ON TABLE public.communities TO anon, authenticated;
-- public.events BİLİNÇLİ olarak çıkarıldı: yazma yetkisi kolon bazlı
-- (aşağıda, rsvps emsalinden sonra). Tablo bazlı GRANT burada kalsaydı kolon
-- listeleri sessizce anlamsızlaşırdı — kolon bazlı yetki tablo bazlı GRANT'i
-- EZMEZ.
GRANT INSERT, UPDATE, DELETE ON TABLE public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.community_members, public.community_topics,
  public.community_drafts TO authenticated;
GRANT INSERT ON TABLE public.topic_suggestions TO authenticated;

-- rsvps: yazma da kolon bazlı. UPDATE hiç verilmiyor (politikası yok,
-- uygulama kodunda .update() çağrısı yok — giriş/geri alma SECURITY
-- DEFINER fonksiyonlardan geçiyor). DELETE tablo bazlı kalıyor, "Kendi
-- RSVP'sini sil" politikası ona dayanıyor. INSERT yalnızca event_id/user_id
-- ile sınırlı — aksi halde onaylı bir üye kendi adına sahte bir "gelmiş"
-- satırı (checked_in_at/checked_in_by dolu) yazabilirdi.
-- Kolon bazlı yazma yetkisi de tablo bazlı GRANT'i ezmez: panelden
-- (supabase_admin olarak) çalıştırıldığında varsayılan authenticated'a
-- arwdDxtm verir ve aşağıdaki INSERT/UPDATE kısıtları anlamsızlaşırdı.
REVOKE INSERT, UPDATE ON public.rsvps FROM authenticated, anon;
GRANT DELETE ON TABLE public.rsvps TO authenticated;
GRANT INSERT (event_id, user_id) ON public.rsvps TO authenticated;

-- events: yazma da kolon bazlı (rsvps emsali, yukarıda). series_id eklenince
-- kullanıcı kendi etkinliğini başkasının serisine yazabilir, occurrence_index'i
-- bozabilir, seri_disina_alindi_at'ı temizleyip düzenleme izini silebilirdi.
-- ÖNCE REVOKE, SONRA KOLON BAZLI GRANT — sıra önemli: ters çevrilirse
-- yukarıdaki toplu GRANT SELECT/INSERT/UPDATE/DELETE listeleri kolon
-- listelerini ezer.
REVOKE INSERT, UPDATE ON TABLE public.events FROM anon, authenticated;

-- DELETE tablo bazlı kalıyor; "Yetkili kisi etkinligi siler" politikası ona
-- dayanıyor (rsvps DELETE emsali, yukarıda). anon'a verilmiyor: RLS zaten
-- auth.uid()'e bağlı olduğu için anon'un tablo düzeyi DELETE hakkı gereksiz
-- bir ayrıcalıktı (community_announcements emsali).
GRANT DELETE ON TABLE public.events TO authenticated;

GRANT INSERT (title, description, location, event_date, organizer_id,
              community_id, cover_image_url, max_attendees)
  ON public.events TO authenticated;

GRANT UPDATE (title, description, location, event_date, cover_image_url,
              max_attendees)
  ON public.events TO authenticated;

-- Listede OLMAYANLAR: series_id, occurrence_index, updated_at,
-- seri_disina_alindi_at, attendee_count, reminder_sent_at, search_vector,
-- created_at. Onları yalnızca SECURITY DEFINER fonksiyonlar yazabilir.

-- community_announcements: DİKKAT — üstteki toplu INSERT/UPDATE/DELETE
-- listelerine EKLENMEZ. Kolon bazlı yetki tablo bazlı GRANT'i ezmez; birlikte
-- verilirse created_at ve community_id korumaları sessizce anlamsızlaşır
-- (bir kez yaşandı). Tabloyu her zaman migration ile oluştur.
-- Kolon bazlı yetki tablo bazlı GRANT'i EZMEZ: önce tablo düzeyi geri alınır.
-- Baseline panelden çalıştırıldığında (KURULUM-REHBERI.md'nin anlattığı yol)
-- supabase_admin varsayılanı authenticated'a arwdDxtm veriyor; bu REVOKE
-- olmadan aşağıdaki kolon listeleri sessizce anlamsızlaşır.
REVOKE INSERT, UPDATE ON public.community_announcements FROM authenticated, anon;
GRANT SELECT ON public.community_announcements TO authenticated;
GRANT DELETE ON public.community_announcements TO authenticated;
-- created_at ve id istemciden yazılamaz: created_at sıralamayı belirliyor,
-- uydurulabilseydi bir duyuru akışın başına çivilenebilirdi.
GRANT INSERT (community_id, author_id, title, body)
  ON public.community_announcements TO authenticated;
-- community_id BİLİNÇLİ olarak yok: UPDATE politikasında yalnızca USING var,
-- WITH CHECK yok. Kolon güncellenebilseydi bir yönetici duyuruyu yönetmediği
-- bir topluluğa taşıyabilirdi. İki koruma birbirine bağlı.
GRANT UPDATE (title, body, updated_at, sent_count)
  ON public.community_announcements TO authenticated;

-- Fonksiyon yetkileri: varsayılan PUBLIC EXECUTE her yerde geri alınıyor.
REVOKE ALL ON FUNCTION public._check_cron_secret(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.email_izni(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;

-- Cron uçları: anon'a açık ama _check_cron_secret ile korunuyor.
REVOKE ALL ON FUNCTION public.claim_email_outbox(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_email_outbox(text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.queue_event_reminders(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.queue_event_reminders(uuid, text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.queue_promotion_emails(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.queue_promotion_emails(text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_outbox_sent(bigint[], text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_outbox_sent(bigint[], text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_reminder_sent(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_reminder_sent(uuid, text) TO anon;
REVOKE ALL ON FUNCTION public.mark_promotion_email_sent(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_promotion_email_sent(uuid, text) TO anon;

-- Yetkili okuyucular: yalnızca giriş yapmışlara, yetki fonksiyonun içinde.
REVOKE ALL ON FUNCTION public.get_member_emails(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_member_emails(uuid, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.get_event_rsvp_emails(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_event_rsvp_emails(uuid, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.get_member_contact(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_member_contact(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.queue_join_notification(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.queue_join_notification(uuid) TO authenticated;

-- Topluluk duyuruları: yetki kontrolü fonksiyonun içinde (auth.uid()).
REVOKE ALL ON FUNCTION public.topluluk_yoneticisi_mi(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.topluluk_yoneticisi_mi(uuid) TO authenticated;

-- QR check-in: yetki kontrolü fonksiyonun içinde (auth.uid()).
REVOKE ALL ON FUNCTION public.etkinlik_yoneticisi_mi(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.etkinlik_yoneticisi_mi(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.checkin_kodum(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.checkin_kodum(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.checkin_dogrula(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.checkin_dogrula(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.checkin_yap(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.checkin_yap(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.checkin_geri_al(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.checkin_geri_al(uuid) TO authenticated;

-- Tekrarlayan etkinlik serileri: yetki kontrolü fonksiyonun içinde
-- (topluluk_yoneticisi_mi / etkinlik_yoneticisi_mi). anon'a hiçbirinde
-- EXECUTE verilmiyor. (seri_kalanlar'ın kendi REVOKE/GRANT'i bölüm 9
-- GÖRÜNÜM'de, etkinlik_vitrin'in yanında — orada yaşamasının nedeni view'ın
-- doğrudan yardımcısı olması.)
REVOKE ALL ON FUNCTION public.seri_olustur(uuid, text, text, text, timestamptz,
  text, int, int, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seri_olustur(uuid, text, text, text, timestamptz,
  text, int, int, text, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.etkinlik_guncelle(uuid, text, text, text,
  timestamptz, int, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.etkinlik_guncelle(uuid, text, text, text,
  timestamptz, int, text, boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.seri_guncelle(uuid, text, timestamptz, text, text,
  text, int, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seri_guncelle(uuid, text, timestamptz, text, text,
  text, int, text, boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.seri_sil(uuid, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seri_sil(uuid, text, timestamptz) TO authenticated;


-- -----------------------------------------------------------------------------
-- 13. REALTIME
-- -----------------------------------------------------------------------------
-- Katılımcı listesi events.attendee_count UPDATE'ini dinliyor (rsvps değil —
-- kimin nereye kayıtlı olduğu yayınlanmasın diye).
--
-- rsvps bir ara canlı yayına girmişti; bu dosya doğruyu söylüyordu ama
-- veritabanı ayrışmıştı. 20260828180000 migration'ı geri çıkardı. Buraya
-- rsvps EKLEME: abone olan kod yok ve yayında olduğu sürece giriş yapmış
-- herkes kimin hangi etkinliğe kaydolduğunu anlık dinleyebiliyor.
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;


-- =============================================================================
-- STORAGE (bilgi amaçlı — SQL ile kurulmuyor, panelden yapılıyor)
-- =============================================================================
-- Üç kova da public, MIME allowlist ve boyut limiti SUNUCU tarafında zorunlu:
--
--   avatars           2 MB   image/jpeg, image/png, image/webp
--   community-covers  5 MB   image/jpeg, image/png, image/webp
--   event-covers      5 MB   image/jpeg, image/png, image/webp
--
-- Limitler lib/upload.ts içindeki KOVA_LIMIT_MB ile AYNI olmalı; ayrışırsa
-- kullanıcı istemci kontrolünü geçip sunucudan ham hata alır (bir kez oldu).
--
-- storage.objects politikaları: INSERT yalnızca authenticated,
-- UPDATE/DELETE yalnızca owner = auth.uid().
-- =============================================================================
