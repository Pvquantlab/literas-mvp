# literas — Kurulum Rehberi

> Son güncelleme: 28 Ağustos 2026.
> Bu rehber projeyi **sıfırdan** ayağa kaldırmak içindir: yeni bir bilgisayarda
> geliştirme ortamı kurmak, ya da yeni bir Supabase/Vercel hesabında baştan
> yayına almak. Adım adım gider; her adımda ne olması gerektiğini yazar.

---

## literas nedir?

Türkiye odaklı, Meetup benzeri genel amaçlı topluluk ve etkinlik platformu.
Kullanıcılar topluluk kurar, etkinlik açar, katılır.

Bugün **çalışan** özellikler:

- E-posta ve Google ile kayıt/giriş, e-posta doğrulama
- 5 adımlı topluluk kurma sihirbazı, yönetici onayı
- Etkinlik oluşturma, düzenleme, iptal; RSVP; kontenjan ve bekleme listesi
- Türkçe tam metin arama, şehir ve kategori filtreleri
- WhatsApp paylaşımı için OG görselleri, takvime ekleme (.ics)
- E-posta bildirimleri (hatırlatma, katılım isteği, etkinlik değişikliği)
- Şikayet mekanizması ve yönetici paneli
- PWA (ana ekrana eklenebilir)

Henüz **yok**: ödeme/ücretli etkinlik, mesajlaşma, QR ile giriş, mobil uygulama.

---

## Ne kadar sürer?

Yaklaşık 1–2 saat. Yarısı hesap açma ve bekleme.

Teknik bilgi gerektirir: komut satırı kullanmak, hesap açmak, ayar panellerinde
gezinmek. Hiç tecrüben yoksa da yapabilirsin — sadece acele etme. Hata mesajları
korkutucu görünür ama çoğu basittir. Takılırsan hata metnini kopyalayıp sor.

---

# Bölüm 1 — Hesaplar

Beş hesaba ihtiyacın var. Hepsinin ücretsiz planı bu proje için yeterli.

| Servis | Ne işe yarıyor | Adres |
|---|---|---|
| GitHub | Kodun durduğu yer | github.com |
| Supabase | Veritabanı, giriş sistemi, dosya depolama | supabase.com |
| Vercel | Siteyi yayınlama | vercel.com |
| Resend | E-posta gönderimi | resend.com |
| Upstash | İstek sınırlama (rate limit) | upstash.com |

**Supabase projesi açarken** bölge olarak Frankfurt (`eu-central-1`) seç —
Türkiye'ye en yakını. Sana bir **veritabanı parolası** sorar; onu güvenli bir
yere kaydet, sonra lazım olacak ve bir daha gösterilmiyor.

---

# Bölüm 2 — Geliştirme ortamı

**Node.js 22 veya üstü** gerekiyor. nodejs.org'dan LTS sürümünü kur.

Kurduğunu doğrula:

```bash
node --version
```

`v22.` veya üstü görmelisin.

Bir de kod düzenleyici lazım — VS Code (code.visualstudio.com) iş görür.

---

# Bölüm 3 — Kodu indir

```bash
git clone https://github.com/Pvquantlab/literas-mvp.git
```

Sonra klasöre gir ve bağımlılıkları kur:

```bash
cd literas-mvp && npm install
```

1–3 dakika sürer. Bittiğinde `node_modules` klasörü oluşur.

---

# Bölüm 4 — Veritabanını kur

## 4.1 Şemayı yükle

Supabase panelinde **SQL Editor → New query** aç. Projedeki
`supabase/schema.sql` dosyasının **tamamını** kopyalayıp yapıştır ve **Run**'a bas.

Bu tek dosya her şeyi kurar: 16 tablo, 22 fonksiyon, 8 trigger, RLS
politikaları, indeksler ve görünüm.

> **`supabase/migrations/` klasörünü bu iş için kullanma.** O klasör tarihsel
> değişiklik kaydı; sıfırdan kurulum için tasarlanmadı. Şemayı *değiştirmek*
> istediğinde oraya yeni dosya yazarsın.

Doğrulama: **Table Editor**'da `profiles`, `communities`, `events`, `rsvps` gibi
tabloları görmelisin.

## 4.2 Referans verisini yükle

Şema geldi ama `topics`, `topic_categories` ve `locations` tabloları **boş**.
Bunlar olmadan topluluk kurma sihirbazının konu ve şehir adımları çalışmaz.

Bu veriyi mevcut bir kurulumdan almanız gerekir. Elinizde çalışan bir Supabase
projesi varsa, SQL Editor'da şu sorguyla dışa aktarabilirsiniz:

```sql
select 'insert into topics (id,slug,name,search_text,is_popular) values ' ||
       string_agg(format('(%s,%L,%L,%L,%L)', id, slug, name, search_text, is_popular), ',') || ';'
from topics;
```

Aynısını `topic_categories`, `topic_category_map` ve `locations` için de yapın,
çıkan `insert` cümlelerini yeni projede çalıştırın.

## 4.3 Cron sırrını kaydet

Zamanlanmış görevleri (hatırlatma mailleri) korumak için bir gizli anahtar
üret ve veritabanına yaz.

```bash
openssl rand -base64 32
```

Çıkan değeri **bir yere kaydet** — üç ayrı yere aynısını gireceksin. İlki
burası; Supabase SQL Editor'da:

```sql
insert into public.app_secrets (key, value)
values ('cron_secret', 'BURAYA-URETTIGIN-DEGERI-YAZ')
on conflict (key) do update set value = excluded.value;
```

## 4.4 Depolama kovalarını oluştur

**Storage → New bucket** ile üç kova oluştur. Her biri **Public** olacak ve
ayarları şöyle:

| Kova adı | Boyut limiti | İzinli tipler |
|---|---|---|
| `avatars` | 2 MB | `image/jpeg`, `image/png`, `image/webp` |
| `community-covers` | 5 MB | `image/jpeg`, `image/png`, `image/webp` |
| `event-covers` | 5 MB | `image/jpeg`, `image/png`, `image/webp` |

> **Bu limitler önemli.** `lib/upload.ts` içindeki `KOVA_LIMIT_MB` değerleriyle
> **birebir aynı** olmalı. Ayrışırsa kullanıcı istemci kontrolünü geçer, sonra
> sunucudan ham İngilizce hata alır. Bu bir kez yaşandı.

Sonra her kova için politika ekle (**Storage → Policies**): yükleme yalnızca
giriş yapmışlara, silme/güncelleme yalnızca dosya sahibine.

## 4.5 Giriş ayarları

**Authentication → Sign In / Providers → Email**: "Confirm email" açık olsun.
Kapalıysa kullanıcı doğrulamadan giriş yapar.

**Authentication → URL Configuration**:
- Site URL: yayına aldığın adres (örn. `https://www.literaslab.com`)
- Redirect URLs listesine ekle: `https://ALAN-ADIN/auth/callback` ve yerel
  geliştirme için `http://localhost:3000/auth/callback`

Google ile giriş istiyorsan **Providers → Google**'ı açıp Google Cloud'dan
aldığın Client ID ve Secret'ı gir.

---

# Bölüm 5 — E-posta (Resend)

Burası kurulumun en çok takıldığı yer, dikkatli oku.

## 5.1 Alan adını doğrula

Resend'de **Domains → Add Domain** ile alan adını ekle. Resend sana DNS
kayıtları verir; bunları **alan adının DNS'ini yöneten yere** eklersin.

> **Dikkat:** DNS'i yöneten yer, siteyi yayınladığın yer olmak zorunda değil.
> Bu projede site Vercel'de ama DNS Natro'da. Kayıtları yanlış yere eklersen
> hiçbir şey olmaz. Nameserver'ları şununla kontrol edebilirsin:
>
> ```bash
> dig +short NS ALAN-ADIN
> ```

**Alan adı doğrulanmadan Resend hiçbir mail göndermez** — her isteği
`403 domain is not verified` ile reddeder. Bu proje bu yüzden bir ay boyunca
tek bir mail teslim etmedi ve kimse fark etmedi.

DNS paneliniz CNAME kabul etmiyorsa (bazı Türk hosting panelleri etmiyor),
Resend'in alan adı sayfasındaki **⋯** menüsünden klasik kuruluma geçin — o
CNAME yerine MX + TXT kullanır ve neredeyse her panel bunları kabul eder.

## 5.2 API anahtarı al

**API Keys → Create API Key**. Değeri kaydet, bir daha gösterilmez.

## 5.3 Gönderen adresi

Kod `lib/email.ts` içinde `bildirimler@literaslab.com` adresinden gönderiyor.
Kendi alan adını kullanıyorsan orayı değiştir.

---

# Bölüm 6 — Rate limit (Upstash)

Upstash'te bir **Redis** veritabanı oluştur (Frankfurt bölgesi). Panelden iki
değeri kopyala: `UPSTASH_REDIS_REST_URL` ve `UPSTASH_REDIS_REST_TOKEN`.

Bu ikisi tanımlı değilse rate limit **sessizce devre dışı kalır** — yerel
geliştirmede sorun değil, canlıda mutlaka tanımla.

---

# Bölüm 7 — Yerel ortam dosyası

Proje kök klasöründe `.env.local` adında bir dosya oluştur (başında nokta var).
`.env.example` dosyasını örnek alabilirsin.

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
RESEND_API_KEY=re_...
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
CRON_SECRET=4.3'te-urettigin-deger
```

İlk ikisini Supabase panelinde **Project Settings → API** altında bulursun.

> `.env.local` `.gitignore`'da — asla commit edilmez. `.env.example`'a da
> **gerçek değer yazma**; orası sadece hangi değişkenlerin gerektiğini gösterir.

Tırnak yok, boşluk yok, satır başına bir değişken.

---

# Bölüm 8 — Çalıştır

```bash
npm run dev
```

Tarayıcıda `http://localhost:3000` aç.

Sağlık kontrolü — üçü de hatasız geçmeli:

```bash
npm run typecheck && npm run lint && npm run build
```

Denemen gerekenler: kayıt ol (doğrulama maili gelmeli), giriş yap, topluluk kur,
etkinlik aç, RSVP ver, profil fotoğrafı yükle.

---

# Bölüm 9 — Yayına al (Vercel)

## 9.1 Projeyi bağla

Vercel'de **Add New → Project**, GitHub reposunu seç, **Import**.

**Environment Variables** kısmına `.env.local`'daki **altı değişkeni de** gir.
`RESEND_API_KEY`, `UPSTASH_*` ve `CRON_SECRET`'i **Sensitive** işaretle.

**Deploy**'a bas, 2-3 dakika bekle.

## 9.2 Env değiştirdiğinde yeniden dağıt

> **En sık düşülen tuzak bu.** Vercel'de bir ortam değişkenini değiştirmek
> çalışan dağıtımı **güncellemez**. Değeri kaydettikten sonra
> **Deployments → ⋯ → Redeploy** demen gerekir. Sıra da önemli: önce env'i
> kaydet, sonra redeploy. Ters yaparsan eski değer çalışmaya devam eder.

## 9.3 Cron sırrını üçüncü yere gir

`CRON_SECRET` **üç yerde birebir aynı** olmalı, yoksa zamanlanmış görevler
çalışmaz:

1. `.env.local` (yerel)
2. Vercel ortam değişkenleri
3. Supabase `app_secrets` tablosu, `key = 'cron_secret'`

Doğrulama — 200 ve `ok: true` dönmeli:

```bash
curl -H "Authorization: Bearer SIRRIN" https://ALAN-ADIN/api/cron/reminders
```

`401` alıyorsan Vercel'deki değer tutmuyor (ya da redeploy etmedin).
`500 Kutu açılamadı` alıyorsan Supabase'deki değer tutmuyor.

## 9.4 Alan adını bağla

Vercel'de **Settings → Domains**, alan adını ekle, Vercel'in verdiği DNS
kayıtlarını DNS sağlayıcına gir.

Sonra Supabase'de **Authentication → URL Configuration**'daki Site URL ve
Redirect URL'leri yeni adrese göre güncelle.

## 9.5 Zamanlanmış görev

`vercel.json` cron'u tanımlı: günde bir, 06:00 UTC (09:00 Türkiye).

Vercel'in **Hobby** planı günde birden sık cron'a izin vermiyor ve fonksiyon
süre limiti 60 saniye. `app/api/cron/reminders/route.ts` bu limitlere göre
ayarlı; Pro'ya geçersen oradaki yorumda yazan değerleri yükseltebilirsin.

---

# Sık karşılaşılan sorunlar

**Mail hiç gitmiyor, hata da yok.**
Resend'de alan adı doğrulanmamıştır. Vercel'de **Logs**'a bakıp
`domain is not verified` arayın. Bu hata uygulamayı durdurmaz, sessizce geçer.

**Kayıt oluyorum ama giriş yapmış olmuyorum.**
Doğru davranış. E-posta doğrulama açıksa "Postanı kontrol et" ekranı gelir,
maildeki bağlantıya tıklayınca giriş yapmış olursun.

**Giriş sonrası "Giriş tamamlanamadı" diyor.**
Supabase'deki Redirect URL listesinde `https://ALAN-ADIN/auth/callback` yok.

**Görsel yükleyemiyorum.**
Kova ayarlarındaki boyut/MIME limitleri `lib/upload.ts` ile aynı mı, kontrol et.

**Cron 401 dönüyor.**
`CRON_SECRET` üç yerde aynı değil ya da Vercel'de env değişikliğinden sonra
redeploy yapılmadı.

**Arama sonuç bulmuyor.**
`unaccent` uzantısı kurulu mu bak — `supabase/schema.sql` kuruyor ama
elle atlanmış olabilir.

---

# Günlük kullanım

```bash
npm run dev
```

```bash
npm run build
```

```bash
npm run lint
```

```bash
npm run typecheck
```

---

# Nereye bakmalı?

| Ne arıyorsan | Nereye bak |
|---|---|
| Proje kuralları, mimari kararlar | `CLAUDE.md` |
| Yol haritası, yapılanlar ve bilinen borçlar | `literas-yol-haritasi.md` |
| Ürün vizyonu ve stratejik kararlar | `literas-vizyon-ve-kararlar.md` |
| Tam veritabanı şeması | `supabase/schema.sql` |
| Şema değişiklik geçmişi | `supabase/migrations/` |

---

Takıldığın yerde hata mesajını kopyala ve sor. Çoğu sorun ayar kaynaklıdır,
kod kaynaklı değil — ve bu rehberdeki uyarılar bir kez gerçekten yaşanmış
sorunlardan yazıldı.
