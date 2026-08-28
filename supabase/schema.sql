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
  is_admin boolean DEFAULT false
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
  attendee_count integer DEFAULT 0 NOT NULL
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
  created_at timestamp with time zone DEFAULT now()
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


-- -----------------------------------------------------------------------------
-- 5. KISITLAR
-- -----------------------------------------------------------------------------

ALTER TABLE public.app_secrets ADD CONSTRAINT app_secrets_pkey PRIMARY KEY (key);
ALTER TABLE public.communities ADD CONSTRAINT communities_pkey PRIMARY KEY (id);
ALTER TABLE public.community_drafts ADD CONSTRAINT community_drafts_pkey PRIMARY KEY (user_id);
ALTER TABLE public.community_members ADD CONSTRAINT community_members_pkey PRIMARY KEY (id);
ALTER TABLE public.community_topics ADD CONSTRAINT community_topics_pkey PRIMARY KEY (community_id, topic_id);
ALTER TABLE public.email_outbox ADD CONSTRAINT email_outbox_pkey PRIMARY KEY (id);
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
ALTER TABLE public.locations ADD CONSTRAINT locations_type_check CHECK ((type = ANY (ARRAY['il'::text, 'ilce'::text])));
ALTER TABLE public.profiles ADD CONSTRAINT profiles_contact_permission_check CHECK ((contact_permission = ANY (ARRAY['everyone'::text, 'community_members'::text, 'nobody'::text])));
ALTER TABLE public.profiles ADD CONSTRAINT profiles_gender_check CHECK ((gender = ANY (ARRAY['unspecified'::text, 'woman'::text, 'man'::text, 'non_binary'::text])));
ALTER TABLE public.profiles ADD CONSTRAINT profiles_profile_visibility_check CHECK ((profile_visibility = ANY (ARRAY['public'::text, 'private'::text])));
ALTER TABLE public.reports ADD CONSTRAINT reports_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'reviewed'::text, 'dismissed'::text, 'actioned'::text])));
ALTER TABLE public.reports ADD CONSTRAINT reports_target_type_check CHECK ((target_type = ANY (ARRAY['event'::text, 'community'::text, 'user'::text])));
ALTER TABLE public.topic_suggestions ADD CONSTRAINT topic_suggestions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])));

ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.communities ADD CONSTRAINT communities_founder_id_fkey FOREIGN KEY (founder_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.community_drafts ADD CONSTRAINT community_drafts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.community_members ADD CONSTRAINT community_members_community_id_fkey FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE;
ALTER TABLE public.community_members ADD CONSTRAINT community_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.community_topics ADD CONSTRAINT community_topics_community_id_fkey FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE;
ALTER TABLE public.community_topics ADD CONSTRAINT community_topics_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE;
ALTER TABLE public.events ADD CONSTRAINT events_community_id_fkey FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE;
ALTER TABLE public.events ADD CONSTRAINT events_organizer_id_fkey FOREIGN KEY (organizer_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.locations ADD CONSTRAINT locations_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES locations(id) ON DELETE CASCADE;
ALTER TABLE public.reports ADD CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.reports ADD CONSTRAINT reports_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);
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
CREATE INDEX IF NOT EXISTS events_search_vector_idx ON public.events USING gin (search_vector);
CREATE INDEX IF NOT EXISTS community_topics_topic_idx ON public.community_topics USING btree (topic_id);
CREATE INDEX IF NOT EXISTS idx_events_community_id ON public.events USING btree (community_id);
CREATE INDEX IF NOT EXISTS idx_events_reminder ON public.events USING btree (event_date) WHERE (reminder_sent_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_waitlist_promotion_pending ON public.waitlist USING btree (promoted_at) WHERE ((promoted_at IS NOT NULL) AND (promotion_email_sent_at IS NULL));
CREATE INDEX IF NOT EXISTS locations_parent_idx ON public.locations USING btree (parent_id);
CREATE INDEX IF NOT EXISTS locations_search_idx ON public.locations USING btree (search_text);
CREATE INDEX IF NOT EXISTS locations_type_idx ON public.locations USING btree (type);
CREATE INDEX IF NOT EXISTS reports_status_idx ON public.reports USING btree (status, created_at DESC);
CREATE INDEX IF NOT EXISTS reports_target_idx ON public.reports USING btree (target_type, target_id);
CREATE UNIQUE INDEX IF NOT EXISTS reports_unique_reporter_target ON public.reports USING btree (reporter_id, target_type, target_id);
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
SELECT id, name, username, bio, avatar_url, location, created_at
FROM profiles
WHERE COALESCE(account_active, true)
  AND (COALESCE(profile_visibility, 'public'::text) = 'public'::text
       OR id = auth.uid()
       OR is_admin());


-- -----------------------------------------------------------------------------
-- 10. RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;
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
GRANT SELECT ON TABLE public.profiles, public.rsvps, public.community_drafts,
  public.topic_suggestions TO authenticated;
GRANT SELECT ON TABLE public.profiles TO anon;

GRANT INSERT, UPDATE, DELETE ON TABLE public.communities, public.events TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.community_members, public.community_topics,
  public.community_drafts, public.rsvps TO authenticated;
GRANT INSERT ON TABLE public.topic_suggestions TO authenticated;

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


-- -----------------------------------------------------------------------------
-- 13. REALTIME
-- -----------------------------------------------------------------------------
-- Katılımcı listesi events.attendee_count UPDATE'ini dinliyor (rsvps değil —
-- kimin nereye kayıtlı olduğu yayınlanmasın diye).
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
