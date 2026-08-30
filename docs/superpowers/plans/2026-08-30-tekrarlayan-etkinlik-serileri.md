# Tekrarlayan Etkinlik Serileri — Uygulama Planı

> **Ajan işçiler için:** ZORUNLU ALT SKILL: Bu planı görev görev uygulamak için
> superpowers:subagent-driven-development (önerilen) ya da
> superpowers:executing-plans kullan. Adımlar takip için checkbox (`- [ ]`)
> söz dizimi kullanıyor.

**Hedef:** Her salı buluşan bir topluluğun organizatörü buluşmayı bir kez
kursun; N tekrar tek işlemde oluşsun, listelerde tek kart görünsün ve
"bu tekrar / bundan sonrakiler / tümü" kapsamlarıyla yönetilsin.

**Mimari:** Her tekrar ayrı bir `events` satırı (materyalize). Bu sayede
`check_rsvp_capacity`, `sync_attendee_count`, `promote_from_waitlist`,
`checkin_yap`, `queue_event_reminders` ve dört RLS politikası **hiç
değişmiyor.** Yazma tarafı dört yeni `SECURITY DEFINER` fonksiyonla, okuma
tarafı tek bir `security_invoker` view ile çözülüyor. `events` üzerindeki
tablo bazlı yazma yetkisi kolon bazlıya indiriliyor.

**Teknoloji:** Next.js 16 App Router, TypeScript, Supabase Postgres + RLS,
zod v4, Resend, Upstash rate limit.

**Spec:** `docs/superpowers/specs/2026-08-30-tekrarlayan-etkinlik-serileri-design.md`

## Global Kısıtlar

Her görevin gereksinimleri bu bölümü kapsar.

- Kullanıcıya görünen **TÜM** metin Türkçe.
- **Bu projede test koşucusu YOK** (jest/vitest/playwright/cypress hiçbiri;
  tek bir `*.test.*` dosyası bile yok). Test dosyası yazma, `npm test` yazma.
  Doğrulama üç yoldan: (a) SQL için geri sarılan `DO $test$ … RAISE
  EXCEPTION 'TEST SONUCU >>> %'` bloğu, (b) uygulama için
  `npm run typecheck && npm run lint && npm run build`, (c) elle senaryo.
- `npm run lint` komutu **`eslint .`** — `next lint` Next 16'da kaldırıldı.
  Lint tabanı **87 uyarı / 0 hata**; görev uyarı sayısını artırmamalı.
  `@typescript-eslint/no-explicit-any` uyarı (hata değil); kullanılmayan
  parametre `_` önekiyle bilinçli sayılır.
- Her API rotası ve server action: `auth.getUser()` → rate limit → zod →
  yetki kontrolü. **İstisna:** `app/api/event/[id]/route.ts` PATCH'i zod'u
  auth'tan önce koşturuyor (satır 81 vs 90); mevcut sıra **korunur**, bu
  planın işi değil.
- E-posta HTML'inde **her** değişken `escapeHtml()` ile kaçırılır. Konu
  satırı istisnadır (HTML değil).
- **E-posta gövdesinde `var(--…)` YASAK.** Mail istemcileri CSS değişkeni
  okumaz; mevcut tüm şablonlar sabit hex kullanıyor (`#B8541A`, `#1F4A3D`,
  `#1F2A24`). CLAUDE.md kural 6 mail HTML'inde geçerli değildir.
- `service_role` anahtarı **hiçbir yerde** kullanılmaz.
- Yeni tablo/kolon = migration dosyası + RLS politikası + gerekli index.
- **Her yeni SQL fonksiyonu için `REVOKE ALL ON FUNCTION … FROM PUBLIC;`**
  yazılır. Postgres'te yeni fonksiyon PUBLIC'e EXECUTE ile doğar; yalnızca
  `GRANT EXECUTE TO authenticated` yazmak koruma **değildir**.
- Yeni fonksiyonların hepsinde `SET search_path = public, pg_temp`
  (`checkin_yap` kalıbı, schema.sql:870). Mevcut mail/cron fonksiyonları
  `SET search_path TO 'public'` yazıyor — **onlara dokunulmuyor**, ama yeni
  yazılan her şey tek yazımda olacak ve migration ile `schema.sql` **aynı**
  yazımı taşıyacak.
- Tarih/saat yalnızca `lib/date.ts` üzerinden. Çıplak `toLocaleDateString` /
  `toISOString` yasak (Vercel UTC'de koşuyor, saat 3 saat kayıyor).
  **İstisna:** `app/api/cron/reminders/route.ts` kendi `formatTr`ini
  kullanıyor (timeZone açık verilmiş) — cron içinde onu çağır, yenisini yazma.
- `vercel.json`'a yorum ya da bilinmeyen anahtar **ekleme** — Vercel şema
  hatasıyla reddediyor, deploy build başlamadan kırılıyor. Cron sıklığı bu
  planın **kapsamı dışında**; `schedule` değerine dokunma.
- `escapeHtml` üç yerde yaşıyor (`lib/email.ts:23` export, cron:9 yerel kopya,
  `event/[id]/route.ts:9` yerel kopya). **Yerel kopyaları import'a çevirme** —
  görev dışı değişiklik.
- Tek görev = tek commit ölçeği. Görev dışına taşan "iyileştirme" yapma.

### Sabitler (birebir kullanılacak)

```ts
const TEKRAR_ALT = 2       // en az tekrar sayısı
const TEKRAR_UST = 26      // en çok tekrar sayısı (haftalık yarım yıl)
const KUYRUK_TAVANI = 200  // claim_email_outbox LIMIT 200 ile aynı
```

Frekans değerleri birebir: `'haftalik' | 'iki_haftalik' | 'aylik'`.
Kapsam değerleri birebir: `'tek' | 'sonrakiler' | 'tumu'`.

### Sözleşmeler — bozulursa sessizce kırılır

| Sözleşme | Nerede | Neden |
|---|---|---|
| `POST /api/event` → `{ ok: true, event }` | `route.ts:142` | Form `data.event.id` okuyor (`new-event-form.tsx:59`) |
| `PATCH` → `{ ok: true, event }` | `route.ts:194` | İstemci yalnızca `res.ok`'a bakıyor; gövdeye eklemek geriye uyumlu |
| `DELETE` gövdeyi **okumuyor** | `route.ts:196` | `kapsam` **query string**'den geçmeli |
| `email_izni` `ELSE true` dalı | `schema.sql:589` | Uydurulan şablon adı bildirim tercihini **atlar** |
| `buildMail` yalnızca `reminder`/`promotion`/`join_request` tanıyor | cron `route.ts:114-126` | Tanımadığı şablonu **sessizce atar**; kuyruğa yazan her yeni şablon aynı adımda buraya dal ekler |
| `eventEditSchema`, `eventSchema` **üstüne** kurulu | `validations.ts:77` | `eventSchema`'ya alan eklemek `eventEditSchema`'ya sızar |
| `cover_image_url` üç durumlu (undefined = **dokunma**) | `route.ts:121` | RPC'de "NULL = dokunma" semantiği bu ayrımı yok eder → ayrı bayrak şart |
| Cron **anon** istemciyle koşuyor, `auth.uid()` NULL | cron `route.ts` | `get_member_emails`/`get_event_rsvp_emails` cron'dan **çağrılamaz** |

---

## Dosya Yapısı

| Dosya | Sorumluluk |
|---|---|
| `supabase/migrations/20260830120000_seri_tablo_ve_yetkiler.sql` | `event_series`, `events` kolonları, kısıtlar, indeksler, RLS, kolon bazlı yetkiler |
| `supabase/migrations/20260830120100_seri_yazma_fonksiyonlari.sql` | `seri_olustur`, `etkinlik_guncelle` |
| `supabase/migrations/20260830120200_seri_toplu_fonksiyonlar.sql` | `seri_guncelle` (bölme dahil), `seri_sil` |
| `supabase/migrations/20260830120300_etkinlik_vitrin.sql` | `etkinlik_vitrin` view, `seri_kalanlar` |
| `lib/validations.ts` *(değişecek)* | `seriOlusturSchema`, `eventEditSchema`'ya `kapsam` |
| `app/api/event/route.ts` *(değişecek)* | seri dalı + seri duyuru maili |
| `app/api/event/[id]/route.ts` *(değişecek)* | `etkinlik_guncelle` RPC'ye geçiş, `kapsam` dalları |
| `app/event/new/new-event-form.tsx` *(değişecek)* | tekrar alanları + `istek_id` |
| `app/event/[id]/edit/edit-event-form.tsx` *(değişecek)* | kapsam seçici, toplu kapsamda kilitli tarih |
| `app/event/[id]/event-actions.tsx` *(değişecek)* | silme kapsam seçici |
| `components/event-card.tsx` *(değişecek)* | seri rozeti |
| `app/event/[id]/page.tsx` *(değişecek)* | künye "Seri" satırı, aynı seriyi eleme |
| `app/page.tsx`, `app/kesfet/page.tsx`, `app/sitemap.ts` *(değişecek)* | `etkinlik_vitrin`'e geçiş |
| `app/community/[id]/page.tsx` *(değişecek)* | view + LIMIT + **ayrı takvim sorgusu** + sayaç |
| `app/api/cron/reminders/route.ts` *(değişecek)* | `buildMail` dalları + kuyruk tavanı alarmı |
| `supabase/schema.sql` *(değişecek)* | baseline |
| `literas-yol-haritasi.md`, `CLAUDE.md` *(değişecek)* | madde işaretlenir |

---

## Görev 1: Veritabanı — tablo, kolonlar, kısıtlar, yetkiler

**Dosyalar:**
- Oluştur: `supabase/migrations/20260830120000_seri_tablo_ve_yetkiler.sql`

**Arayüzler:**
- Tüketir: `public.topluluk_yoneticisi_mi(uuid)`, `public.is_admin()` (ikisi de mevcut)
- Üretir:
  - tablo `public.event_series(id uuid, community_id uuid, organizer_id uuid, frekans text, baslangic timestamptz, tekrar_sayisi int, istek_id uuid, created_at timestamptz)`
  - `public.events` üzerinde dört yeni kolon: `series_id uuid`, `occurrence_index int`, `updated_at timestamptz`, `seri_disina_alindi_at timestamptz`
  - kısıt `events_seri_tarih_benzersiz UNIQUE (series_id, event_date)`
  - indeksler: `event_series_istek_benzersiz`, `idx_events_series`, `idx_events_date`, `idx_events_community_date`, `idx_rsvps_user`

- [ ] **Adım 1: Yetki testini ÖNCE yaz ve başarısız olduğunu gör**

Bu SQL'i Supabase SQL konsolunda çalıştır. Şu an `event_series` tablosu
olmadığı için hata vermeli.

```sql
DO $test$
DECLARE
  v_kullanici uuid;
  r_seri_yazar   text := 'HAYIR';
  r_events_series_yazar text := 'HAYIR';
  r_iz_silinir   text := 'HAYIR';
  v_event uuid;
BEGIN
  SELECT id INTO v_kullanici FROM profiles LIMIT 1;
  IF v_kullanici IS NULL THEN RAISE EXCEPTION 'TEST KURULAMADI: profil yok'; END IF;
  SELECT id INTO v_event FROM events LIMIT 1;
  IF v_event IS NULL THEN RAISE EXCEPTION 'TEST KURULAMADI: etkinlik yok'; END IF;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_kullanici)::text, true);
  SET LOCAL ROLE authenticated;

  -- 1) event_series'e doğrudan yazamamalı
  BEGIN
    INSERT INTO event_series (community_id, organizer_id, frekans, baslangic, tekrar_sayisi)
    SELECT c.id, v_kullanici, 'haftalik', now() + interval '1 day', 4
      FROM communities c LIMIT 1;
    r_seri_yazar := 'EVET';
  EXCEPTION WHEN OTHERS THEN r_seri_yazar := 'HAYIR';
  END;

  -- 2) events.series_id'yi doğrudan yazamamalı (kolon yetkisi)
  BEGIN
    UPDATE events SET series_id = gen_random_uuid() WHERE id = v_event;
    r_events_series_yazar := 'EVET';
  EXCEPTION WHEN OTHERS THEN r_events_series_yazar := 'HAYIR';
  END;

  -- 3) düzenleme izini temizleyememeli
  BEGIN
    UPDATE events SET seri_disina_alindi_at = NULL WHERE id = v_event;
    r_iz_silinir := 'EVET';
  EXCEPTION WHEN OTHERS THEN r_iz_silinir := 'HAYIR';
  END;

  RESET ROLE;
  RAISE EXCEPTION 'TEST SONUCU >>> seri_yazar=% | events_series_yazar=% | iz_silinir=%',
    r_seri_yazar, r_events_series_yazar, r_iz_silinir;
END;
$test$;
```

Beklenen (migration'dan ÖNCE): `relation "event_series" does not exist`
ya da `column "series_id" does not exist` hatası. Bu, testin gerçekten
yeni davranışı ölçtüğünün kanıtı.

- [ ] **Adım 2: Migration dosyasını yaz**

```sql
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
```

- [ ] **Adım 3: Migration'ı uygula**

Supabase SQL konsolunda dosyanın tamamını çalıştır. Hata vermemeli.

- [ ] **Adım 4: Adım 1'deki testi tekrar çalıştır**

Beklenen: `TEST SONUCU >>> seri_yazar=HAYIR | events_series_yazar=HAYIR |
iz_silinir=HAYIR`

Üçünden biri `EVET` çıkarsa yetki bloğu çalışmamıştır. En olası sebep:
`REVOKE`, `GRANT`'ten sonra yazılmış ya da kolonsuz `REVOKE` kolon ACL'ini
silmiş. Sırayı kontrol et.

- [ ] **Adım 5: Normal yazmanın hâlâ çalıştığını doğrula**

Kolon yetkisi fazla daraltılmış olabilir; mevcut akış kırılmamalı.

```sql
DO $test$
DECLARE
  v_kullanici uuid; v_top uuid; v_yeni uuid;
  r_insert text := 'HAYIR'; r_update text := 'HAYIR';
BEGIN
  SELECT cm.user_id, cm.community_id INTO v_kullanici, v_top
    FROM community_members cm JOIN communities c ON c.id = cm.community_id
   WHERE cm.status='approved' AND cm.role IN ('founder','admin')
     AND c.status='approved' LIMIT 1;
  IF v_kullanici IS NULL THEN RAISE EXCEPTION 'TEST KURULAMADI: yonetici yok'; END IF;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_kullanici)::text, true);
  SET LOCAL ROLE authenticated;

  BEGIN
    INSERT INTO events (title, description, location, event_date, organizer_id,
                        community_id, max_attendees)
    VALUES ('yetki denemesi', 'govde', 'bir yer', now() + interval '7 day',
            v_kullanici, v_top, 10)
    RETURNING id INTO v_yeni;
    r_insert := 'EVET';
  EXCEPTION WHEN OTHERS THEN r_insert := 'HAYIR: ' || SQLERRM;
  END;

  IF v_yeni IS NOT NULL THEN
    BEGIN
      UPDATE events SET title = 'yetki denemesi 2', location = 'baska yer'
       WHERE id = v_yeni;
      r_update := 'EVET';
    EXCEPTION WHEN OTHERS THEN r_update := 'HAYIR: ' || SQLERRM;
    END;
  END IF;

  RESET ROLE;
  RAISE EXCEPTION 'TEST SONUCU >>> insert=% | update=%', r_insert, r_update;
END;
$test$;
```

Beklenen: `insert=EVET | update=EVET`. (`RAISE` işlemi geri sardığı için
deneme satırı kalmaz.)

- [ ] **Adım 6: Kalıntı olmadığını doğrula**

```sql
select count(*) as kalinti from public.events where title like 'yetki denemesi%';
```

Beklenen: `0`.

- [ ] **Adım 7: Commit**

```bash
git add supabase/migrations/20260830120000_seri_tablo_ve_yetkiler.sql
git commit -m "seri: tablo, kolonlar, kisitlar ve kolon bazli yetkiler"
```

---
## Görev 2: Veritabanı — `seri_olustur` ve `etkinlik_guncelle`

**Dosyalar:**
- Oluştur: `supabase/migrations/20260830120100_seri_yazma_fonksiyonlari.sql`

**Arayüzler:**
- Tüketir: Görev 1'in tablosu ve kolonları; `topluluk_yoneticisi_mi(uuid)`,
  `etkinlik_yoneticisi_mi(uuid)` (ikisi de mevcut, schema.sql:813 ve 830)
- Üretir:
  - `public.seri_olustur(p_community_id uuid, p_title text, p_description text, p_location text, p_baslangic timestamptz, p_frekans text, p_tekrar_sayisi int, p_max_attendees int, p_cover_image_url text, p_istek_id uuid) RETURNS TABLE (series_id uuid, ilk_event_id uuid, uretilen int)`
  - `public.etkinlik_guncelle(p_event_id uuid, p_title text, p_description text, p_location text, p_event_date timestamptz, p_max_attendees int, p_cover_image_url text, p_kapak_degissin boolean) RETURNS TABLE (guncellendi boolean, iz_yazildi boolean)`

**Neden `etkinlik_guncelle` gerekiyor:** Spec Karar 4'ün ön koşulu "izsiz
'tümü' kapsamı açılmayacak". Bugünkü tekil düzenleme yolu
(`app/api/event/[id]/route.ts:125-130`) kullanıcının kendi oturumuyla düz
`.from('events').update(patch)` çağırıyor ve `seri_disina_alindi_at` Görev
1'den sonra kolon yetkisi listesinde **yok**. Olduğu gibi bırakılırsa ya her
tekil düzenleme 42501 ile 500 döner ya da iz hiç yazılmaz ve `tumu` elle
düzeltilmiş buluşmaları sessizce ezer.

- [ ] **Adım 1: Testi ÖNCE yaz ve başarısız olduğunu gör**

```sql
DO $test$
DECLARE
  v_kullanici uuid; v_top uuid;
  r_seri text := 'HAYIR'; r_ikizlenme text := 'HAYIR';
  v_istek uuid := gen_random_uuid();
  v_s1 uuid; v_s2 uuid; v_sayi int;
BEGIN
  SELECT cm.user_id, cm.community_id INTO v_kullanici, v_top
    FROM community_members cm JOIN communities c ON c.id = cm.community_id
   WHERE cm.status='approved' AND cm.role IN ('founder','admin')
     AND c.status='approved' LIMIT 1;
  IF v_kullanici IS NULL THEN RAISE EXCEPTION 'TEST KURULAMADI: yonetici yok'; END IF;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_kullanici)::text, true);
  SET LOCAL ROLE authenticated;

  SELECT s.series_id INTO v_s1 FROM public.seri_olustur(
    v_top, 'seri denemesi', 'govde', 'bir yer',
    (now() + interval '7 day')::timestamptz, 'haftalik', 4, 10, NULL, v_istek) s;
  SELECT count(*) INTO v_sayi FROM events WHERE series_id = v_s1;
  IF v_sayi = 4 THEN r_seri := 'EVET(4)'; ELSE r_seri := 'HAYIR(' || v_sayi || ')'; END IF;

  -- Ayni istek_id ile ikinci cagri YENI seri uretmemeli
  SELECT s.series_id INTO v_s2 FROM public.seri_olustur(
    v_top, 'seri denemesi', 'govde', 'bir yer',
    (now() + interval '7 day')::timestamptz, 'haftalik', 4, 10, NULL, v_istek) s;
  IF v_s2 = v_s1 THEN r_ikizlenme := 'KORUNDU'; ELSE r_ikizlenme := 'IKIZLENDI'; END IF;

  RESET ROLE;
  RAISE EXCEPTION 'TEST SONUCU >>> seri=% | ikizlenme=%', r_seri, r_ikizlenme;
END;
$test$;
```

Beklenen (migration'dan ÖNCE): `function public.seri_olustur(...) does not
exist`.

- [ ] **Adım 2: Migration dosyasını yaz**

```sql
-- Tekrarlayan etkinlik serileri — 2/4: yazma fonksiyonları.
--
-- SECURITY DEFINER, events UPDATE/DELETE politikalarını (schema.sql:1047-1061)
-- TAMAMEN atlar. Görev 1'de yazma kolon bazlıya indirildiği için bu fonksiyonlar
-- tek yazma yolu; dolayısıyla FONKSİYON İÇİ YETKİ KONTROLÜ TEK SAVUNMA
-- KATMANIDIR. series_id anon'a bile okunabilir olduğundan hedef uuid'yi bulmak
-- zahmetsiz.

-- -----------------------------------------------------------------------------
-- 1. seri_olustur — tek işlem, N tekrar
-- -----------------------------------------------------------------------------
-- Neden tek RPC: POST /api/event "strict" rate limitte (dakikada 3, lib/rate-
-- limit.ts). Seri N ayrı POST ile kurulamaz — 4. tekrarda 429 alır, yarım kalır
-- ve geri alma yoktur.
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
RETURNS TABLE (series_id uuid, ilk_event_id uuid, uretilen int)
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
      RETURN QUERY SELECT v_series, v_ilk, v_sayac;
      RETURN;
    END IF;
  END IF;

  INSERT INTO event_series (community_id, organizer_id, frekans, baslangic,
                            tekrar_sayisi, istek_id)
  VALUES (p_community_id, auth.uid(), p_frekans, p_baslangic,
          p_tekrar_sayisi, p_istek_id)
  RETURNING id INTO v_series;

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

  RETURN QUERY SELECT v_series, v_ilk, p_tekrar_sayisi;
END;
$function$;

-- -----------------------------------------------------------------------------
-- 2. etkinlik_guncelle — tekil düzenleme + elle düzenleme izi
-- -----------------------------------------------------------------------------
-- Yetki topluluk_yoneticisi_mi ile ÇÖZÜLEMEZ: events.community_id NULLABLE,
-- yani topluluğa bağlı olmayan etkinliklerde kontrol boşa düşerdi.
-- etkinlik_yoneticisi_mi (schema.sql:830) checkCanManage()'in birebir DB
-- karşılığı: organizatör VEYA topluluğun onaylı founder/admin'i.
--
-- p_kapak_degissin: cover_image_url ÜÇ DURUMLU (route.ts:121). Alan gövdede
-- yoksa kapak DOKUNULMAZ, boş/null ise kaldırılır, URL ise değişir. Tek bir
-- text parametre bu üç durumu taşıyamaz — "NULL = dokunma" deseydik kapağı
-- kaldırmak imkânsız olurdu.
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

  -- Damga GERÇEK farka bağlı ve ALTI alana birden bakıyor. route.ts:138-147'deki
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

-- -----------------------------------------------------------------------------
-- 3. Fonksiyon yetkileri
-- -----------------------------------------------------------------------------
-- Postgres'te yeni fonksiyon PUBLIC'e EXECUTE ile doğar. Yalnızca GRANT yazmak
-- koruma DEĞİLDİR — REVOKE olmadan anon da çağırabilir. (schema.sql:1201 civarı,
-- 20 fonksiyonda uygulanmış.)
REVOKE ALL ON FUNCTION public.seri_olustur(uuid, text, text, text, timestamptz,
  text, int, int, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seri_olustur(uuid, text, text, text, timestamptz,
  text, int, int, text, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.etkinlik_guncelle(uuid, text, text, text,
  timestamptz, int, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.etkinlik_guncelle(uuid, text, text, text,
  timestamptz, int, text, boolean) TO authenticated;

-- anon'a hiçbirinde EXECUTE verilmiyor.
```

- [ ] **Adım 3: Migration'ı uygula ve Adım 1'in testini tekrar çalıştır**

Beklenen: `TEST SONUCU >>> seri=EVET(4) | ikizlenme=KORUNDU`

- [ ] **Adım 4: Yetki ve iz testini çalıştır**

```sql
DO $test$
DECLARE
  v_yabanci uuid; v_event uuid; v_seri_event uuid;
  r_yabanci text := 'HAYIR'; r_anon_exec text := 'HAYIR';
  r_iz text := 'HAYIR'; r_bos_kaydet text := 'HAYIR';
  v_g boolean; v_iz boolean; v_damga timestamptz;
BEGIN
  SELECT e.id INTO v_event FROM events e WHERE e.series_id IS NULL LIMIT 1;
  SELECT p.id INTO v_yabanci FROM profiles p
   WHERE p.id <> (SELECT organizer_id FROM events WHERE id = v_event)
     AND NOT EXISTS (SELECT 1 FROM community_members cm
                      WHERE cm.user_id = p.id
                        AND cm.community_id = (SELECT community_id FROM events WHERE id = v_event))
   LIMIT 1;
  IF v_event IS NULL OR v_yabanci IS NULL THEN
    RAISE EXCEPTION 'TEST KURULAMADI: uygun etkinlik/yabanci yok';
  END IF;

  -- Yabanci duzenleyememeli
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_yabanci)::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN
    PERFORM public.etkinlik_guncelle(v_event, 'ele gecirildi', NULL, 'x',
                                     now() + interval '3 day', NULL, NULL, false);
    r_yabanci := 'EVET';
  EXCEPTION WHEN OTHERS THEN r_yabanci := 'HAYIR';
  END;
  RESET ROLE;

  -- anon EXECUTE alamamali
  SET LOCAL ROLE anon;
  BEGIN
    PERFORM public.seri_olustur(gen_random_uuid(), 't', NULL, 'y',
      now() + interval '1 day', 'haftalik', 2, NULL, NULL, NULL);
    r_anon_exec := 'EVET';
  EXCEPTION WHEN OTHERS THEN r_anon_exec := 'HAYIR';
  END;
  RESET ROLE;

  -- Seri uyesini organizatoru olarak duzenle: iz yazilmali
  SELECT e.id INTO v_seri_event FROM events e WHERE e.series_id IS NOT NULL LIMIT 1;
  IF v_seri_event IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', (SELECT organizer_id FROM events WHERE id = v_seri_event))::text, true);
    SET LOCAL ROLE authenticated;

    -- Yalnizca aciklamayi degistir: damga YAZILMALI
    SELECT g.guncellendi, g.iz_yazildi INTO v_g, v_iz
      FROM public.etkinlik_guncelle(v_seri_event,
        (SELECT title FROM events WHERE id = v_seri_event),
        'yepyeni aciklama',
        (SELECT location FROM events WHERE id = v_seri_event),
        (SELECT event_date FROM events WHERE id = v_seri_event),
        (SELECT max_attendees FROM events WHERE id = v_seri_event),
        NULL, false) g;
    SELECT seri_disina_alindi_at INTO v_damga FROM events WHERE id = v_seri_event;
    IF v_g AND v_damga IS NOT NULL THEN r_iz := 'EVET'; END IF;

    -- Hicbir sey degistirmeden tekrar cagir: guncellendi=false olmali
    SELECT g.guncellendi INTO v_g
      FROM public.etkinlik_guncelle(v_seri_event,
        (SELECT title FROM events WHERE id = v_seri_event),
        (SELECT description FROM events WHERE id = v_seri_event),
        (SELECT location FROM events WHERE id = v_seri_event),
        (SELECT event_date FROM events WHERE id = v_seri_event),
        (SELECT max_attendees FROM events WHERE id = v_seri_event),
        NULL, false) g;
    IF NOT v_g THEN r_bos_kaydet := 'DEGISMEDI'; ELSE r_bos_kaydet := 'BOSUNA YAZDI'; END IF;
    RESET ROLE;
  END IF;

  RAISE EXCEPTION 'TEST SONUCU >>> yabanci=% | anon_exec=% | iz=% | bos_kaydet=%',
    r_yabanci, r_anon_exec, r_iz, r_bos_kaydet;
END;
$test$;
```

Beklenen: `yabanci=HAYIR | anon_exec=HAYIR | iz=EVET | bos_kaydet=DEGISMEDI`

- [ ] **Adım 5: Aylık frekansın ay sonuna düştüğünü doğrula**

```sql
select (('2026-01-31 19:00+03'::timestamptz AT TIME ZONE 'Europe/Istanbul')
        + (interval '1 month' * 1)) AT TIME ZONE 'Europe/Istanbul' as subat,
       (('2026-01-31 19:00+03'::timestamptz AT TIME ZONE 'Europe/Istanbul')
        + (interval '1 month' * 2)) AT TIME ZONE 'Europe/Istanbul' as mart;
```

Beklenen: `subat = 2026-02-28 19:00+03`, `mart = 2026-03-31 19:00+03`.
Mart'ın 31'e dönmesi, çarpımın her zaman başlangıçtan yapıldığının kanıtı —
adım adım eklenseydi 28 Mart'a kayardı.

- [ ] **Adım 6: Commit**

```bash
git add supabase/migrations/20260830120100_seri_yazma_fonksiyonlari.sql
git commit -m "seri: seri_olustur ve etkinlik_guncelle fonksiyonlari"
```

---
## Görev 3: Veritabanı — `seri_guncelle` (bölme dahil) ve `seri_sil`

**Dosyalar:**
- Oluştur: `supabase/migrations/20260830120200_seri_toplu_fonksiyonlar.sql`

**Arayüzler:**
- Tüketir: Görev 1 ve 2
- Üretir:
  - `public.seri_guncelle(p_series_id uuid, p_kapsam text, p_from timestamptz, p_title text, p_description text, p_location text, p_max_attendees int, p_cover_image_url text, p_kapak_degissin boolean) RETURNS TABLE (guncellenen int, atlanan int, yeni_series_id uuid, bildirilen int)`
  - `public.seri_sil(p_series_id uuid, p_kapsam text, p_from timestamptz) RETURNS TABLE (silinen int, bildirilen int)`

**Spec'ten bilinçli sapma — "NULL = dokunma" kuralı kullanılmıyor.** Spec
`seri_guncelle` için "NULL parametre bu kolona dokunma demektir" diyordu. Bu
`description`'ı gerçekten temizlemeyi imkânsız kılar ve düzenleme formu zaten
**bütün alanları gönderiyor** (`eventEditSchema` hepsini zorunlu tutuyor,
`validations.ts:77`). Bu yüzden toplu kapsam beş alanın hepsini yazar; üç
durumlu tek alan olan `cover_image_url` için `p_kapak_degissin` bayrağı
kullanılır — tekil yoldaki (`etkinlik_guncelle`) davranışın aynısı.

**`event_date` toplu kapsamda YAZILMAZ.** İmzada bile yok. Yazılsaydı
`UNIQUE (series_id, event_date)` yüzünden her seri ikinci satırda 23505 alır
ve işlem tamamen geri dönerdi.

- [ ] **Adım 1: Testi ÖNCE yaz ve başarısız olduğunu gör**

```sql
DO $test$
DECLARE
  v_kullanici uuid; v_top uuid; v_seri uuid; v_pivot uuid; v_ilk uuid;
  v_yeni uuid; v_gun int; v_atl int;
  r_atlama text := 'HAYIR'; r_bolme text := 'HAYIR'; r_gecmis text := 'HAYIR';
  v_gecmis_baslik text;
BEGIN
  SELECT cm.user_id, cm.community_id INTO v_kullanici, v_top
    FROM community_members cm JOIN communities c ON c.id = cm.community_id
   WHERE cm.status='approved' AND cm.role IN ('founder','admin')
     AND c.status='approved' LIMIT 1;
  IF v_kullanici IS NULL THEN RAISE EXCEPTION 'TEST KURULAMADI: yonetici yok'; END IF;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_kullanici)::text, true);
  SET LOCAL ROLE authenticated;

  SELECT s.series_id INTO v_seri FROM public.seri_olustur(
    v_top, 'toplu deneme', 'govde', 'ilk yer',
    (now() + interval '7 day')::timestamptz, 'haftalik', 6, 10, NULL,
    gen_random_uuid()) s;

  -- Gecmis bir tekrar uydur (dogrudan yazilamaz; DEFINER disinda test icin
  -- rolu birakip yaziyoruz)
  RESET ROLE;
  SELECT id INTO v_ilk FROM events WHERE series_id = v_seri ORDER BY event_date LIMIT 1;
  UPDATE events SET event_date = now() - interval '2 day' WHERE id = v_ilk;
  SELECT title INTO v_gecmis_baslik FROM events WHERE id = v_ilk;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_kullanici)::text, true);
  SET LOCAL ROLE authenticated;

  -- Bir tekrari elle duzenle (iz birakir)
  SELECT id INTO v_pivot FROM events
   WHERE series_id = v_seri AND event_date >= now() ORDER BY event_date LIMIT 1;
  PERFORM public.etkinlik_guncelle(v_pivot,
    (SELECT title FROM events WHERE id = v_pivot), 'elle degistirildi',
    (SELECT location FROM events WHERE id = v_pivot),
    (SELECT event_date FROM events WHERE id = v_pivot), NULL, NULL, false);

  -- kapsam=tumu: elle duzenleneni ATLAMALI, gecmise DOKUNMAMALI
  SELECT g.guncellenen, g.atlanan INTO v_gun, v_atl
    FROM public.seri_guncelle(v_seri, 'tumu', NULL, 'toplu deneme',
                              'govde', 'YENI YER', 10, NULL, false) g;
  IF v_atl = 1 THEN r_atlama := 'EVET'; ELSE r_atlama := 'HAYIR(' || v_atl || ')'; END IF;
  IF (SELECT location FROM events WHERE id = v_ilk) <> 'YENI YER'
     THEN r_gecmis := 'KORUNDU'; ELSE r_gecmis := 'EZILDI'; END IF;

  -- kapsam=sonrakiler: seriyi BOLMELI
  SELECT g.yeni_series_id INTO v_yeni
    FROM public.seri_guncelle(v_seri, 'sonrakiler',
      (SELECT event_date FROM events WHERE series_id = v_seri
        AND event_date >= now() ORDER BY event_date OFFSET 2 LIMIT 1),
      'BOLUNMUS BASLIK', 'govde', 'YENI YER', 10, NULL, false) g;
  IF v_yeni IS NOT NULL AND v_yeni <> v_seri THEN r_bolme := 'EVET'; END IF;

  RESET ROLE;
  RAISE EXCEPTION 'TEST SONUCU >>> atlama=% | gecmis=% | bolme=%',
    r_atlama, r_gecmis, r_bolme;
END;
$test$;
```

Beklenen (migration'dan ÖNCE): `function public.seri_guncelle(...) does not exist`.

- [ ] **Adım 2: Migration dosyasını yaz**

```sql
-- Tekrarlayan etkinlik serileri — 3/4: toplu güncelleme ve silme.

-- -----------------------------------------------------------------------------
-- 1. seri_guncelle — iki toplu kapsam
-- -----------------------------------------------------------------------------
-- 'sonrakiler' SERİYİ BÖLER: pivot ve sonrası yeni bir event_series satırına
-- taşınır (Google Takvim davranışı). Bölmeseydik iki yarı tek kart olarak
-- katlanır, temsilci en yakın tekrar olurdu ve YENİ BAŞLIKLA ARAMA HİÇ SONUÇ
-- VERMEZDİ. Bölünce iki yarı ayrı ayrı katlanır ve ikisi de aranabilir.
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
RETURNS TABLE (guncellenen int, atlanan int, yeni_series_id uuid, bildirilen int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
DECLARE
  v_com uuid;
  v_from timestamptz;
  v_yeni uuid;
  v_tasinan int;
  v_gun int := 0;
  v_atl int := 0;
  v_bildirilen int := 0;
  v_idler uuid[];
BEGIN
  -- TEK SAVUNMA KATMANI. SECURITY DEFINER events politikalarını atlıyor;
  -- p_series_id istemciden geliyor ve series_id anon'a bile okunabilir.
  SELECT community_id INTO v_com FROM event_series WHERE id = p_series_id;
  IF v_com IS NULL THEN RAISE EXCEPTION 'seri bulunamadi'; END IF;
  IF NOT public.topluluk_yoneticisi_mi(v_com) THEN RAISE EXCEPTION 'yetkisiz'; END IF;

  IF p_kapsam NOT IN ('sonrakiler','tumu') THEN
    RAISE EXCEPTION 'gecersiz kapsam';
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
    RETURN QUERY SELECT 0, v_atl, NULL::uuid, 0;
    RETURN;
  END IF;

  IF p_kapsam = 'sonrakiler' THEN
    SELECT count(*)::int INTO v_tasinan FROM events e WHERE e.id = ANY(v_idler);

    -- tekrar_sayisi CHECK BETWEEN 2 AND 26. İki satırdan azı taşınacaksa
    -- bölmek anlamsız: o satır(lar) seriden ÇIKARILIR (elle düzenlenmiş
    -- sayılır) ki yeni başlığıyla kendi kartında görünüp aranabilsin.
    IF v_tasinan < 2 THEN
      UPDATE events SET seri_disina_alindi_at = now() WHERE id = ANY(v_idler);
    ELSE
      INSERT INTO event_series (community_id, organizer_id, frekans, baslangic,
                                tekrar_sayisi, istek_id)
      SELECT s.community_id, s.organizer_id, s.frekans, v_from,
             LEAST(v_tasinan, 26), NULL
        FROM event_series s WHERE s.id = p_series_id
      RETURNING id INTO v_yeni;

      UPDATE events SET series_id = v_yeni WHERE id = ANY(v_idler);
    END IF;
  END IF;

  -- Beş alan da yazılır (form hepsini gönderiyor). event_date YOK.
  UPDATE events SET
    title           = p_title,
    description     = p_description,
    location        = p_location,
    max_attendees   = p_max_attendees,
    cover_image_url = CASE WHEN p_kapak_degissin THEN p_cover_image_url
                           ELSE cover_image_url END,
    updated_at      = now()
  WHERE id = ANY(v_idler);
  GET DIAGNOSTICS v_gun = ROW_COUNT;

  -- Kaynak seri boşaldıysa (pivot ilk tekrarsa hepsi taşınmış olur) artık
  -- kimsenin işaret etmediği satırı bırakmıyoruz.
  DELETE FROM event_series s
   WHERE s.id = p_series_id
     AND NOT EXISTS (SELECT 1 FROM events e WHERE e.series_id = s.id);

  -- BİLDİRİM: kişi başına TEK mail, tekrar başına değil. 26 tekrarlı bir seri
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

  RETURN QUERY SELECT v_gun, v_atl, v_yeni, v_bildirilen;
END;
$function$;

-- -----------------------------------------------------------------------------
-- 2. seri_sil
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.seri_sil(
  p_series_id uuid,
  p_kapsam text,              -- 'sonrakiler' | 'tumu'
  p_from timestamptz
)
RETURNS TABLE (silinen int, bildirilen int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
DECLARE
  v_com uuid;
  v_from timestamptz;
  v_idler uuid[];
  v_sil int := 0;
  v_bildirilen int := 0;
BEGIN
  SELECT community_id INTO v_com FROM event_series WHERE id = p_series_id;
  IF v_com IS NULL THEN RAISE EXCEPTION 'seri bulunamadi'; END IF;
  IF NOT public.topluluk_yoneticisi_mi(v_com) THEN RAISE EXCEPTION 'yetkisiz'; END IF;

  IF p_kapsam NOT IN ('sonrakiler','tumu') THEN
    RAISE EXCEPTION 'gecersiz kapsam';
  END IF;

  v_from := GREATEST(COALESCE(p_from, now()), now());
  IF p_kapsam = 'tumu' THEN v_from := now(); END IF;

  -- İkinci event_date >= now() koşulu fazlalık DEĞİL: 'tumu' dalında da
  -- geçmişi kilitleyen ikinci savunma. Katılım geçmişi ve check-in kayıtları
  -- korunuyor.
  SELECT array_agg(e.id) INTO v_idler FROM events e
   WHERE e.series_id = p_series_id
     AND e.event_date >= v_from
     AND e.event_date >= now();

  IF v_idler IS NULL THEN
    RETURN QUERY SELECT 0, 0;
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

  RETURN QUERY SELECT v_sil, v_bildirilen;
END;
$function$;

-- -----------------------------------------------------------------------------
-- 3. Fonksiyon yetkileri
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.seri_guncelle(uuid, text, timestamptz, text, text,
  text, int, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seri_guncelle(uuid, text, timestamptz, text, text,
  text, int, text, boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.seri_sil(uuid, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seri_sil(uuid, text, timestamptz) TO authenticated;
```

> **BAĞIMLILIK — atlanırsa mailler sessizce kaybolur.** Bu fonksiyonlar
> `email_outbox`'a `event_change` ve `event_cancel` şablonlarıyla yazıyor.
> Cron'un `buildMail`'i şu an yalnızca `reminder`, `promotion` ve
> `join_request` tanıyor ve tanımadığı şablonu **`return null` ile sessizce
> atıyor** (cron `route.ts:126`). Dalları **Görev 5** ekliyor; Görev 5
> tamamlanana kadar toplu bildirim gönderilmez. Bu tuzağa duyurular turunda
> bir kez düşüldü.
>
> İki şablon adı da `email_izni`'de **tanımlı** (schema.sql:583-584) ve
> işlemsel oldukları için kapatılamıyor. Yeni bir ad uydurulmuyor: `email_izni`
> `ELSE true` dalı yüzünden tanımadığı şablonu herkese izinli sayar ve
> kullanıcının bildirim tercihi **atlanırdı**.

- [ ] **Adım 3: Migration'ı uygula ve Adım 1'in testini tekrar çalıştır**

Beklenen: `TEST SONUCU >>> atlama=EVET | gecmis=KORUNDU | bolme=EVET`

- [ ] **Adım 4: Yetki testini çalıştır**

```sql
DO $test$
DECLARE
  v_seri uuid; v_yabanci uuid;
  r_guncelle text := 'HAYIR'; r_sil text := 'HAYIR';
BEGIN
  SELECT id INTO v_seri FROM event_series LIMIT 1;
  IF v_seri IS NULL THEN RAISE EXCEPTION 'TEST KURULAMADI: seri yok'; END IF;
  SELECT p.id INTO v_yabanci FROM profiles p
   WHERE NOT EXISTS (
     SELECT 1 FROM community_members cm
      WHERE cm.user_id = p.id
        AND cm.community_id = (SELECT community_id FROM event_series WHERE id = v_seri))
   LIMIT 1;
  IF v_yabanci IS NULL THEN RAISE EXCEPTION 'TEST KURULAMADI: yabanci yok'; END IF;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_yabanci)::text, true);
  SET LOCAL ROLE authenticated;

  BEGIN
    PERFORM public.seri_guncelle(v_seri, 'tumu', NULL, 'ele gecirildi',
                                 NULL, 'x', NULL, NULL, false);
    r_guncelle := 'EVET';
  EXCEPTION WHEN OTHERS THEN r_guncelle := 'HAYIR';
  END;

  BEGIN
    PERFORM public.seri_sil(v_seri, 'tumu', NULL);
    r_sil := 'EVET';
  EXCEPTION WHEN OTHERS THEN r_sil := 'HAYIR';
  END;

  RESET ROLE;
  RAISE EXCEPTION 'TEST SONUCU >>> yabanci_guncelle=% | yabanci_sil=%',
    r_guncelle, r_sil;
END;
$test$;
```

Beklenen: `yabanci_guncelle=HAYIR | yabanci_sil=HAYIR`.
`EVET` çıkarsa herhangi bir kayıtlı kullanıcı başkasının serisinin tüm gelecek
buluşmalarını silebiliyor demektir — `rsvps` ve `waitlist` `ON DELETE CASCADE`
olduğu için tüm katılımlar ve check-in token'ları da giderdi.

- [ ] **Adım 5: Deneme verisinin temizlendiğini doğrula**

```sql
select count(*) as kalinti from public.events
 where title in ('toplu deneme','BOLUNMUS BASLIK','seri denemesi');
```

Beklenen: `0`. Sıfır değilse Adım 1/2'deki `RAISE` geri sarmamış demektir;
kalanları elle sil:

```sql
delete from public.events
 where title in ('toplu deneme','BOLUNMUS BASLIK','seri denemesi');
delete from public.event_series s
 where not exists (select 1 from public.events e where e.series_id = s.id);
```

- [ ] **Adım 6: Commit**

```bash
git add supabase/migrations/20260830120200_seri_toplu_fonksiyonlar.sql
git commit -m "seri: seri_guncelle (bolme dahil) ve seri_sil"
```

---
## Görev 4: Veritabanı — `etkinlik_vitrin` view ve `seri_kalanlar`

**Dosyalar:**
- Oluştur: `supabase/migrations/20260830120300_etkinlik_vitrin.sql`

**Arayüzler:**
- Tüketir: Görev 1'in kolonları ve indeksleri
- Üretir:
  - view `public.etkinlik_vitrin` — `public.events` ile **aynı kolonlar**,
    yalnızca gelecek ve seri başına tek temsilci
  - `public.seri_kalanlar(p_series_ids uuid[]) RETURNS TABLE (series_id uuid, kalan int, frekans text)`

**Neden `DISTINCT ON` değil.** İlk tasarım `DISTINCT ON (COALESCE(series_id,
id))` kullanıyordu. Postgres, `DISTINCT ON` listesinde olmayan kolonlar
üzerindeki koşulları alt sorguya **itemez** (`allpaths.c` →
`check_output_expressions`: DISTINCT ON'da olmayan her kolon "unsafe"
işaretlenir) ve view pull-up da edilemez. Sonuç: altı yüzeyin filtresi
dedup'tan **sonra** çalışır, `events_search_vector_idx` (GIN) ve
`idx_events_community_date` erişilemez hâle gelir. Aşağıdaki biçim yalnızca
`WHERE` içerdiği için çağıranın sorgusuna **düzleştirilir**.

- [ ] **Adım 1: Testi ÖNCE yaz ve başarısız olduğunu gör**

```sql
DO $test$
DECLARE
  v_seri uuid; v_toplam int; v_vitrin int;
  r_katlama text := 'HAYIR';
BEGIN
  SELECT series_id INTO v_seri FROM events
   WHERE series_id IS NOT NULL AND event_date >= now()
   GROUP BY series_id HAVING count(*) > 1 LIMIT 1;
  IF v_seri IS NULL THEN RAISE EXCEPTION 'TEST KURULAMADI: cok tekrarli seri yok'; END IF;

  SELECT count(*)::int INTO v_toplam FROM events
   WHERE series_id = v_seri AND event_date >= now();
  SELECT count(*)::int INTO v_vitrin FROM etkinlik_vitrin
   WHERE series_id = v_seri;

  IF v_vitrin = 1 AND v_toplam > 1 THEN
    r_katlama := 'EVET(' || v_toplam || '->1)';
  ELSE
    r_katlama := 'HAYIR(' || v_toplam || '->' || v_vitrin || ')';
  END IF;

  RAISE EXCEPTION 'TEST SONUCU >>> katlama=%', r_katlama;
END;
$test$;
```

Beklenen (migration'dan ÖNCE): `relation "etkinlik_vitrin" does not exist`.

- [ ] **Adım 2: Migration dosyasını yaz**

```sql
-- Tekrarlayan etkinlik serileri — 4/4: okuma tarafı katlama.

-- security_invoker = true ZORUNLU: unutulursa view, events SELECT politikasını
-- atlar ve ONAYLANMAMIŞ topluluk etkinlikleri listelere sızar. Görünür bir
-- patlama olmaz; sessiz bir güvenlik açığıdır.
--
-- Yalnızca WHERE içeriyor → çağıranın sorgusuna düzleştirilir (pull-up), yani
-- .textSearch, city_key ilike ve community_id koşulları doğrudan events'e
-- uygulanır ve GIN/b-tree indeksleri kullanılır.
--
-- SELECT e.* : kolon listesi events ile birebir aynı kalmalı. search_vector
-- (generated tsvector) de dahil — keşfetteki .textSearch onu okuyor.
DROP VIEW IF EXISTS public.etkinlik_vitrin;
CREATE VIEW public.etkinlik_vitrin WITH (security_invoker = true) AS
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

-- View'lar GRANT gerektirir (emsal: public_profiles, schema.sql:1147).
-- Unutulursa altı yüzey "permission denied for view" alır.
GRANT SELECT ON public.etkinlik_vitrin TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- seri_kalanlar — rozet sayacı
-- -----------------------------------------------------------------------------
-- Bu sayı view'ın target list'inde korele alt sorgu olarak DURMUYOR: orada
-- olsaydı satır başına koşardı ve asıl maliyet kaynağı olurdu. Sayfa topladığı
-- seri kimliklerini tek çağrıda soruyor.
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

REVOKE ALL ON FUNCTION public.seri_kalanlar(uuid[]) FROM PUBLIC;
-- anon da alıyor: ana sayfa ve keşfet giriş yapmamış kullanıcıya da açık.
GRANT EXECUTE ON FUNCTION public.seri_kalanlar(uuid[]) TO anon, authenticated;
```

- [ ] **Adım 3: Migration'ı uygula ve Adım 1'in testini tekrar çalıştır**

Beklenen: `TEST SONUCU >>> katlama=EVET(N->1)`

- [ ] **Adım 4: RLS sızıntısını doğrula (`security_invoker` testi)**

```sql
DO $test$
DECLARE
  v_bekleyen uuid; v_event uuid; v_gorunur int;
  r_sizinti text := 'BILINMIYOR';
BEGIN
  SELECT id INTO v_bekleyen FROM communities WHERE status <> 'approved' LIMIT 1;
  IF v_bekleyen IS NULL THEN
    RAISE EXCEPTION 'TEST KURULAMADI: onaylanmamis topluluk yok';
  END IF;
  SELECT id INTO v_event FROM events
   WHERE community_id = v_bekleyen AND event_date >= now() LIMIT 1;
  IF v_event IS NULL THEN
    RAISE EXCEPTION 'TEST KURULAMADI: onaylanmamis toplulukta gelecek etkinlik yok';
  END IF;

  SET LOCAL ROLE anon;
  SELECT count(*)::int INTO v_gorunur FROM etkinlik_vitrin WHERE id = v_event;
  RESET ROLE;

  IF v_gorunur = 0 THEN r_sizinti := 'YOK'; ELSE r_sizinti := 'VAR'; END IF;
  RAISE EXCEPTION 'TEST SONUCU >>> sizinti=%', r_sizinti;
END;
$test$;
```

Beklenen: `sizinti=YOK`. `VAR` çıkarsa `WITH (security_invoker = true)`
uygulanmamıştır.

- [ ] **Adım 5: İndeksin gerçekten kullanıldığını EXPLAIN ile doğrula**

Bu adım atlanamaz — planın tamamının gerekçesi bu. Keşfetin arama sorgusunun
view üzerindeki hâli:

```sql
EXPLAIN (COSTS OFF)
SELECT * FROM etkinlik_vitrin
 WHERE search_vector @@ websearch_to_tsquery('turkish_unaccent', 'kitap')
 ORDER BY event_date LIMIT 12;
```

Beklenen çıktıda **`events_search_vector_idx`** geçmeli. `Seq Scan on events`
görüyorsan view düzleştirilmemiştir — büyük ihtimalle biçim yanlışlıkla
`DISTINCT ON`'a ya da bir `GROUP BY`'a çevrilmiştir.

```sql
EXPLAIN (COSTS OFF)
SELECT * FROM etkinlik_vitrin WHERE community_id = (SELECT id FROM communities LIMIT 1)
 ORDER BY event_date LIMIT 20;
```

Beklenen: **`idx_events_community_date`** geçmeli.

> Not: tablo küçükse planlayıcı yine `Seq Scan` seçebilir. Kesin sonuç için
> `SET LOCAL enable_seqscan = off;` ile aynı iki `EXPLAIN`'i tekrarla; indeks
> adları **o zaman kesinlikle** görünmeli. Görünmüyorsa sorun biçimdedir.

- [ ] **Adım 6: Commit**

```bash
git add supabase/migrations/20260830120300_etkinlik_vitrin.sql
git commit -m "seri: etkinlik_vitrin view ve seri_kalanlar sayaci"
```

---
## Görev 5: Cron — `buildMail` seri dalları ve kuyruk tavanı alarmı

**Dosyalar:**
- Değiştir: `app/api/cron/reminders/route.ts`

**Arayüzler:**
- Tüketir: Görev 3'ün `email_outbox`'a yazdığı iki şablon —
  `template='event_change'` payload `{tur:'seri', series_id, title, location, adet, community_id, community_name}`,
  `template='event_cancel'` payload `{tur:'seri', title, adet, community_id, community_name}`
- Üretir: cron yanıtına `kuyrukTavani: boolean` alanı

**Neden bu görev şart:** `buildMail` tanımadığı şablonu `return null` ile
**sessizce atıyor** ve döngü `continue` ediyor — satır hiç işaretlenmediği için
kuyrukta kalır ve her koşuda tekrar atlanır. Yani Görev 3'ün yazdığı bildirimler
bu görev olmadan **hiç gönderilmez ve hiçbir yerde iz kalmaz.**

- [ ] **Adım 1: `buildMail`'e iki dal ekle**

`return null` satırından (route.ts:126) **hemen önce**, `join_request`
bloğunun ardına ekle:

```ts
  // Seri toplu düzenleme — kişi başına TEK mail (tekrar başına değil).
  // payload.tur ayrımı bilinçli: 'event_change' adını ileride tekil etkinlik
  // de kuyruğa yazarsa gövdeler çakışmasın.
  if (template === 'event_change' && payload.tur === 'seri') {
    const safeTitle = escapeHtml(payload.title ?? '')
    const safeCommunity = escapeHtml(payload.community_name ?? '')
    const safeLocation = escapeHtml(payload.location ?? '')
    const adet = Number(payload.adet ?? 0)
    const communityUrl = `${SITE}/community/${payload.community_id}`

    return {
      subject: `${payload.title ?? 'Seri'} — ${adet} buluşma güncellendi`,
      html: mailShell(`
        <h1 style="color: #1F4A3D; font-weight: 500; font-size: 1.5rem;">
          seride değişiklik var
        </h1>
        <p style="color: #1F2A24;">
          Katıldığın <em>${safeTitle}</em> serisinde <strong>${adet}</strong>
          buluşma güncellendi.
        </p>
        <p style="color: #1F2A24;">Güncel yer: ${safeLocation}</p>
        <p style="color: #1F2A24;">
          <a href="${communityUrl}" style="color: #B8541A;">${safeCommunity} sayfasında hepsini gör</a>
        </p>
      `),
    }
  }

  // Seri toplu iptal — kişi başına TEK mail.
  if (template === 'event_cancel' && payload.tur === 'seri') {
    const safeTitle = escapeHtml(payload.title ?? '')
    const safeCommunity = escapeHtml(payload.community_name ?? '')
    const adet = Number(payload.adet ?? 0)
    const communityUrl = `${SITE}/community/${payload.community_id}`

    return {
      subject: `${payload.title ?? 'Seri'} — kalan buluşmalar iptal edildi`,
      html: mailShell(`
        <h1 style="color: #1F4A3D; font-weight: 500; font-size: 1.5rem;">
          seri iptal edildi
        </h1>
        <p style="color: #1F2A24;">
          Katıldığın <em>${safeTitle}</em> serisinde kalan
          <strong>${adet}</strong> buluşma iptal edildi.
        </p>
        <p style="color: #1F2A24;">
          <a href="${communityUrl}" style="color: #B8541A;">${safeCommunity} sayfasına dön</a>
        </p>
      `),
    }
  }

```

`escapeHtml`, `mailShell` ve `SITE` bu dosyada zaten tanımlı — **yerel
`escapeHtml` kopyasını import'a çevirme** (görev dışı değişiklik, cron
platformun en hassas zamanlanmış işi).

- [ ] **Adım 2: Sentry import'unu ekle**

Dosyanın import bloğunun sonuna:

```ts
import * as Sentry from '@sentry/nextjs'
```

> Bu, depodaki **ilk** Sentry çağrısı olacak — kopyalanacak emsal yok. DSN
> yoksa SDK tamamen sessiz, yani yerelde "alarm çalıştı mı" testi yapılamaz;
> doğrulama koşulun tetiklendiğini `console.warn` ile kanıtlayarak yapılır.

- [ ] **Adım 3: Kuyruk tavanı alarmını ekle**

`kuyruk` değişkeninin atandığı satırdan (`const kuyruk = outbox ?? []`)
hemen sonra:

```ts
  // KUYRUK TAVANI. claim_email_outbox LIMIT 200 döndürüyor, yani kuyruk.length
  // en fazla 200 olabilir ve gerçek birikimi GÖSTERMEZ — 200 görmek "tavana
  // dayandı" demektir, "tam 200 mail var" değil.
  //
  // Neden önemli: koşu başına mail tavanı ~83 (SURE_BUTCESI_MS 50.000 /
  // MAIL_ARASI_MS 600) ve cron GÜNDE BİR koşuyor. Tavana dayanan bir kuyrukta
  // taşan hatırlatmalar ertesi güne, yani ETKİNLİK GEÇTİKTEN SONRAYA kalır.
  // Seri özelliği günlük tepeyi çarptığı için bu alarm onunla birlikte geliyor.
  const kuyrukTavani = kuyruk.length >= 200
  if (kuyrukTavani) {
    console.warn(`[cron/reminders] kuyruk tavanda: ${kuyruk.length} satır alındı`)
    // sendDefaultPii: false kuralı gereği mesaja e-posta/kullanıcı kimliği konmaz.
    Sentry.captureMessage('email_outbox kuyrugu tavanda (>=200)', 'warning')
  }
```

- [ ] **Adım 4: Yanıta alanı ekle**

Cron'un başarı yanıtındaki nesneye `kuyrukTavani` ekle. Mevcut anahtarları
(`queuedReminders`, `sent`, `basarisiz`, `kuyrukta`, `sureDoldu`) **değiştirme**
— yalnızca ekle.

- [ ] **Adım 5: Doğrula**

```bash
npm run typecheck && npm run lint && npm run build
```

Beklenen: üçü de geçer, lint 0 hata. Uyarı sayısı 87'yi geçmemeli.

Şablon dallarının gerçekten tanındığını kanıtla — kuyruğa elle bir satır yaz:

```sql
insert into email_outbox (to_user_id, template, payload)
select p.id, 'event_change', jsonb_build_object(
  'tur','seri','series_id', gen_random_uuid(), 'title','Sali Kitap Kulubu',
  'location','Kadikoy', 'adet', 5,
  'community_id', (select id from communities limit 1),
  'community_name', (select name from communities limit 1))
from profiles p where p.email is not null limit 1;
```

Sonra cron'u elle tetikle (`CRON_SECRET` ile) ve yanıtta `sent` sayısının
arttığını gör. `sent` artmıyor ve satır kuyrukta kalıyorsa dal tanınmamıştır —
`payload.tur === 'seri'` koşulunu ve şablon adını kontrol et.

Temizlik:

```sql
delete from email_outbox where payload->>'title' = 'Sali Kitap Kulubu';
```

- [ ] **Adım 6: Commit**

```bash
git add app/api/cron/reminders/route.ts
git commit -m "seri: cron seri sablonlarini taniyor, kuyruk tavani alarmi"
```

---

## Görev 6: Doğrulama şemaları ve seri oluşturma ucu

**Dosyalar:**
- Değiştir: `lib/validations.ts`
- Değiştir: `app/api/event/route.ts`

**Arayüzler:**
- Tüketir: `seri_olustur` RPC (Görev 2), `get_member_emails` (mevcut)
- Üretir:
  - `seriOlusturSchema` (export)
  - `POST /api/event` gövdesi `tekrar` alanı taşıyabilir; yanıt **her iki
    dalda da** `{ ok: true, event }` (seri dalında `event` ilk tekrardır)

- [ ] **Adım 1: `seriOlusturSchema`'yı yaz**

`lib/validations.ts` içine, `eventSchema` tanımından **sonra** ekle. Dosya içi
`uuid` ve `trimmed` yardımcıları (satır 10-17) doğrudan kullanılabilir; `export`
değiller ama aynı dosyadalar.

```ts
// Seri oluşturma: eventSchema'nın üstüne tekrar bilgisi.
// DİKKAT: bu alanlar eventSchema'ya EKLENMEZ — eventEditSchema eventSchema'nın
// üstüne kurulu (aşağıda), yani oraya eklenen her alan düzenleme şemasına da
// sızar ve düzenleme formu göndermediği için her PATCH 400 dönerdi.
export const seriOlusturSchema = eventSchema.extend({
  tekrar: z.object({
    frekans: z.enum(['haftalik', 'iki_haftalik', 'aylik'], {
      error: 'Geçersiz tekrar sıklığı',
    }),
    // DB'deki CHECK (tekrar_sayisi BETWEEN 2 AND 26) ile aynı sınır —
    // savunma iki katmanda.
    sayi: z.coerce
      .number()
      .int('Tekrar sayısı tam sayı olmalı')
      .min(2, 'En az 2 buluşma olmalı')
      .max(26, 'En fazla 26 buluşma olabilir'),
    // İstemci üretimli istek kimliği: iki kez basılan "Oluştur" düğmesine
    // karşı. UNIQUE(series_id, event_date) bunu ENGELLEMEZ (ikinci çağrı
    // yeni series_id üretir, çatışmaz).
    istek_id: uuid,
  }),
})
```

- [ ] **Adım 2: `eventEditSchema`'ya `kapsam` ekle**

`eventEditSchema`'nın `.extend({...})` bloğuna, mevcut `cover_image_url`
alanının yanına ekle:

```ts
  // Seri kapsamı. Parametresiz eski davranış korunur.
  kapsam: z.enum(['tek', 'sonrakiler', 'tumu'], { error: 'Geçersiz kapsam' })
    .default('tek'),
```

> Bu, dosyadaki **ilk** `.default()` kullanımı. zod v4'te giriş tipini
> opsiyonel, çıkış tipini zorunlu yapar — `parsed.data.kapsam` daima dolu gelir.

- [ ] **Adım 3: `POST /api/event`'e seri dalını ekle**

Mevcut `eventSchema.safeParse(await req.json())` çağrısını, gövdede `tekrar`
varsa seri şemasını kullanacak biçimde değiştir. Gövde **bir kez** okunur:

```ts
  const govde = await req.json().catch(() => null)
  const seriMi = !!(govde && typeof govde === 'object' && 'tekrar' in govde)

  const parsed = seriMi
    ? seriOlusturSchema.safeParse(govde)
    : eventSchema.safeParse(govde)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Geçersiz veri', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }
```

Yetki kontrolü bloğu (satır 42-57) **olduğu gibi kalır** — `seri_olustur`
kendi içinde de kontrol ediyor, iki katman bilinçli.

`insert` bloğundan **önce**, seri dalını ekle:

```ts
  // Seri dalı: N ayrı POST mümkün değil — bu uç "strict" rate limitte
  // (dakikada 3), 4. tekrarda 429 alır, yarım kalır ve geri alma yoktur.
  // Bu yüzden tek RPC, tek işlem.
  if (seriMi) {
    const { tekrar } = parsed.data as typeof parsed.data & {
      tekrar: { frekans: string; sayi: number; istek_id: string }
    }

    const { data: seriRows, error: seriError } = await supabase.rpc('seri_olustur', {
      p_community_id: community_id,
      p_title: title,
      p_description: description || null,
      p_location: location,
      p_baslangic: event_date.toISOString(),
      p_frekans: tekrar.frekans,
      p_tekrar_sayisi: tekrar.sayi,
      p_max_attendees: max_attendees ?? null,
      p_cover_image_url: cover_image_url ?? null,
      p_istek_id: tekrar.istek_id,
    })

    if (seriError?.message?.includes('yetkisiz')) {
      return NextResponse.json({ error: 'Yetkin yok' }, { status: 403 })
    }
    const seri = seriRows?.[0]
    if (seriError || !seri?.ilk_event_id) {
      console.error('[event] seri oluşturulamadı:', seriError)
      return NextResponse.json({ error: 'Seri oluşturulamadı' }, { status: 500 })
    }

    // Üyelere TEK duyuru maili: seriyi tarif eder, tekrar başına mail atılmaz.
    const { data: seriEmailRows } = await supabase.rpc('get_member_emails', {
      p_community_id: community_id,
      p_exclude: user.id,
    })
    const seriEmails = (seriEmailRows ?? []) as string[]

    if (seriEmails.length > 0) {
      const sikligi = tekrar.frekans === 'haftalik' ? 'haftalık'
        : tekrar.frekans === 'iki_haftalik' ? 'iki haftada bir' : 'aylık'
      const safeTitle = escapeHtml(title)
      const safeLocation = escapeHtml(location)
      const ilkTarih = formatDateTimeLong(event_date.toISOString())

      await sendBulkEmail(
        {
          to: seriEmails,
          subject: `${title} — ${seri.uretilen} buluşmalık yeni bir seri`,
          html: `
      <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
        <p style="font-style: italic; color: #B8541A;">No. 0001</p>
        <h1 style="color: #1F4A3D; font-weight: 500; font-size: 1.5rem;">${safeTitle}</h1>
        <p style="color: #1F2A24;">
          ${escapeHtml(sikligi)} tekrarlanan <strong>${seri.uretilen}</strong> buluşma.
          İlki: ${ilkTarih}
        </p>
        <p style="color: #1F2A24;">${safeLocation}</p>
        <p style="color: #1F2A24;">
          <a href="${SITE_URL}/event/${seri.ilk_event_id}" style="color: #1F4A3D;">İlk buluşmaya git</a>
        </p>
        <p style="font-style: italic; color: #1F2A24; opacity: 0.6;">literas</p>
      </div>
    `,
        },
        'event/yeni-seri-duyurusu'
      )
    }

    // Sözleşme: yanıt şekli tekil dalla AYNI kalmalı — form data.event.id okuyor.
    const { data: ilkEvent } = await supabase
      .from('events').select('*').eq('id', seri.ilk_event_id).single()

    return NextResponse.json({
      ok: true,
      event: ilkEvent,
      seri: { series_id: seri.series_id, uretilen: seri.uretilen },
    })
  }
```

`SITE_URL` import'u dosyada yoksa ekle: `import { SITE_URL } from '@/lib/site'`.

> `p_baslangic: event_date.toISOString()` — `eventSchema` `z.coerce.date()`
> kullandığı için `event_date` bir **Date nesnesi**, string değil.

- [ ] **Adım 4: Doğrula**

```bash
npm run typecheck && npm run lint && npm run build
```

Beklenen: üçü de geçer. `seri_olustur` çağrısı derleme zamanında kontrol
edilmez (Supabase istemcisi tipsiz) — ad yanlış yazılırsa **çalışma zamanında**
patlar, bu yüzden bir sonraki adım atlanamaz.

- [ ] **Adım 5: Uçtan uca dene**

Dev sunucusunu başlat, bir topluluğun yöneticisiyle giriş yap ve `curl` ile
gövdeye `tekrar` koyarak POST at (oturum çerezi gerekiyor; en pratik yol
Görev 8'den sonra formu kullanmak). Yanıt `{ ok: true, event: {...}, seri:
{ uretilen: 4 } }` olmalı ve DB'de dört satır oluşmalı:

```sql
select count(*) from events where series_id = '<yanittan gelen series_id>';
```

- [ ] **Adım 6: Commit**

```bash
git add lib/validations.ts app/api/event/route.ts
git commit -m "seri: seriOlusturSchema, kapsam alani ve seri olusturma ucu"
```

---
## Görev 7: Düzenleme ve silme uçlarında kapsam

**Dosyalar:**
- Değiştir: `app/api/event/[id]/route.ts`

**Arayüzler:**
- Tüketir: `etkinlik_guncelle`, `seri_guncelle`, `seri_sil` (Görev 2 ve 3);
  `eventEditSchema.kapsam` (Görev 6)
- Üretir:
  - `PATCH` yanıtı: `{ ok: true, event }` (tek) veya
    `{ ok: true, kapsam, guncellenen, atlanan, yeni_series_id }` (toplu)
  - `DELETE` yanıtı: mevcut şekil (tek) veya `{ ok: true, kapsam, silinen }` (toplu)
  - `DELETE` artık `?kapsam=` query parametresini okuyor

**Neden tekil yol da RPC'ye taşınıyor:** Görev 1'den sonra
`seri_disina_alindi_at` kolon yetkisi listesinde **yok**. Bugünkü düz
`.from('events').update(patch)` (satır 125-130) izi yazamaz; olduğu gibi
bırakılırsa `tumu` kapsamı elle düzeltilmiş buluşmaları sessizce ezer ve
Karar 4'ün ilan ettiği ön koşul sağlanmaz.

- [ ] **Adım 1: PATCH'te kapsam dalını ekle**

`parsed.data` çözümlemesine `kapsam`'ı ekle:

```ts
  const { title, description, location, event_date, max_attendees, cover_image_url, kapsam } =
    parsed.data
```

`patch` nesnesi ve `.from('events').update(patch)` çağrısını (satır 112-135)
**tamamen** şununla değiştir:

```ts
  // TOPLU KAPSAM. event_date BİLİNÇLİ olarak taşınmıyor: eventEditSchema onu
  // zorunlu tutuyor ve form koşulsuz gönderiyor, ama UNIQUE(series_id,
  // event_date) yüzünden toplu yazım her seride ikinci satırda 23505 alır ve
  // işlem tamamen geri döner. Gövdedeki event_date bu dalda YOK SAYILIR.
  if (kapsam !== 'tek' && oldEvent.series_id) {
    const { data: seriRows, error: seriError } = await supabase.rpc('seri_guncelle', {
      p_series_id: oldEvent.series_id,
      p_kapsam: kapsam,
      p_from: kapsam === 'sonrakiler' ? oldEvent.event_date : null,
      p_title: title,
      p_description: description || null,
      p_location: location,
      p_max_attendees: max_attendees ?? null,
      p_cover_image_url: cover_image_url === undefined ? null : (cover_image_url || null),
      p_kapak_degissin: cover_image_url !== undefined,
    })

    if (seriError?.message?.includes('yetkisiz')) {
      return NextResponse.json({ error: 'Yetkin yok' }, { status: 403 })
    }
    if (seriError) {
      console.error('[event PATCH] seri güncellenemedi:', seriError)
      return NextResponse.json({ error: 'Güncellenemedi' }, { status: 500 })
    }

    const seri = seriRows?.[0]
    // Bildirim seri_guncelle içinde email_outbox'a yazıldı; burada mail
    // gönderilmiyor (kişi başına tek mail, cron gönderiyor).
    return NextResponse.json({
      ok: true,
      kapsam,
      guncellenen: seri?.guncellenen ?? 0,
      atlanan: seri?.atlanan ?? 0,
      yeni_series_id: seri?.yeni_series_id ?? null,
    })
  }

  // TEKİL YOL. Düz .update() yerine RPC: seri_disina_alindi_at, updated_at ve
  // reminder_sent_at kolonları istemciye kapalı (Görev 1), yalnızca
  // SECURITY DEFINER fonksiyon yazabilir.
  const { error: rpcError } = await supabase.rpc('etkinlik_guncelle', {
    p_event_id: id,
    p_title: title,
    p_description: description || null,
    p_location: location,
    p_event_date: event_date.toISOString(),
    p_max_attendees: max_attendees ?? null,
    p_cover_image_url: cover_image_url === undefined ? null : (cover_image_url || null),
    p_kapak_degissin: cover_image_url !== undefined,
  })

  if (rpcError?.message?.includes('yetkisiz')) {
    return NextResponse.json({ error: 'Yetkin yok' }, { status: 403 })
  }
  if (rpcError) {
    console.error('[event PATCH] update hatası:', rpcError)
    return NextResponse.json({ error: 'Güncellenemedi' }, { status: 500 })
  }

  const { data: updatedEvent } = await supabase
    .from('events').select('*').eq('id', id).single()

  if (!updatedEvent) {
    return NextResponse.json({ error: 'Güncellenemedi' }, { status: 500 })
  }
```

> `event_date.toISOString()` — `eventEditSchema` `z.coerce.date()` kullanıyor,
> yani `event_date` bir **Date nesnesi**.

Bundan sonraki `changes` hesabı ve değişiklik maili bloğu (satır 137-192)
**olduğu gibi kalır.** O hesap MAİL tetikleyicisi; `seri_disina_alindi_at`
damgası ise `etkinlik_guncelle` içinde altı alana bakarak ayrıca hesaplanıyor.
**İkisi ayrı karar** — birleştirilirse ya sadece açıklamayı değiştiren kişi iz
bırakmaz ya da her küçük düzenlemede katılımcılara gereksiz mail gider.

- [ ] **Adım 2: DELETE'te kapsam dalını ekle**

DELETE gövde **okumuyor** ve mevcut istemciler gövdesiz istek atıyor. Parametre
query string'den alınır — deponun tek emsali `app/api/rsvp/route.ts:106-115`.

`checkCanManage` bloğundan **sonra**, `getRsvpEmails` çağrısından **önce** ekle:

```ts
  // kapsam query string'den: DELETE gövdesi okunmuyor ve mevcut istemciler
  // gövdesiz istek atıyor (geriye uyumluluk).
  const kapsamHam = new URL(_req.url).searchParams.get('kapsam')
  const kapsam =
    kapsamHam === 'sonrakiler' || kapsamHam === 'tumu' ? kapsamHam : 'tek'

  if (kapsam !== 'tek' && event.series_id) {
    const { data: silRows, error: silError } = await supabase.rpc('seri_sil', {
      p_series_id: event.series_id,
      p_kapsam: kapsam,
      p_from: kapsam === 'sonrakiler' ? event.event_date : null,
    })

    if (silError?.message?.includes('yetkisiz')) {
      return NextResponse.json({ error: 'Yetkin yok' }, { status: 403 })
    }
    if (silError) {
      console.error('[event DELETE] seri silinemedi:', silError)
      return NextResponse.json({ error: 'İptal edilemedi' }, { status: 500 })
    }

    // İptal bildirimi ve kuyruk temizliği seri_sil içinde, silmeden ÖNCE
    // yapıldı — sonra rsvps CASCADE ile gittiği için kime haber verileceği
    // bilgisi kalmıyor.
    return NextResponse.json({ ok: true, kapsam, silinen: silRows?.[0]?.silinen ?? 0 })
  }
```

- [ ] **Adım 3: Doğrula**

```bash
npm run typecheck && npm run lint && npm run build
```

- [ ] **Adım 4: Kapsam davranışını uçtan uca dene**

Görev 6'da kurduğun seriden bir tekrarın kimliğiyle:

```bash
curl -i -X DELETE "http://localhost:3000/api/event/<tekrar-id>?kapsam=tumu" \
  -H "Cookie: <oturum-cerezi>"
```

Beklenen: `{"ok":true,"kapsam":"tumu","silinen":N}`. Ardından SQL ile geçmiş
tekrarların **durduğunu** doğrula:

```sql
select count(*) filter (where event_date <  now()) as gecmis,
       count(*) filter (where event_date >= now()) as gelecek
  from events where series_id = '<series_id>';
```

Beklenen: `gelecek = 0`, `gecmis` değişmemiş.

- [ ] **Adım 5: Commit**

```bash
git add app/api/event/[id]/route.ts
git commit -m "seri: PATCH ve DELETE kapsam dallari, tekil duzenleme RPC'ye tasindi"
```

---
## Görev 8: Oluşturma formunda tekrar alanları

**Dosyalar:**
- Değiştir: `app/event/new/new-event-form.tsx`

**Arayüzler:**
- Tüketir: `POST /api/event` seri dalı (Görev 6) — gövdeye `tekrar: { frekans, sayi, istek_id }`
- Üretir: yok (yaprak bileşen)

> **CSS TUZAĞI — atlanırsa onay kutusu dev bir dikdörtgen olur.**
> `app/globals.css:256` seçicisi `input, textarea, select` —
> `:not([type=checkbox])` **değil**. Çıplak bir `<input type="checkbox" />`
> `width:100%`, `padding:11px 16px`, `border:1.5px solid` alır. globals.css'te
> `checkbox`/`radio`/`appearance` kelimesi başka hiçbir yerde geçmiyor; mevcut
> iki toggle boyutu **elle** eziyor.

- [ ] **Adım 1: State ve istek kimliği ekle**

Mevcut `useState` bloğunun sonuna (satır 22 civarı):

```ts
  const [tekrarli, setTekrarli] = useState(false)
  const [frekans, setFrekans] = useState('haftalik')
  const [tekrarSayisi, setTekrarSayisi] = useState('8')
  // İstek kimliği form ilk kurulduğunda ÜRETİLİR ve sabit kalır: iki kez
  // basılan "Oluştur" düğmesi aynı kimliği gönderir, DB ikinciyi yok sayar.
  // useState'in lazy initializer'ı ŞART — her render'da yeni uuid üretilseydi
  // koruma hiç çalışmazdı.
  const [istekId] = useState(() => crypto.randomUUID())
```

> `crypto.randomUUID()` depoda ilk kez kullanılıyor. Yalnızca güvenli bağlamda
> (https/localhost) tanımlıdır; dev ve üretimde ikisi de sağlanıyor.
>
> Bu dosyadaki `userId` prop'u alınıp **hiç kullanılmıyor** ve mevcut lint uyarı
> tabanının parçası. Onu "temizleme" işine girme — görev dışı.

- [ ] **Adım 2: Gövdeye `tekrar` alanını ekle**

`handleSubmit` içindeki `fetch('/api/event', … JSON.stringify({…}) })`
gövdesine, mevcut alanların ardına:

```ts
        ...(tekrarli
          ? { tekrar: { frekans, sayi: parseInt(tekrarSayisi), istek_id: istekId } }
          : {}),
```

Kapalıyken gövdede `tekrar` anahtarı **hiç bulunmaz** — rota tam da bu varlığa
bakarak dallanıyor (Görev 6: `'tekrar' in govde`).

- [ ] **Adım 3: Alanları forma ekle**

Tarih alanının hemen ardına, mevcut `groupStyle`/`labelStyle` sabitlerini
yeniden kullanarak (dosyanın en altında, bileşenin DIŞINDA tanımlılar):

```tsx
      <div style={groupStyle}>
        <label
          style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
        >
          <input
            type="checkbox"
            checked={tekrarli}
            onChange={(e) => setTekrarli(e.target.checked)}
            /* globals.css:256 'input' seçicisi checkbox'ı da vuruyor:
               width:100% ve padding:11px 16px geliyor. Elle eziliyor. */
            style={{ width: '16px', height: '16px', padding: 0, margin: 0, flex: '0 0 auto' }}
          />
          Tekrarlanan buluşma
        </label>
      </div>

      {tekrarli && (
        <>
          <div style={groupStyle}>
            <label htmlFor="frekans" style={labelStyle}>Ne sıklıkla?</label>
            <select id="frekans" value={frekans} onChange={(e) => setFrekans(e.target.value)}>
              <option value="haftalik">Her hafta</option>
              <option value="iki_haftalik">İki haftada bir</option>
              <option value="aylik">Her ay</option>
            </select>
          </div>

          <div style={groupStyle}>
            <label htmlFor="tekrarSayisi" style={labelStyle}>Kaç buluşma?</label>
            <input
              id="tekrarSayisi"
              type="number"
              min={2}
              max={26}
              value={tekrarSayisi}
              onChange={(e) => setTekrarSayisi(e.target.value)}
            />
            <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
              En az 2, en fazla 26 buluşma. Hepsi tek seferde oluşur; sonra
              tek tek ya da toplu düzenleyebilirsin.
            </span>
          </div>
        </>
      )}
```

`<select>` ve `type="number"` girdisine **inline stil verilmiyor** — görünüm
globals.css'ten geliyor; kendi border/background'ını yazan alan formun geri
kalanından farklı görünür. Yalnızca checkbox eziliyor.

- [ ] **Adım 4: Doğrula**

```bash
npm run typecheck && npm run lint && npm run build
```

- [ ] **Adım 5: Tarayıcıda gör ve uçtan uca dene**

`/event/new` aç. Kontrol listesi:
1. Onay kutusu **16×16** görünüyor, satır genişliğinde dev bir kutu değil.
2. İşaretleyince iki alan açılıyor, kaldırınca kapanıyor.
3. Frekans seçicisi diğer alanlarla **aynı** kenarlık ve zemine sahip.
4. 4 tekrarlı bir seri oluştur → ilk buluşmanın detay sayfasına yönlendirilmeli.
5. **Çift tıklama testi:** "Oluştur"a hızlıca iki kez bas → tek seri olmalı.

```sql
select count(*) as seri_sayisi from event_series where organizer_id = '<kullanici-id>';
```

- [ ] **Adım 6: Commit**

```bash
git add app/event/new/new-event-form.tsx
git commit -m "seri: olusturma formuna tekrar alanlari"
```

---

## Görev 9: Düzenleme ve silmede kapsam seçici

**Dosyalar:**
- Değiştir: `app/event/[id]/edit/edit-event-form.tsx`
- Değiştir: `app/event/[id]/event-actions.tsx`
- Değiştir: `app/event/[id]/page.tsx` (yalnızca `<EventActions … />` çağrısı)

**Arayüzler:**
- Tüketir: `PATCH`/`DELETE` kapsam dalları (Görev 7). `EditEventForm` zaten
  `select('*')` alıyor → `event.series_id` bedava geliyor.
- Üretir: `EventActions` yeni imza — `{ eventId: string; seriesId?: string | null }`

> **YOL DÜZELTMESİ.** Tasarım spec'i bu iki dosyayı
> `app/event/[id]/edit-event-form.tsx` ve `components/event-actions.tsx` diye
> yazıyor; **ikisi de yanlış.** Doğru yollar yukarıdaki başlıkta.

- [ ] **Adım 1: Düzenleme formuna kapsam state'i ekle**

```ts
  const [kapsam, setKapsam] = useState<'tek' | 'sonrakiler' | 'tumu'>('tek')
  const [sonuc, setSonuc] = useState('')
```

- [ ] **Adım 2: `handleSubmit`'i güncelle**

Gövdeye `kapsam` eklenir ve **başarı yanıtı da okunur** (bugün yalnızca hata
dalı okunuyor, satır 37-45):

```ts
      body: JSON.stringify({
        title,
        description: description || null,
        location,
        event_date: localInputToISO(eventDate),
        max_attendees: maxAttendees ? parseInt(maxAttendees) : null,
        kapsam,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Kaydedilemedi. Lütfen tekrar dene.')
      setLoading(false)
      return
    }

    // Toplu kapsamda kaç satır güncellendi, kaçı atlandı — kullanıcı bilmeli.
    if (kapsam !== 'tek') {
      const data = await res.json().catch(() => ({}))
      const atlanan = data.atlanan ?? 0
      setSonuc(
        `${data.guncellenen ?? 0} buluşma güncellendi` +
          (atlanan > 0 ? `, ${atlanan}'i elle düzenlendiği için atlandı` : '') +
          (data.yeni_series_id ? '. Bu buluşma ve sonrakiler ayrı bir seri oldu.' : '')
      )
      setLoading(false)
      router.refresh()
      return
    }

    router.push(`/event/${event.id}`)
    router.refresh()
```

- [ ] **Adım 3: Seçiciyi çiz ve tarih alanını kilitle**

Kaydet düğmesinden **önce**. Radyo düğmeleri de Görev 8'deki `input` tuzağına
takılıyor, boyutları elle eziliyor:

```tsx
      {event.series_id && (
        <div style={groupStyle}>
          <span style={labelStyle}>Bu değişiklik neyi kapsasın?</span>
          {([
            ['tek', 'Yalnızca bu buluşma'],
            ['sonrakiler', 'Bu buluşma ve sonrakiler'],
            ['tumu', 'Serinin tüm gelecek buluşmaları'],
          ] as const).map(([deger, etiket]) => (
            <label
              key={deger}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px' }}
            >
              <input
                type="radio"
                name="kapsam"
                value={deger}
                checked={kapsam === deger}
                onChange={() => setKapsam(deger)}
                style={{ width: '16px', height: '16px', padding: 0, margin: 0, flex: '0 0 auto' }}
              />
              {etiket}
            </label>
          ))}
          {kapsam !== 'tek' && (
            <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
              Toplu düzenlemede tarih değiştirilemez — serinin ritmini
              değiştirmek ayrı bir işlem. Elle düzenlenmiş buluşmalar atlanır.
            </span>
          )}
        </div>
      )}
```

Tarih girdisine ekle: `disabled={kapsam !== 'tek'}`

> Alan `disabled` olsa da `eventEditSchema` `event_date`'i **zorunlu** tutuyor;
> state değişmediği için eski değer gövdede gitmeye devam eder ve rota toplu
> dalda onu zaten yok sayar (Görev 7). Alanı gövdeden çıkarmak 400'e yol açardı.

`sonuc` mesajını mevcut `{error && (…)}` kutusunun yanına, aynı kalıpta çiz.

- [ ] **Adım 4: `EventActions`'a kapsam seçici ekle**

İmzayı genişlet:

```ts
export default function EventActions({
  eventId,
  seriesId,
}: {
  eventId: string
  seriesId?: string | null
}) {
```

State: `const [kapsam, setKapsam] = useState<'tek' | 'sonrakiler' | 'tumu'>('tek')`

`handleCancel` içindeki `fetch` çağrısını değiştir — **kapsam query string'den
gider**, çünkü DELETE gövde okumuyor:

```ts
    const res = await fetch(
      `/api/event/${eventId}${kapsam !== 'tek' ? `?kapsam=${kapsam}` : ''}`,
      { method: 'DELETE' }
    )
```

Onay `confirm()` ile değil, `confirming` state'iyle satır içi yapılıyor.
`confirming === true` dalının içine, düğmelerden **önce**, Adım 3'teki radyo
desenini birebir aynı biçimde ekle — yalnızca `seriesId` doluyken ve etiketler
iptale göre: `'Yalnızca bu buluşma'`, `'Bu buluşma ve sonrakiler'`,
`'Serinin tüm gelecek buluşmaları'`.

> Bu dosyada `error` state'i `useState<string | null>(null)`, diğer iki formda
> `useState('')` — tipler farklı, kopyalarken dikkat.

- [ ] **Adım 5: Çağrı noktasını güncelle**

`app/event/[id]/page.tsx:387`:

```tsx
                <EventActions eventId={event.id} seriesId={event.series_id} />
```

Detay sayfasının kendi sorgusu `select('*')` olduğu için `event.series_id`
zaten mevcut; ek sorgu gerekmiyor.

- [ ] **Adım 6: Doğrula**

```bash
npm run typecheck && npm run lint && npm run build
```

Tarayıcıda: seri üyesi bir buluşmanın düzenleme sayfasında üç radyo çıkmalı,
seri **olmayan** bir etkinlikte hiç çıkmamalı. `sonrakiler` seçip başlığı
değiştir → mesajda "ayrı bir seri oldu" görünmeli. `tumu` seçince tarih alanı
gri ve tıklanamaz olmalı.

- [ ] **Adım 7: Commit**

```bash
git add app/event/[id]/edit/edit-event-form.tsx app/event/[id]/event-actions.tsx app/event/[id]/page.tsx
git commit -m "seri: duzenleme ve silmede kapsam secici"
```

---
## Görev 10: Okuma yüzeylerini `etkinlik_vitrin`'e geçir

**Dosyalar:**
- Değiştir: `app/kesfet/page.tsx` (**önce bu**), `app/page.tsx`,
  `app/community/[id]/page.tsx`, `app/sitemap.ts`, `app/event/[id]/page.tsx`

**Arayüzler:**
- Tüketir: `etkinlik_vitrin` (Görev 4)
- Üretir: yok

**Sıra bağlayıcı: önce keşfet.** `app/kesfet/page.tsx` en kırılgan yer —
`communities!inner` embed + gömülü kaynak üzerinde `.eq('community.status',…)`
ve `.ilike('community.city_key',…)` + ana tabloda `.textSearch('search_vector',…)`
+ `.range()`. **Bir view üzerinde bu kombinasyon hiç çalıştırılmadı.**
Doğrulanmadan diğer dört yüzeye geçilmez.

- [ ] **Adım 1: Embed'in view üzerinde çözüldüğünü ÖNCE kanıtla**

Hiçbir dosyaya dokunmadan, PostgREST'e doğrudan sor. `<PROJ>` ve `<ANON>`
`.env.local`'daki `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

```bash
curl -s "<PROJ>/rest/v1/etkinlik_vitrin?select=id,title,community:communities!inner(id,name,status)&community.status=eq.approved&limit=2" \
  -H "apikey: <ANON>" -H "Authorization: Bearer <ANON>"
```

Beklenen: JSON dizisi, her satırda `community` nesnesi dolu.
`{"code":"PGRST200", …"Could not find a relationship"}` dönerse embed
çözülmemiştir — bu durumda **dur** ve keşfet için view'ı `communities`
tarafından embed etmek yerine `community_id` ile ayrı sorgu kur; kalan dört
yüzey (embed kullanmıyorlar ya da daha basit) yine view'a geçebilir.

`search_vector`'ın da view üzerinden geldiğini doğrula:

```bash
curl -s "<PROJ>/rest/v1/etkinlik_vitrin?select=id,title&search_vector=fts(turkish).kitap&limit=2" \
  -H "apikey: <ANON>" -H "Authorization: Bearer <ANON>"
```

Beklenen: 200 ve bir dizi (boş olabilir). `column ... does not exist` dönerse
view `SELECT e.*` yerine kolon listesi yazılmış demektir.

- [ ] **Adım 2: Keşfeti geçir**

`app/kesfet/page.tsx:104` — yalnızca kaynak adı ve select listesi değişir:

```ts
      let query = supabase
        .from('etkinlik_vitrin')
        .select('id, title, event_date, location, cover_image_url, series_id, community:communities!inner(id, name, category, city, status)')
        .gte('event_date', new Date().toISOString())
        .eq('community.status', 'approved')
        .order('event_date', { ascending: true })
        .range(rangeFrom, rangeTo + 1)
```

`.gte('event_date', …)` **kalıyor**: view zaten süzüyor, koşul fazlalık ama
çağrı yerindeki niyeti belgeliyor ve hiçbir şeye mal olmuyor.

`.range(rangeFrom, rangeTo + 1)` ve `hasMore = rows.length > PAGE_SIZE`
mantığı **değişmiyor** — katlama `WHERE` içinde, yani `range`'ten önce
uygulanıyor, bir fazla satır isteme numarası aynen çalışıyor.

- [ ] **Adım 3: Keşfeti doğrula — sonuç VE plan**

```bash
npm run typecheck && npm run lint && npm run build
```

Tarayıcıda `/kesfet`: arama + şehir filtresi + "daha fazla" birlikte
çalışmalı ve **12 tekrarlı seri tek kart** olmalı.

Sonra planı doğrula (bu adım atlanamaz — planın bütün gerekçesi bu):

```sql
EXPLAIN (COSTS OFF)
SELECT * FROM etkinlik_vitrin
 WHERE search_vector @@ websearch_to_tsquery('turkish_unaccent', 'kitap')
 ORDER BY event_date LIMIT 12;
```

`events_search_vector_idx` geçmeli. `Seq Scan on events` görüyorsan view
düzleştirilmiyor demektir; Görev 4'e dön.

- [ ] **Adım 4: Ana sayfayı geçir**

`app/page.tsx:117-126`:

```ts
  let eventQuery = supabase
    .from('etkinlik_vitrin')
    .select(
      'id, title, event_date, location, cover_image_url, series_id, community:communities!inner(name, category, city)'
    )
    .gte('event_date', new Date().toISOString())
    .order('event_date', { ascending: true })
    .limit(12)
```

- [ ] **Adım 5: Sitemap'i geçir**

`app/sitemap.ts:37-40`:

```ts
  const { data: events } = await supabase
    .from('etkinlik_vitrin')
    .select('id, event_date, created_at')
    .gte('event_date', new Date().toISOString())
```

Bu, bir seri için ~12 neredeyse özdeş URL üretilmesini engelliyor. Seri için
kendi sayfası + canonical **kapsam dışı** (spec).

- [ ] **Adım 6: Topluluk sayfası — üç ayrı iş**

`app/community/[id]/page.tsx:180-199`. Bugün **iki** sorgu var; üçüncüsü
yazılıyor.

**(a) Yaklaşan → view + LIMIT.** Bugün bu sorguda **hiç LIMIT yok**; 52 satır
ağdan geçiyor.

```ts
    supabase
      .from('etkinlik_vitrin')
      .select('id, title, location, event_date, cover_image_url, series_id')
      .eq('community_id', id)
      .gte('event_date', nowIso)
      .order('event_date', { ascending: true })
      .limit(20),
```

**(b) Geçmiş → DOKUNULMUYOR.** View yalnızca geleceği içeriyor, geçmiş sorgusu
oraya geçemez. Bu turda geçmiş liste **katlanmıyor** ve serinin tekrarlarını
ayrı ayrı gösteriyor — bilinçli.

**(c) Takvim → YENİ ve KATLANMAMIŞ sorgu.** `eventDays` bugün doğrudan
`[...upcoming, ...past]`'ten besleniyor (satır 229). Yaklaşan liste view'a
geçirilince takvimde serinin **yalnızca ilk günü** işaretlenir. `Promise.all`
dizisine üçüncü bir sorgu ekle:

```ts
    supabase
      .from('events')
      .select('event_date')
      .eq('community_id', id)
      .gte('event_date', ayBasiIso)
      .lt('event_date', aySonuIso),
```

`ayBasiIso`/`aySonuIso`, `istParts(new Date())`'ten üretilen içinde bulunulan
ayın sınırları (takvim zaten yalnızca bu ayı çiziyor). `eventDays` artık bu
sonuçtan kurulur:

```ts
  const eventDays = new Set(
    (takvimRes.data ?? [])
      .map((ev: any) => istParts(new Date(ev.event_date)))
      .filter((p) => p.y === calY && p.m === calM)
      .map((p) => p.d)
  )
```

Küme yine `Set<number>` (ayın günü) — çizim kodu (satır 459-472) **değişmiyor**.
Yan fayda: `past` yalnızca `.limit(6)` getirdiği için ay başındaki 7. ve
sonraki geçmiş etkinlikler bugün de işaretlenmiyordu; bu sorgu onu da kapatıyor.

**(d) Sayaç.** Satır 477-480'deki `{upcoming.length}` katlanmış listeyi
sayıyor, yani "3 yaklaşan buluşma" derken 12 buluşma var. Görev 11'de eklenen
`seri_kalanlar` sonucuyla düzelt:

```tsx
              <div className="cp-stat">
                <b>{yaklasanToplam}</b>
                <span>yaklaşan buluşma</span>
              </div>
```

`yaklasanToplam` = katlanmış listedeki tekil etkinlik sayısı + her serinin
`kalan` değeri toplamı.

- [ ] **Adım 7: Detay sayfasında aynı seriyi ele**

`app/event/[id]/page.tsx:191-197` "Topluluğun diğer etkinlikleri" bugün
`.neq('id', id)` dışında eleme yapmıyor; liste aynı serinin 4 tekrarıyla dolar.

```ts
        .from('etkinlik_vitrin')
        .select('id, title, event_date')
        .eq('community_id', event.community_id)
        .neq('id', id)
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true })
        .limit(4)
```

View zaten seri başına tek temsilci verdiği için, bulunduğun buluşmanın
serisinden en fazla **bir** satır gelir. Onu da elemek için sorgudan sonra:

```ts
  const otherEvents = (otherEventsRes.data ?? []).filter(
    (e: any) => !event.series_id || e.series_id !== event.series_id
  )
```

select listesine `series_id` eklemeyi unutma, yoksa filtre sessizce hiçbir şey
yapmaz.

- [ ] **Adım 8: Doğrula**

```bash
npm run typecheck && npm run lint && npm run build
```

Elle: 12 tekrarlı seri kurulmuş bir toplulukla ana sayfa, `/kesfet` ve
`/community/<id>` — üçünde de **bir** kart. Topluluk sayfasında takvimde
serinin **bütün** günleri işaretli. Detay sayfasında "diğer etkinlikler"
listesinde aynı seri **yok**.

- [ ] **Adım 9: Commit**

```bash
git add app/kesfet/page.tsx app/page.tsx app/sitemap.ts "app/community/[id]/page.tsx" "app/event/[id]/page.tsx"
git commit -m "seri: okuma yuzeyleri etkinlik_vitrin'e gecti, takvim ayri sorguya"
```

---

## Görev 11: Seri rozeti ve detay sayfası seri bloğu

**Dosyalar:**
- Değiştir: `components/event-card.tsx`
- Değiştir: `app/page.tsx`, `app/kesfet/page.tsx` (`seri_kalanlar` çağrısı)
- Değiştir: `app/profile/[id]/page.tsx` (yalnızca select listeleri)
- Değiştir: `app/event/[id]/page.tsx` (künye "Seri" satırı)

**Arayüzler:**
- Tüketir: `seri_kalanlar(uuid[])` (Görev 4), `series_id` (Görev 10'da select
  listelerine eklendi)
- Üretir: `EventCard` yeni opsiyonel prop'lar — `seriKalan?: number | null`,
  `frekans?: string | null`

**Neden prop:** `components/event-card.tsx` bir **sunucu bileşeni**
(`'use client'` yok) ama veri çekmiyor — sayfa çekip veriyor. Rozet sayısı bu
yüzden prop olarak gelmeli; `seri_kalanlar`'ın dizi alması da bundan
(sayfa başına tek round-trip).

- [ ] **Adım 1: `EventCard` tipine iki alan ekle**

Mevcut `attendee_count` kalıbını izle (opsiyonel + yorumlu):

```ts
type Event = {
  id: string
  title: string
  location: string
  event_date: string
  cover_image_url: string | null
  /** Sorguda çekilmemiş olabilir — o zaman sayaç gizlenir. */
  attendee_count?: number | null
  /** Seri üyesiyse dolu. Çekilmemişse rozet gizlenir. */
  series_id?: string | null
  community?: { name: string; category?: string | null } | null
}

type Props = {
  event: Event
  showCommunityName?: boolean
  /** Serinin kalan gelecek buluşma sayısı. Yoksa rozet çizilmez. */
  seriKalan?: number | null
  /** 'haftalik' | 'iki_haftalik' | 'aylik' */
  frekans?: string | null
}
```

- [ ] **Adım 2: Rozeti çiz**

`.ec-panel` içindeki `.ec-live` etiketinin **yanına**, mevcut desenle:

```tsx
            {seriKalan != null && seriKalan > 0 && (
              <span className="ec-seri">
                {frekans === 'haftalik' ? 'haftalık'
                  : frekans === 'iki_haftalik' ? 'iki haftada bir'
                  : 'aylık'} · {seriKalan} buluşma
              </span>
            )}
```

CSS'i dosya içindeki `<style>` bloğuna, `.ec-chip` kuralının **yanına** ekle
(bu bileşenin sınıfları `globals.css`'te **değil**, dosya içinde yaşıyor):

```css
        .ec-seri {
          display:inline-flex; align-items:center;
          font-size:12px; font-weight:600; color:var(--card-fg-dim);
          white-space:nowrap;
        }
```

- [ ] **Adım 3: `series_id`'yi dört select listesine ekle**

Bu dört çağrı noktası kolonları **açıkça sayıyor** (`select('*')` değil);
eklenmezse rozet hiçbir yerde çıkmaz ve **hata da vermez** —
`event.series_id` sadece `undefined` olur.

1. `app/page.tsx:118-124` — Görev 10 Adım 4'te eklendi
2. `app/kesfet/page.tsx:104-112` — Görev 10 Adım 2'de eklendi
3. `app/profile/[id]/page.tsx:35-38` — `organizedEvents` select listesine ekle
4. `app/profile/[id]/page.tsx:42-43` — `rsvps` üzerinden gömülü
   `event:events(...)` listesine ekle

- [ ] **Adım 4: `seri_kalanlar`'ı çağır ve kartlara geçir**

Ana sayfa ve keşfette, etkinlik sorgusundan **sonra**:

```ts
  const seriIdler = [...new Set(events.map((e: any) => e.series_id).filter(Boolean))]
  const { data: kalanRows } = seriIdler.length
    ? await supabase.rpc('seri_kalanlar', { p_series_ids: seriIdler })
    : { data: [] }
  const kalanMap = new Map(
    (kalanRows ?? []).map((r: any) => [r.series_id, { kalan: r.kalan, frekans: r.frekans }])
  )
```

Kart çizimini güncelle (ana sayfa satır 286, keşfet satır 258):

```tsx
<EventCard
  key={e.id}
  event={e}
  showCommunityName
  seriKalan={kalanMap.get(e.series_id)?.kalan}
  frekans={kalanMap.get(e.series_id)?.frekans}
/>
```

Topluluk sayfasındaki `yaklasanToplam` (Görev 10 Adım 6d) de bu `kalanMap`'ten
hesaplanır: katlanmış listedeki `series_id`'siz satır sayısı + her serinin
`kalan` toplamı.

- [ ] **Adım 5: Detay sayfasına "Seri" satırı ekle**

`app/event/[id]/page.tsx` künye ızgarasındaki GERÇEKLER bloğuna. Sayfa
`select('*')` yaptığı için `event.series_id` mevcut. Serinin sonraki üç
buluşmasını çek:

```ts
  const { data: seriSonrakiler } = event.series_id
    ? await supabase
        .from('events')
        .select('id, title, event_date')
        .eq('series_id', event.series_id)
        .gt('event_date', event.event_date)
        .order('event_date', { ascending: true })
        .limit(3)
    : { data: [] }
```

> Bu sorgu **view kullanmıyor** — bilinçli. Burada katlama istemiyoruz, tam
> tersine serinin tek tek tekrarlarını gösteriyoruz.

GERÇEKLER bloğuna, mevcut satırların biçimini birebir izleyen bir "Seri"
satırı ve altına üç bağlantı ekle. Metin: frekans + kalan sayı
(`seri_kalanlar` yerine buradaki liste yeterli değilse ayrı bir sayım yap;
en basiti aynı `seri_kalanlar` RPC'sini tek elemanlı diziyle çağırmak).

- [ ] **Adım 6: Doğrula**

```bash
npm run typecheck && npm run lint && npm run build
```

Elle: seri kartında "haftalık · 8 buluşma" rozeti çıkmalı; **seri olmayan**
etkinlik kartında çıkmamalı. Aynı başlıklı iki kart artık ayırt edilebilir
olmalı. Detay sayfasında "Seri" satırı ve sonraki üç buluşmanın bağlantısı
görünmeli.

- [ ] **Adım 7: Commit**

```bash
git add components/event-card.tsx app/page.tsx app/kesfet/page.tsx "app/profile/[id]/page.tsx" "app/event/[id]/page.tsx" "app/community/[id]/page.tsx"
git commit -m "seri: kart rozeti ve detay sayfasi seri blogu"
```

---

## Görev 12: Baseline şema ve belgeler

**Dosyalar:**
- Değiştir: `supabase/schema.sql`
- Değiştir: `CLAUDE.md`, `literas-yol-haritasi.md`
- Değiştir: `docs/superpowers/specs/2026-08-30-tekrarlayan-etkinlik-serileri-design.md`

**Arayüzler:**
- Tüketir: Görev 1-4'ün dört migration dosyası
- Üretir: yok

`schema.sql` **migration zincirinin parçası değil** — sıfırdan kurulum ve
felaket kurtarma için tutulan anlık görüntü. Dört migration'ın tamamı buraya
elle yansıtılır.

- [ ] **Adım 1: `events`'i toplu GRANT satırından çıkar**

`supabase/schema.sql:1161`:

```sql
GRANT INSERT, UPDATE, DELETE ON TABLE public.communities, public.events TO anon, authenticated;
```

şu hâle gelir:

```sql
GRANT INSERT, UPDATE, DELETE ON TABLE public.communities TO anon, authenticated;
-- public.events BİLİNÇLİ olarak çıkarıldı: yazma yetkisi kolon bazlı
-- (aşağıda). Tablo bazlı GRANT burada kalsaydı kolon listeleri sessizce
-- anlamsızlaşırdı — kolon bazlı yetki tablo bazlı GRANT'i EZMEZ.
```

- [ ] **Adım 2: Kalan blokları yerlerine yaz**

| Ne | Nereye |
|---|---|
| `event_series` CREATE TABLE + indeksler | `events` tablosunun tanımından **sonra** |
| `events`'in dört yeni kolonu | `events` CREATE TABLE'ının içine |
| `events_seri_tarih_benzersiz` + dört indeks | mevcut `events` indekslerinin yanına |
| `event_series` RLS + politika | RLS bölümüne |
| `REVOKE ALL` / `GRANT SELECT ON event_series` | `GRANT SELECT` toplu listesinin (satır 1145) **yanına değil**, ayrı ve yorumlu |
| `etkinlik_vitrin` view + `GRANT SELECT` | `public_profiles` view'ının yanına |
| Dört fonksiyon | fonksiyon bölümüne |
| `REVOKE INSERT, UPDATE ON events` + kolon GRANT'leri | **toplu GRANT'lerden SONRA** (rsvps emsali, satır 1176-1178) |
| Dört fonksiyonun `REVOKE ALL` / `GRANT EXECUTE`'u | fonksiyon yetkileri bölümüne (satır 1201+) |

**Sıra bozulursa koruma sessizce yok olur.** Kolon bazlı GRANT bloğu toplu
GRANT'lerden **önce** yazılırsa tablo bazlı yetki onu ezer.

- [ ] **Adım 3: Baseline'ı temiz bir projede sına**

Bu, `schema.sql`'in gerçekten çalıştığının tek kanıtı — migration'ların
çalışması onu kanıtlamaz.

Supabase'de bir dal (branch) aç, `schema.sql`'in tamamını çalıştır, sonra
Görev 1 Adım 1'deki yetki testini orada koştur.

Beklenen: `seri_yazar=HAYIR | events_series_yazar=HAYIR | iz_silinir=HAYIR`.
Herhangi biri `EVET` çıkarsa baseline'daki sıra yanlıştır (panel
`supabase_admin` olarak koştuğu için varsayılan `arwdDxtm` veriyor ve
`REVOKE` olmadan kolon listeleri anlamsızlaşıyor).

- [ ] **Adım 4: Spec'teki üç hatayı düzelt**

Uygulama sırasında ortaya çıkan sapmalar spec'e işlenir:

1. **Yanlış dosya yolları.** Spec `app/event/[id]/edit-event-form.tsx` ve
   `components/event-actions.tsx` yazıyor; doğrusu
   `app/event/[id]/edit/edit-event-form.tsx` ve
   `app/event/[id]/event-actions.tsx`.
2. **"NULL = dokunma" kuralı.** `seri_guncelle` beş alanın hepsini yazıyor
   (form hepsini gönderiyor); üç durumlu tek alan `cover_image_url` ve o da
   `p_kapak_degissin` bayrağıyla çözülüyor.
3. **Topluluk sayfası "üç sorgu" değil.** Bugün **iki** sorgu var; takvim
   sorgusu bu planla **yeni yazılıyor**.

Ayrıca spec'in "Kapsam dışı" listesine ekle:

> - **Profil sayfası katlanmıyor.** `app/profile/[id]/page.tsx` hem düzenlenen
>   etkinlikleri hem katılınanları geçmişiyle birlikte listeliyor; view yalnızca
>   geleceği içerdiği için oraya geçemez. Seri kurulunca bu sayfa 12 tekrarı da
>   ayrı ayrı gösterir — bilinçli, çünkü profil bir **geçmiş kaydı**, bir
>   keşif yüzeyi değil. `series_id` yine de select listelerine ekleniyor ki
>   kartlarda seri rozeti çıksın.

- [ ] **Adım 5: Yol haritası ve CLAUDE.md**

`literas-yol-haritasi.md` ve `CLAUDE.md`'deki "Aşama 3 tekrarlayan etkinlik
serileri" maddesini `[x]` yap ve tek satır not düş. `CLAUDE.md`'nin
"Veritabanı gerçeği" bölümündeki tablo listesine `event_series` ekle.

- [ ] **Adım 6: Son doğrulama ve commit**

```bash
npm run typecheck && npm run lint && npm run build
```

```bash
git add supabase/schema.sql CLAUDE.md literas-yol-haritasi.md docs/superpowers/specs/2026-08-30-tekrarlayan-etkinlik-serileri-design.md
git commit -m "seri: baseline sema ve belgeler guncellendi"
```

---

## Uygulama sonrası canlı doğrulama

Dal birleşip dağıtım `READY` olduktan sonra, canlıda:

1. **Katlama.** 12 tekrarlı bir seri kur; ana sayfa, `/kesfet` ve topluluk
   sayfasında **bir** kart görünmeli. Takvimde serinin **bütün** günleri
   işaretli olmalı.
2. **Arama.** Serinin başlığıyla `/kesfet`'te ara → bulunmalı. 5. tekrardan
   `kapsam=sonrakiler` ile başlığı değiştir → **iki** kart çıkmalı ve **yeni
   başlıkla arama da sonuç vermeli.**
3. **Geçmiş koruması.** Geçmiş tekrarı olan bir seride `kapsam=tumu` ile
   güncelle ve sil → geçmiş satırlar durmalı.
4. **Elle düzenleme izi.** Bir tekrarı tek başına düzenle, sonra `kapsam=tumu`
   çalıştır → o tekrar atlanmalı ve arayüz bunu **söylemeli**.
5. **Bildirim hacmi.** 12 tekrarlı seriyi 3 üyeli bir toplulukta kur →
   `email_outbox`'ta seriyle ilgili **3** satır olmalı, 36 değil. (Bildirim
   tercihini kapatan üyeler düşer; sayımı tercihleri açık üyelerle yap.)
   Toplu sil → katılımcı başına **1** iptal maili ve o tekrarların
   gönderilmemiş `reminder` satırları kuyruktan silinmiş olmalı:

   ```sql
   select template, count(*) from email_outbox
    where sent_at is null group by template;
   ```

6. **Hatırlatma.** Cron'u elle tetikle → yalnızca 24 saat içindeki tekrar için
   mail kuyruğa girmeli. Yanıtta `kuyrukTavani` alanı bulunmalı.
7. **Yetki.** Üye olmayan bir hesapla `seri_sil` RPC'sini doğrudan çağır
   (tarayıcı konsolundan `supabase.rpc`) → `yetkisiz` almalı.
8. **Sentry.** Kuyruk tavanı alarmı ancak gerçek birikimde tetiklenir;
   `sureDoldu` ya da `kuyrukTavani` true dönen ilk koşudan sonra Sentry
   panelinde uyarının düştüğünü doğrula.
