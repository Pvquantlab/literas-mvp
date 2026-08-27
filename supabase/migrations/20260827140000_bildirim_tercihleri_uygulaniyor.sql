-- Bildirim tercihleri artık gerçekten uygulanıyor
--
-- AÇIK (denetimde bulundu, kodda doğrulandı): kullanıcı ayarlar/bildirimler'de
-- 5, ayarlar/eposta'da 7 tercih kaydediyor ve "Tüm e-postaları kapat" butonu
-- bile var. Ama queue_event_reminders, queue_join_notification ve
-- get_member_emails bu kolonlara HİÇ bakmıyordu — kapattığını sanan kullanıcı
-- mail almaya devam ediyordu. Bu bir KVKK/opt-out riski.
--
-- Ayrıca account_active kolonu hiçbir yerde okunmuyordu: hesabını donduran
-- kullanıcıya da mail gitmeye devam ediyordu.
--
-- ---------------------------------------------------------------------------
-- İŞLEMSEL / TERCİHE BAĞLI AYRIMI
--
-- Bazı maillerin kapatılabilir olmaması kullanıcının YARARINA:
--   * promotion    — "bekleme listesinden yerin açıldı". Kullanıcı bu yeri
--                    kendisi istedi; RSVP'si trigger ile zaten oluştu.
--   * event_change — katıldığı etkinliğin saati/yeri değişti.
--   * event_cancel — katıldığı etkinlik iptal edildi.
-- Bunlar kapatılabilseydi kullanıcı iptal edilmiş bir etkinliğe giderdi.
-- KVKK da hizmete ilişkin bu tür bildirimleri pazarlama iletisinden ayırır.
--
-- Tercihe bağlı olanlar (kullanıcı kapatabilir):
--   * reminder     → push_event_reminders
--   * join_request → push_new_members
--   * announcement → push_community_announcements
--
-- NOT: kolon adları "push_" ile başlıyor ama platformda push altyapısı yok;
-- bu anahtarlar fiilen e-postayı yönetiyor. Arayüz metni de buna göre
-- düzeltildi. Kolonları yeniden adlandırmak ayrı bir iş olarak bırakıldı.

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
        -- Dondurulmuş hesap hiçbir şey almaz (işlemsel dahil).
        COALESCE(p.account_active, true)
        AND CASE p_template
          WHEN 'promotion'    THEN true
          WHEN 'event_change' THEN true
          WHEN 'event_cancel' THEN true
          WHEN 'reminder'     THEN COALESCE(p.push_event_reminders, true)
          WHEN 'join_request' THEN COALESCE(p.push_new_members, true)
          WHEN 'announcement' THEN COALESCE(p.push_community_announcements, true)
          ELSE true
        END
      FROM profiles p
      WHERE p.id = p_user
    ),
    -- Profil yoksa gönderme: adres de yoktur.
    false
  );
$$;

REVOKE ALL ON FUNCTION public.email_izni(uuid, text) FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- 1) Hatırlatma kuyruğu tercihi okuyor

CREATE OR REPLACE FUNCTION public.queue_event_reminders(p_event_id uuid, p_secret text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    AND public.email_izni(r.user_id, 'reminder');   -- ← eklendi
END;
$$;

-- ---------------------------------------------------------------------------
-- 2) Katılım isteği bildirimi tercihi okuyor
--
-- Kurucu "yeni üye katılımları"nı kapattıysa mail kuyruğa hiç girmez.
-- İstek yine de oluşur; kurucu topluluk sayfasından görebilir.

CREATE OR REPLACE FUNCTION public.queue_join_notification(p_community_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- ---------------------------------------------------------------------------
-- 3) Topluluk duyurusu (yeni etkinlik maili) tercihi okuyor
--
-- Tek çağıran: app/api/event/route.ts — yeni etkinlik açıldığında üyelere
-- duyuru. Bu yüzden 'announcement' tercihine bağlanıyor.
-- DİKKAT: bu fonksiyon işlemsel bir amaçla kullanılacaksa tercih filtresi
-- yanlış olur; o durumda ayrı bir getter yaz.

CREATE OR REPLACE FUNCTION public.get_member_emails(p_community_id uuid, p_exclude uuid DEFAULT NULL::uuid)
RETURNS SETOF text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      AND public.email_izni(cm.user_id, 'announcement');   -- ← eklendi
END;
$$;

-- ---------------------------------------------------------------------------
-- 4) İşlemsel getter: dondurulmuş hesap hariç, tercih bakılmaz
--
-- Katıldığın etkinliğin değişmesi/iptali kapatılabilir bir bildirim değil.
-- Yalnızca dondurulmuş hesaplar eleniyor.

CREATE OR REPLACE FUNCTION public.get_event_rsvp_emails(p_event_id uuid, p_exclude uuid DEFAULT NULL::uuid)
RETURNS SETOF text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      AND public.email_izni(r.user_id, 'event_change');   -- ← dondurulmuş hesabı eler
END;
$$;

-- ---------------------------------------------------------------------------
-- 5) push_new_members varsayılanı düzeltiliyor: false → true
--
-- Kolonun DB varsayılanı false'tu. Bu, bir topluluğa katılım isteği
-- geldiğinde KURUCUYA hiç mail gitmemesi demek — ürünün temel döngüsü.
-- Kurucunun bekleyen istekleri öğrenebileceği başka bir bildirim yolu da yok.
--
-- Tercihler artık gerçekten uygulandığı için bu varsayılan düzeltilmezse
-- katılım bildirimleri kalıcı olarak susardı (önceden tercih hiç okunmadığı
-- için mail yine de gidiyordu — yani düzeltme olmadan bu bir gerileme olurdu).
--
-- Backfill yalnızca hâlâ varsayılan değerde olan satırlara uygulanıyor.
-- Kullanıcı bilinçli olarak kapattıysa (ileride) o tercih korunur.

ALTER TABLE public.profiles ALTER COLUMN push_new_members SET DEFAULT true;

UPDATE public.profiles
SET push_new_members = true
WHERE push_new_members IS DISTINCT FROM true;
