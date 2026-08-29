# Tekrarlayan Etkinlik Serileri — Tasarım

**Tarih:** 30.08.2026 · **Yol haritası:** Aşama 3, "Tekrarlayan etkinlik serileri"

## Neden

Vizyon belgesinin orta vade hedefi *"her hafta dönülen platform"*, başarı ölçütü
*"bir topluluk literas'ı bırakıp Excel + WhatsApp grubuna dönmüyor."*

Bu özellik bir takvim özelliği değil, **haftalık ritüelin sürtünmesini sıfırlamak**:
her salı buluşan kitap kulübünün organizatörü her hafta yeniden etkinlik kurmasın.

## Mevcut sistemin varsayımı

Sistemin tamamı tek bir varsayım üzerine kurulu: **her `events` satırı bağımsız,
benzersiz bir buluşma.** RSVP (`UNIQUE(event_id, user_id)`), kapasite trigger'ı,
bekleme listesi terfisi, `attendee_count`, QR check-in token'ı, `reminder_sent_at`
ve dört RLS politikası hepsi tek `events.id` üzerinden çalışıyor. Altı okuma
yüzeyi de aynı varsayımı paylaşıyor.

`events` bugün 13 kolon; seriyle ilgili tek alan yok. Depoda `series/recurring/
rrule` araması yalnızca yol haritasındaki `[ ]` maddesini buluyor.

## Alınan kararlar

| # | Karar | Seçim |
|---|---|---|
| 1 | Saklama | **Her tekrar ayrı `events` satırı** (materyalize) |
| 2 | Katılım birimi | **Buluşma başına RSVP** (mevcut model korunur) |
| 3 | Liste katlama | **Veritabanı tarafı view** (`security_invoker`) |
| 4 | Düzenleme kapsamı | **Üçlü**: bu tekrar / bundan sonrakiler / tümü |

Karar 1 ve 2 birlikte şu anlama geliyor: **hiçbir DB fonksiyonu yeniden
yazılmıyor.** `check_rsvp_capacity`, `sync_attendee_count`,
`promote_from_waitlist`, `checkin_yap`, `queue_event_reminders` ve dört RLS
politikası olduğu gibi çalışmaya devam ediyor. İş, yazma tarafında modelleme +
toplu işlem, okuma tarafında katlama.

Karar 4 üçlü seçildi. **Koşulu var:** "tümünü güncelle" elle düzeltilmiş
tekrarları sessizce ezer, çünkü `events`'te ne `updated_at` var ne de "bu satır
seriden ayrıldı" işareti (tablo üzerinde hiç trigger da yok). O iz bu işin
parçası olarak ekleniyor; izsiz "tümü" kapsamı **açılmayacak**.

---

## Veri modeli

### Yeni tablo: `event_series`

| kolon | tip | not |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `community_id` | uuid NOT NULL | FK → communities, ON DELETE CASCADE |
| `organizer_id` | uuid NOT NULL | FK → profiles, ON DELETE CASCADE |
| `frekans` | text NOT NULL | CHECK IN ('haftalik','iki_haftalik','aylik') |
| `baslangic` | timestamptz NOT NULL | ilk buluşma |
| `tekrar_sayisi` | int NOT NULL | CHECK BETWEEN 2 AND 26 |
| `istek_id` | uuid NULL | istemci üretimli; ikizlenme koruması |
| `created_at` | timestamptz | DEFAULT now() |

**Neden RRULE değil:** RRULE'un tam desteği (BYSETPOS, EXDATE, sonsuz seriler)
bu ürünün ihtiyacı değil ve her tüketiciye ayrı bir yorumlayıcı yazmayı
gerektirir. Üç frekans, Türkiye'deki topluluk ritmini karşılıyor. Genişletme
gerekirse `frekans` bir CHECK; yeni değer eklemek migration meselesi.

**Neden 26 tavan:** haftalık yarım yıl. Tavan `events` satır sayısını ve toplu
UPDATE'te RLS'in satır başına koşturduğu `community_members EXISTS` sorgusunu
sınırlıyor. **Hatırlatma maili hacmini sınırlamıyor** — asıl kısıt günlük tepe;
aşağıdaki "Hatırlatma kapasitesi" bölümüne bak. Seriyi uzatmak sonraki bir iş.

### RLS ve yetkiler — `event_series`

CLAUDE.md kuralı 4: *"Yeni tablo/kolon = migration dosyası + RLS politikası +
gerekli index. İstisnasız."* Bu tablonun yazma tarafı **tamamen kapalı**;
yazan tek şey aşağıdaki üç `SECURITY DEFINER` fonksiyon.

```sql
ALTER TABLE public.event_series ENABLE ROW LEVEL SECURITY;

-- events SELECT politikasinin aynasi. Onaylanmamis toplulugun serisi
-- yalnizca kendi organizatorune ve yoneticiye gorunur.
CREATE POLICY "Seriler herkese acik" ON public.event_series
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM communities c
             WHERE c.id = community_id AND c.status = 'approved')
    OR organizer_id = auth.uid()
    OR public.is_admin()
  );

-- INSERT/UPDATE/DELETE icin NE politika NE grant var. Bu bilincli:
-- app_secrets / email_outbox kalibi (schema.sql:264-265).
REVOKE ALL ON TABLE public.event_series FROM anon, authenticated;
GRANT SELECT ON TABLE public.event_series TO anon, authenticated;
```

**DİKKAT — `schema.sql`'deki toplu `GRANT INSERT, UPDATE, DELETE` listelerine
EKLENMEZ.** Bu tam olarak `community_announcements` yorumunda yazan tuzak
(schema.sql:1179-1188): kolon/politika bazlı koruma tablo bazlı GRANT'i ezmez.

**Tablo her zaman migration ile oluşturulur, panelden değil.** Baseline panelden
(`supabase_admin` olarak) koşturulduğunda varsayılan `authenticated`'a `arwdDxtm`
verir; `REVOKE ALL` satırı olmadan herhangi bir kayıtlı kullanıcı
`DELETE FROM event_series` çağırabilir ve `series_id ON DELETE SET NULL` olduğu
için **tüm seriler tek seferde dağılır.** Ters yönde de kırılır: migration
(`postgres`) yolunda `REVOKE ALL` sonrası `GRANT SELECT` unutulursa kart
rozetinin okuduğu gömülü ilişki 403 döner ve **etkinlik listeleri komple boşalır**
(20260829100000_topluluk_duyurulari.sql:80-82'de bir kez ölçüldü).

### `events`'e eklenen kolonlar

| kolon | tip | not |
|---|---|---|
| `series_id` | uuid NULL | FK → event_series **ON DELETE SET NULL** |
| `occurrence_index` | int NULL | seri içinde kaçıncı (0 tabanlı) |
| `updated_at` | timestamptz NULL | son gerçek değişiklik |
| `seri_disina_alindi_at` | timestamptz NULL | bu tekrar elle değiştirildi |

**`ON DELETE SET NULL`, CASCADE DEĞİL.** CASCADE seçilseydi seriyi silmek
`events` satırlarını, onlar üzerinden de `rsvps` ve `waitlist` kayıtlarını
uçururdu — katılımcıların kaydı sessizce yok olurdu. Seri silinince tekrarlar
bağımsız etkinliğe dönüşür; toplu silme ayrı ve açık bir işlem.

**`occurrence_index` üretim anındaki sıradır.** Silme/ekleme sonrası **asla
yeniden numaralanmaz**, boşluk normaldir ve **hiçbir kapsam ya da sıralama
ölçütü değildir** — her kapsam `event_date` ile çözülür (`sonrakiler` =
`event_date >= pivot.event_date`). Yalnızca teşhis ve "3/12" gibi görüntüleme
için.

**`tekrar_sayisi` oluşturma anındaki niyettir**, silmelerle güncellenmez. Canlı
sayaç ayrı hesaplanır (aşağıda `seri_kalanlar`); arayüz `tekrar_sayisi`'nı
göstermez.

### Kısıtlar ve indeksler

```sql
-- Ayni seri icinde iki ayni damga olamaz. NOT: bu kisit "iki kez basilan
-- Olustur" senaryosunu ENGELLEMEZ -- ikinci cagri yeni bir series_id
-- uretecegi icin catismaz. Ikizlenme korumasi istek_id ile (asagida).
ALTER TABLE events ADD CONSTRAINT events_seri_tarih_benzersiz
  UNIQUE (series_id, event_date);

-- GERCEK ikizlenme korumasi: istemci uretimli istek kimligi.
-- Kismi UNIQUE, cunku bolme (sonrakiler) ile olusan serilerde istek_id NULL.
CREATE UNIQUE INDEX event_series_istek_benzersiz
  ON event_series (organizer_id, istek_id) WHERE istek_id IS NOT NULL;

CREATE INDEX idx_events_series ON events (series_id, event_date);

-- View'in kendi WHERE event_date >= now() kosulu bugun INDEKSSIZ:
-- event_date uzerinde yalnizca kismi idx_events_reminder var.
CREATE INDEX idx_events_date ON events (event_date);
CREATE INDEX idx_events_community_date ON events (community_id, event_date);

-- Karar 2'nin bilinen bedeli: kullanici basina rsvps satiri seri boyu kadar
-- artiyor ve rsvps'te user_id ile BASLAYAN hicbir indeks yok (bugun sadece
-- pkey, UNIQUE(event_id,user_id), checkin_token). Profil ve ana sayfadaki
-- .eq('user_id', ...) sorgulari ilk bozulacak yerler.
CREATE INDEX idx_rsvps_user ON rsvps (user_id, created_at DESC);
```

`UNIQUE (series_id, event_date)`: `series_id` NULL olan satırlar Postgres'te
çakışmaz, yani tekil etkinlikler bu kısıttan etkilenmez.

### Kolon bazlı yetki — ZORUNLU

`events` üzerindeki `GRANT INSERT, UPDATE, DELETE ... TO anon, authenticated`
(schema.sql:1161) **tablo bazlı** ve kolon daraltması yok. `series_id` eklenir
eklenmez kullanıcı kendi etkinliğini başkasının serisine yazabilir,
`occurrence_index`'i bozabilir, `seri_disina_alindi_at`'ı temizleyip düzenleme
izini silebilir.

Bu, QR check-in (2.6) ve topluluk duyuruları turlarında iki kez düşülen tuzağın
aynısı. Üçüncü kez düşmüyoruz:

```sql
-- 1) schema.sql:1161'deki toplu GRANT satirindan public.events CIKARILIR:
--    GRANT INSERT, UPDATE, DELETE ON TABLE public.communities TO anon, authenticated;
--    (public.events artik o listede DEGIL.)

-- 2) ONCE REVOKE, SONRA KOLON BAZLI GRANT. Kolon bazli REVOKE tablo bazli
--    GRANT'i EZMEZ; ayrica kolonsuz REVOKE o ayricalik icin kolon ACL'ini de
--    siler. Sira onemli. (20260828160000_rsvps_yazma_kolon_yetkisi.sql ornegi)
REVOKE INSERT, UPDATE ON TABLE public.events FROM anon, authenticated;

GRANT INSERT (title, description, location, event_date, organizer_id,
              community_id, cover_image_url, max_attendees)
  ON public.events TO authenticated;

GRANT UPDATE (title, description, location, event_date, cover_image_url,
              max_attendees)
  ON public.events TO authenticated;

-- DELETE tablo bazli kaliyor; "Organizator kendi etkinligini siler"
-- politikasi ona dayaniyor (rsvps DELETE emsali, schema.sql:1177).
```

`series_id`, `occurrence_index`, `updated_at`, `seri_disina_alindi_at`,
`attendee_count`, `reminder_sent_at`, `search_vector`, `created_at` listede
**yok** — yalnızca `SECURITY DEFINER` fonksiyonlar yazabilir.

Aynı blok `supabase/schema.sql`'e de yansıtılır ve **toplu GRANT'lerden SONRA**
konur (rsvps emsali, schema.sql:1176-1178). Sıra bozulursa koruma sessizce yok
olur.

---

## Yazma tarafı

Üç yeni `SECURITY DEFINER` fonksiyon var ve **üçü de aynı kalıbı izler**
(`checkin_yap`/`checkin_geri_al`, schema.sql:853-910):

```sql
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
```

`SECURITY DEFINER`, `events` UPDATE/DELETE politikalarını (schema.sql:1047-1061)
**tamamen atlar.** Kolon yetkisi kararı gereği (yukarıda) yazma tek yol olduğuna
göre **fonksiyon içi yetki kontrolü tek savunma katmanıdır.** `series_id` anon'a
bile okunabilir olduğu için hedef uuid'yi bulmak zahmetsiz; kontrol atlanırsa
herhangi bir kayıtlı kullanıcı başkasının serisinin tüm gelecek buluşmalarını
silebilir — ve `rsvps.event_id` / `waitlist.event_id` `ON DELETE CASCADE` olduğu
için tüm RSVP'ler, bekleme listeleri ve check-in token'ları da gider.

`seri_guncelle` ve `seri_sil`'in **ilk satırı** budur:

```sql
SELECT community_id INTO v_com FROM event_series WHERE id = p_series_id;
IF v_com IS NULL THEN RAISE EXCEPTION 'seri bulunamadi'; END IF;
IF NOT public.topluluk_yoneticisi_mi(v_com) THEN RAISE EXCEPTION 'yetkisiz'; END IF;
```

Ve **EXECUTE yetkileri açıkça verilir.** Postgres'te yeni fonksiyon varsayılan
olarak `PUBLIC`'e `EXECUTE` ile doğar; bu deponun kuralı bunu her yerde geri
alıyor (schema.sql:1201, 20 fonksiyonda uygulanmış):

```sql
REVOKE ALL ON FUNCTION public.seri_olustur(...)   FROM PUBLIC;
REVOKE ALL ON FUNCTION public.seri_guncelle(...)  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.seri_sil(...)       FROM PUBLIC;
REVOKE ALL ON FUNCTION public.etkinlik_guncelle(...) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seri_olustur(...)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.seri_guncelle(...)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.seri_sil(...)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.etkinlik_guncelle(...) TO authenticated;
-- anon'a hicbirinde EXECUTE verilmez.
```

### Seri oluşturma: tek RPC

`POST /api/event` ve `PATCH/DELETE /api/event/[id]` **"strict" rate limitte:
dakikada 3 istek.** Seri N ayrı POST ile kurulamaz — 4. tekrarda 429 alır,
yarım kalır ve geri alma yoktur.

```sql
CREATE FUNCTION seri_olustur(
  p_community_id uuid, p_title text, p_description text, p_location text,
  p_baslangic timestamptz, p_frekans text, p_tekrar_sayisi int,
  p_max_attendees int, p_cover_image_url text, p_istek_id uuid
) RETURNS TABLE (series_id uuid, ilk_event_id uuid, uretilen int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
```

- Yetki: `topluluk_yoneticisi_mi(p_community_id)` — duyurularda yazılan mevcut
  fonksiyon yeniden kullanılıyor, yeni yetki kodu yazılmıyor.
- **Tek işlem.** Ya seri + N tekrar tamamen oluşur ya hiçbiri.
- **İkizlenme:** `p_istek_id` istemcide (form ilk açıldığında) üretilir ve
  `UNIQUE (organizer_id, istek_id)` ile korunur. İkinci çağrı 23505 alır;
  fonksiyon bunu yakalayıp **mevcut seriyi döndürür**, yeni seri üretmez.
- Tarih üretimi `AT TIME ZONE 'Europe/Istanbul'` ile: Türkiye 2016'dan beri
  sabit UTC+3 olsa da saat aritmetiğini yaz saatine bağlı bırakmıyoruz.
  Aylık frekansta ayın 31'i olmayan aylarda ayın son gününe düşülür.
- `tekrar_sayisi` CHECK ile 2–26 arasında; API katmanı da zod ile aynı sınırı
  uygular (savunma iki katmanda).

### Düzenleme: üç kapsam

`PATCH /api/event/[id]` yeni parametre: `kapsam: 'tek' | 'sonrakiler' | 'tumu'`
(varsayılan `'tek'`).

| kapsam | hangi SATIRLAR | hangi KOLONLAR |
|---|---|---|
| `tek` | yalnızca o satır | title, description, location, **event_date**, cover_image_url, max_attendees |
| `sonrakiler` | o tekrar ve sonrakiler — **seriyi böler** | title, description, location, cover_image_url, max_attendees |
| `tumu` | serinin gelecekteki tekrarları | title, description, location, cover_image_url, max_attendees |

**`event_date` toplu kapsamda YAZILMAZ.** Üç sebep: (1) `eventEditSchema`
`event_date`'i zorunlu tutuyor ve form onu koşulsuz gönderiyor — toplu yola
olduğu gibi taşınsa **her seri ikinci satırda 23505 alır** ve işlem geri döner;
(2) tarih kaydırma serinin ritmini değiştirmek demek, ayrı ve açık bir işlem
olmalı; (3) `reminder_sent_at` sıfırlaması gerektirir. API sözleşmesi: **kapsam
toplu seçildiğinde gövdedeki `event_date` yok sayılır**, düzenleme formunda
tarih alanı kilitlenir ve arayüz sebebini söyler. Seri çapında tarih kaydırma
bu turun **kapsamı dışında**.

`seri_guncelle` imzasında **NULL parametre "bu kolona dokunma" demektir**;
gönderilmeyen alan `COALESCE` ile korunur.

**`sonrakiler` seriyi BÖLER.** Pivot ve sonrasındaki tekrarlar **yeni bir
`event_series` satırına** taşınır (aynı topluluk/organizatör, `baslangic` =
pivot tarihi, `istek_id` NULL). Google Takvim'in davranışı bu ve iki sorunu
birden çözüyor: (a) iki yarı ayrı ayrı katlanır, yani ikisi de kendi başlığıyla
aranabilir — bölme olmasaydı listeye yalnızca en yakın tekrar çıkacağı için
**yeni başlıkla arama hiç sonuç vermezdi**; (b) bölmeden sonra `tumu` tek anlama
gelir. Arayüz bunu söyler ("bu buluşma ve sonraki 7'si ayrı bir seri oldu").

**`tumu` ve `sonrakiler`, `seri_disina_alindi_at IS NOT NULL` olan tekrarları
ATLAR.** Elle düzeltilmiş bir buluşma toplu güncellemeyle ezilmez. Yanıt kaç
satırın güncellendiğini ve kaçının atlandığını döner; arayüz bunu söyler
("3 buluşma güncellendi, 1'i elle düzenlendiği için atlandı").

**Geçmiş koruması zorunlu.** `eventEditSchema`'da "gelecekte olmalı" kısıtı
bilinçli olarak yok (tek etkinlikte zararsız). Seri çapında bu boşluk tüm
seriyi geçmişe atmayı mümkün kılar. Toplu yol `event_date >= now()` filtresi
uygular ve `p_from` **her zaman `now()`'a kırpılır**:

```sql
v_from := GREATEST(COALESCE(p_from, now()), now());
```

### `tek` kapsamı: iz nasıl yazılıyor

Karar 4'ün ön koşulu ("izsiz tümü kapsamı açılmayacak") ancak izin **gerçekten
yazıldığı bir yol** varsa sağlanır. Bugünkü tekil düzenleme yolu
(`app/api/event/[id]/route.ts:125-130`) kullanıcının kendi oturumuyla düz
`.from('events').update(patch)` çağırıyor — ve `seri_disina_alindi_at` kolon
yetkisi listesinde **yok**. Olduğu gibi bırakılırsa ya her tekil düzenleme
42501 ile 500 döner ya da iz hiç yazılmaz ve `tumu` elle düzeltilmiş buluşmaları
sessizce ezer. İkisi de kabul edilemez.

Çözüm: **tekil düzenleme de bir RPC'den geçer.**

```sql
CREATE FUNCTION etkinlik_guncelle(
  p_event_id uuid, p_title text, p_description text, p_location text,
  p_event_date timestamptz, p_cover_image_url text, p_max_attendees int
) RETURNS TABLE (guncellendi boolean, iz_yazildi boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
```

- Yetki: **`etkinlik_yoneticisi_mi(p_event_id)`** (schema.sql:830) —
  `checkCanManage()`'in birebir DB karşılığı. `topluluk_yoneticisi_mi` burada
  **yetmez**: `events.community_id` NULLABLE, yani topluluğa bağlı olmayan
  etkinliklerde kontrol boşa düşerdi.
- `updated_at = now()` **her gerçek değişiklikte**.
- `seri_disina_alindi_at = now()` yalnızca `series_id IS NOT NULL` iken.
- `event_date` değiştiyse `reminder_sent_at = NULL` — yoksa taşınan buluşma
  için hatırlatma bir daha hiç gitmez. Sıfırlama fonksiyonun içinde olmalı,
  çünkü kolon istemciye kapalı.

**Damga gerçek farka bağlanır.** Altı düzenlenebilir alandan (title,
description, location, event_date, cover_image_url, max_attendees) en az biri
gerçekten değiştiyse yazılır. `route.ts:138-147`'deki mevcut `changes` hesabı
**yeniden kullanılmaz** — o hesap yalnızca title/event_date/location'a bakıyor,
yani sadece açıklamayı değiştiren biri iz bırakmazdı. Hiçbir şey değişmeden
"Kaydet"e basmak da iz bırakmamalı.

Arayüzde izi temizleyen açık ve geri alınabilir bir eylem var: **"bu buluşmayı
seriye geri kat"** (`seri_disina_alindi_at = NULL`).

### Silme

`DELETE /api/event/[id]` aynı `kapsam` parametresini alır. `tumu`/`sonrakiler`
`seri_sil(p_series_id, p_kapsam, p_from)` fonksiyonuna gider. Geçmiş tekrarlar
**silinmez** — katılım geçmişi ve check-in kayıtları korunur; `p_from` yukarıdaki
`GREATEST(..., now())` ile kırpılır ve `DELETE` koşulunda `event_date >= now()`
**ikinci kez** yazılır (`p_kapsam='tumu'` dalında da geçmişi kilitleyen ikinci
savunma).

`seri_sil` aynı işlem içinde **kuyruğu da temizler:**

```sql
DELETE FROM email_outbox
 WHERE sent_at IS NULL AND template = 'reminder'
   AND (payload->>'event_id')::uuid = ANY(v_silinen_idler);
```

Yoksa iptal mailinden sonra "Yarın: X" gider ve mailin takvim bağlantısı silinmiş
uuid'ye 404 döner.

### Bildirim

Materyalize model bildirimi çarpar: 26 tekrarlı bir seri, tekrar başına mail
atılırsa tek işlemde 26 × üye sayısı mail üretir. Kural: **kişi başına tek
mail, tekrar başına değil.**

| olay | kime | kaç mail | gövde |
|---|---|---|---|
| seri oluşturma | topluluk üyeleri | üye başına **1** | "Kitap Kulübü — haftalık, 12 buluşma, ilki 2 Eylül salı 19:00" |
| toplu düzenleme | etkilenen katılımcılar | kişi başına **1** | "Salı Kitap Kulübü — 11 buluşmanın mekânı değişti" |
| toplu silme | etkilenen katılımcılar | kişi başına **1** | "Salı Kitap Kulübü — kalan 11 buluşma iptal edildi" |

- Oluşturmada mevcut `get_member_emails(community_id, exclude)` (schema.sql:734)
  olduğu gibi kullanılır.
- Düzenleme/silmede yeni bir fonksiyon gerekiyor: mevcut
  `get_event_rsvp_emails` (schema.sql:756) **tek etkinlik** alıyor ve silmeden
  sonra çağrılırsa hiçbir adres kalmıyor. `seri_guncelle` ve `seri_sil`
  **etkilenen tekrarların tekilleştirilmiş alıcı listesini işlem içinde,
  silmeden ÖNCE hesaplayıp döndürür** (`email_izni(user_id,'event_change')`
  süzgecinden geçirerek).
- **Gönderim `email_outbox`'a yazılır**, senkron gönderilmez — `queue_*` deseni
  zaten var (schema.sql:597). Toplu işlemin gönderim süresi PATCH/DELETE
  isteğinin süresine eklenmez.

### Hatırlatma kapasitesi

26 tavanı 6 aylık **toplam** satırı sınırlar; bağlayıcı kısıt **günlük tepe**:
aynı gün toplanan seri sayısı × RSVP sayısı. Sayılar:

- cron **günde bir** koşuyor (`vercel.json`: `0 6 * * *`),
- koşu başına ~**83 mail** tavanı (`SURE_BUTCESI_MS` 50.000 / `MAIL_ARASI_MS`
  600, `app/api/cron/reminders/route.ts:159-163, 252`),
- `claim_email_outbox` `LIMIT 200`, ve **tüm şablonlar aynı kuyruğu paylaşıyor.**

Günlük tepe tek koşunun kapasitesini aşarsa taşan hatırlatmalar ertesi gün,
yani **etkinlik geçtikten sonra** gider. Bu turda iki şey alınıyor:

1. `seri_olustur` aynı gün/saat penceresine yığılmayı ölçer ve tavana
   yaklaşıldığında uyarır.
2. Cron sonunda `sureDoldu` ya da kuyruk derinliği tavanı aşmışsa
   `Sentry.captureMessage` ile alarm.

**Karar:** cron'u saatliğe çıkarmak (Vercel Pro) bu turun dışında; kuyruk alarmı
tetiklendiğinde tekrar değerlendirilecek.

---

## Okuma tarafı: katlama

Haftalık bir seri 12 satır olduğu için **altı yüzeyde aynı etkinlik 12 kez
görünür.** Katlama veritabanı tarafında, tek yerde tanımlanıyor.

```sql
-- security_invoker = true ZORUNLU: unutulursa view, events SELECT
-- politikasini atlar ve ONAYLANMAMIS topluluk etkinlikleri listelere sizar.
-- Gorunur bir patlama olmaz; sessiz bir guvenlik acigidir.
CREATE VIEW etkinlik_vitrin WITH (security_invoker = true) AS
SELECT e.*
FROM public.events e
WHERE e.event_date >= now()
  AND (
    e.series_id IS NULL
    OR e.seri_disina_alindi_at IS NOT NULL
    OR NOT EXISTS (
      SELECT 1 FROM public.events e2
      WHERE e2.series_id = e.series_id
        AND e2.seri_disina_alindi_at IS NULL
        AND e2.event_date >= now()
        AND e2.event_date < e.event_date
    )
  );

GRANT SELECT ON public.etkinlik_vitrin TO anon, authenticated;
```

**Neden `DISTINCT ON` değil.** İlk taslak `DISTINCT ON (COALESCE(series_id, id))`
kullanıyordu; bu biçim okuma tarafını site çapında tam taramaya düşürür.
Postgres, `DISTINCT ON` listesinde olmayan kolonlar üzerindeki koşulları alt
sorguya **itemez** (`allpaths.c` / `check_output_expressions`: DISTINCT ON'da
olmayan her kolon "unsafe" işaretlenir) ve view pull-up da edilemez. Sonuç:
altı yüzeyin filtresi dedup'tan **sonra** çalışır, `events_search_vector_idx`
(GIN) ve `idx_events_community_id` erişilemez hâle gelir.

Yukarıdaki biçim yalnızca `WHERE` içeriyor, yani çağıranın sorgusuna
**düzleştirilir**: `.textSearch`, `city_key ilike` ve `community_id` koşulları
doğrudan `events`'e uygulanır ve indeksler kullanılır. `NOT EXISTS`
`idx_events_series`'i kullanır.

**`seri_kalan` view'ın target list'inde YOK.** Korele alt sorgu olarak orada
dursaydı satır başına koşardı — asıl maliyet kaynağı orasıydı. Rozet sayısı
ayrı ve tek bir çağrıyla geliyor: `seri_kalanlar(p_series_ids uuid[])`, sayfada
toplanan seri kimlikleri için tek round-trip.

**Elle düzenlenmiş tekrar serinin temsilcisi sayılmaz** ve kendi kartıyla
görünür (`seri_disina_alindi_at IS NOT NULL` dalı). Zaten seriden ayrılmış
sayılıyor; listede saklanması kullanıcıyı yanıltırdı.

**Önce keşfette doğrulanacak.** `app/kesfet/page.tsx` en kırılgan yer:
`.textSearch` + `communities!inner` embed + `city_key ilike` + `.range()`
kombinasyonu view üzerinde çalıştırılmadı. Doğrulanmadan diğer yüzeylere
geçilmez ve doğrulama `EXPLAIN` ile yapılır — "sonuç doğru" yetmez, indeksin
gerçekten kullanıldığı görülecek.

### Topluluk sayfası: iki sorgu, bir takvim

`app/community/[id]/page.tsx` tek sorgu değil, üç ayrı ihtiyaç var:

1. **Yaklaşan** (`.gte('event_date', nowIso)`) → view'a geçer. Bu sorguda
   **hiç LIMIT yok** (doğrulandı); katlamadan bağımsız olarak limit bu turda
   konuyor, 52 satır bugün de ağdan geçiyor.
2. **Geçmiş** (`.lt('event_date', nowIso)`, limit 6) → **view'a geçemez**
   (view yalnızca geleceği içeriyor). Bu turda **katlanmıyor**; geçmiş liste
   serinin son tekrarlarını ayrı ayrı gösterir. Bilinçli.
3. **Takvim noktaları** → katlanmış listeden **beslenmez.** `eventDays` kümesi
   için ay aralığıyla sınırlı, yalnız `event_date` seçen ayrı ve katlanmamış
   bir sorgu kullanılır — yoksa takvimde serinin tek bir günü işaretlenir.

Sayfa altındaki "N yaklaşan buluşma" sayacı `upcoming.length` yerine
`seri_kalanlar` toplamını kullanır.

Diğer kullanan yüzeyler: ana sayfa, keşfet, etkinlik kenar kolonu, sitemap.
Etkinlik **detay** sayfası view kullanmaz — orada tek bir buluşma gösteriliyor.

---

## Arayüz

**Oluşturma** (`app/event/new/new-event-form.tsx`): "Tekrarlanan buluşma"
onay kutusu → frekans seçici + tekrar sayısı. Kapalıyken form bugünkü gibi
davranır. Form ilk açıldığında bir `istek_id` üretir (`crypto.randomUUID()`).
`router.push(/event/${data.event.id})` davranışı korunuyor; seri yanıtı
`ilk_event_id` döndürüyor.

**Kart** (`components/event-card.tsx`): seri rozeti — "haftalık · 8 buluşma
kaldı". Aynı başlıklı iki kartı ayırt edecek sinyal bugün yok.

**Detay** (`app/event/[id]/page.tsx`): seri üyesiyse künye ızgarasındaki
GERÇEKLER bloğuna "Seri" satırı ve serinin sonraki 3 buluşmasına bağlantı.
"Topluluğun diğer etkinlikleri" listesi aynı seriyi elemeli — bugün
`.neq('id', id)` dışında eleme yok, liste aynı serinin 4 tekrarıyla dolar.

**Düzenle/Sil**: kapsam seçici; toplu kapsamda tarih alanı kilitli ve sebebi
yazılı. Silme UI'ı **iki ayrı yerde** kodlanmış (`edit-event-form.tsx` ve
`event-actions.tsx`); ikisi de güncellenmeli.

---

## Dosyalar

| dosya | işlem |
|---|---|
| `supabase/migrations/<ts>_tekrarlayan_seriler.sql` | yeni |
| `supabase/schema.sql` | güncellenir (baseline): `events` toplu GRANT'ten çıkarılır, kolon GRANT'leri + `event_series` + view + fonksiyon EXECUTE'ları eklenir |
| `lib/validations.ts` | `seriOlusturSchema`, `eventEditSchema`'ya `kapsam` |
| `app/api/event/route.ts` | seri dalı (`seri_olustur` RPC) |
| `app/api/event/[id]/route.ts` | `etkinlik_guncelle` RPC'ye geçiş; `kapsam` dalları |
| `app/event/new/new-event-form.tsx` | tekrar alanları + `istek_id` |
| `app/event/[id]/edit-event-form.tsx`, `components/event-actions.tsx` | kapsam seçici |
| `components/event-card.tsx` | seri rozeti |
| `app/event/[id]/page.tsx` | künye "Seri" satırı, aynı seriyi eleme |
| `app/page.tsx`, `app/kesfet/page.tsx`, `app/community/[id]/page.tsx`, `app/sitemap.ts` | `etkinlik_vitrin` |
| `app/api/cron/reminders/route.ts` | kuyruk derinliği alarmı |

---

## Kapsam dışı (bilinçli)

- **Seri çapında tarih kaydırma.** Toplu kapsam `event_date` yazmıyor
  (gerekçe yukarıda). Ayrı bir işlem olarak sonraki turda.
- **`.ics`'e RRULE.** `app/event/[id]/ics/route.ts` yalnızca DTSTART/DTEND
  üretiyor. Materyalize modelde her tekrarın kendi `.ics`'i doğru; seri
  çapında tek RRULE ayrı bir iş.
- **Seriye tek seferde katılma ("tüm seriye katıl").** Karar 2'de model
  buluşma başına seçildi; toplu RSVP yazan RPC ikinci turda eklenebilir.
- **Geçmiş listelerin katlanması.** Topluluk sayfasının geçmiş sorgusu
  katlanmıyor (yukarıda).
- **Seri sayfası / canonical URL.** `sitemap.ts` bir seri için tek URL üretecek
  (view sayesinde), ama seri için kendi sayfası yok. SEO açısından doğru çözüm
  seri sayfası + canonical; bu tur yalnızca sitemap'e view uyguluyor.
- **Seriyi uzatma.** 26 tavanına gelen seri için "12 hafta daha ekle".
- **Cron'u saatliğe çıkarmak.** Kuyruk alarmı tetiklenince değerlendirilecek.

## Kapsam dışı ama BU İŞLE ORTAYA ÇIKAN mevcut hatalar

Seri bunları yaratmıyor ama **hacmi artırdığı için** tehlikeli hâle getiriyor.
Ayrı ele alınacaklar, bu spec'e dahil değiller:

- `email_outbox` üzerinde **hiçbir indeks yok**; `claim_email_outbox` her koşuda
  `WHERE sent_at IS NULL` ile tam tarama yapıyor.
- **FIFO açlığı:** `ORDER BY o.id LIMIT 200`. Birikme başlayınca taze
  hatırlatmalar arkada kalır, etkinlik geçtikten sonra "Yarın: X" gider.
- **Kaçırılan cron koşusu kalıcı kayıp:** sorgu `.gte('event_date', now)`
  içerdiği için o gün gerçekleşen etkinlikler bir daha hiç seçilmez.
- **Faz 1 döngüsünde süre bütçesi kontrolü yok** (yalnızca faz 3'te var);
  etkinlik başına iki ardışık RPC round-trip yapılıyor.
- **Konu satırı sabit `Yarın: <başlık>`** ama pencere `[now, now+24h]` ve koşu
  09:00 TR — aynı gün akşamki buluşma için de "Yarın" yazıyor.
- `PATCH` `max_attendees`'i mevcut doluluğa karşı doğrulamıyor.
- `promote_from_waitlist`'teki `on conflict do nothing`: çakışmada RSVP
  yazılmaz ama `promoted_at` yine dolar → kullanıcıya RSVP'siz "Yerin hazır".
- `checkCanManage()` RLS mantığını TypeScript'te **üç ayrı yerde** tekrarlıyor.

## Doğrulama

1. `npm run typecheck && npm run lint && npm run build` — üçü de geçer,
   lint taban 87 uyarı / 0 hata.
2. **İkizlenme:** aynı `istek_id` ile `seri_olustur`'u iki kez çağır → ikinci
   çağrı **yeni seri oluşturmaz**, mevcut seriyi döndürür. `event_series`
   satır sayısı sayılarak doğrulanır.
3. **Kolon yetkisi:** `authenticated` rolüyle `UPDATE events SET series_id = ...`
   dene → reddedilmeli. Ayrıca `grep` ile `schema.sql`'de `events`'in toplu
   `GRANT INSERT, UPDATE, DELETE` listesinde **olmadığı** doğrulanır ve baseline
   temiz bir projede çalıştırılıp aynı test tekrarlanır.
4. **Tablo yetkisi:** yetkisiz bir `authenticated` kullanıcı `event_series`'e
   `DELETE`/`UPDATE` denesin → reddedilmeli. `anon` hem `event_series`'i hem
   `etkinlik_vitrin`'i `SELECT` edebilmeli.
5. **Fonksiyon yetkisi:** topluluğa üye olmayan bir kullanıcı `seri_sil` ve
   `seri_guncelle` çağırsın → `yetkisiz`. `anon` rolüyle RPC çağrısı →
   `EXECUTE` reddedilmeli.
6. **RLS sızıntısı:** onaylanmamış topluluğa etkinlik ekle, anonim olarak
   `etkinlik_vitrin`'i sorgula → görünmemeli. (`security_invoker` testi.)
7. **Katlama + plan:** 12 tekrarlı seri kur → ana sayfa, keşfet ve topluluk
   sayfasında **bir** kart. Keşfette arama + şehir filtresi + sayfalama
   birlikte çalışsın. `EXPLAIN` ile: keşfet aramasında
   `events_search_vector_idx`, topluluk sayfasında `idx_events_community_date`
   gerçekten kullanılıyor mu.
8. **Takvim ve geçmiş:** topluluk sayfasında serinin **tüm** günleri takvimde
   işaretli olmalı (katlanmış listeden beslenmediğinin testi); geçmiş liste
   ayrı ayrı tekrarları göstermeli.
9. **Bölme:** 12'lik serinin 5. tekrarında `kapsam=sonrakiler` ile başlığı
   değiştir → iki ayrı seri oluşmalı, listede **iki** kart çıkmalı ve **yeni
   başlıkla arama sonuç vermeli.**
10. **Geçmiş koruması:** geçmiş tekrarı olan seride `kapsam=tumu` ile güncelle
    → geçmiş satırlar değişmemeli. `kapsam=sonrakiler` + geçmiş bir `p_from`
    ile sil → geçmiş satırlar durmalı.
11. **Toplu kolon matrisi:** `kapsam=tumu` ile **sadece konumu** değiştir →
    11 satır güncellenmeli, `event_date`'ler değişmemeli, 23505 alınmamalı.
12. **Elle düzenleme izi:** bir tekrarı tek başına düzenle → iz yazılmalı,
    sonra `kapsam=tumu` çalıştır → o tekrar atlanmalı ve yanıt bunu söylemeli.
    Negatif test: hiçbir şey değiştirmeden "Kaydet"e bas → `seri_disina_alindi_at`
    NULL kalmalı. Pozitif test: yalnızca açıklamayı değiştir → damga yazılmalı.
13. **Hatırlatma:** seri kur, cron'u elle tetikle → yalnızca 24 saat içindeki
    tekrar için mail kuyruğa girsin. Tekil düzenlemeyle tarihi taşı →
    `reminder_sent_at` NULL olmalı.
14. **Bildirim hacmi:** 12'lik seriyi 3 üyeli toplulukta kur → `email_outbox`'ta
    **3 satır** olmalı, 36 değil. Toplu sil → katılımcı başına **1** iptal maili
    ve o tekrarların gönderilmemiş `reminder` satırları kuyruktan silinmiş olmalı.
