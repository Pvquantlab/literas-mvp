# literas

Türkiye odaklı, genel amaçlı topluluk ve etkinlik platformu. İnsanlar topluluk
kurar, etkinlik açar, katılır.

**Canlı:** [www.literaslab.com](https://www.literaslab.com)

Niş bir ürün değil — 14 keşfet kategorisi eşit ağırlıkta. Farklılaşma noktaları:
UX kalitesi, adil ve şeffaf fiyatlandırma, Türkçe yerellik ve şehir bazlı
yoğunlaşma.

---

## Ne çalışıyor

- E-posta ve Google ile kayıt/giriş, e-posta doğrulama akışı
- 5 adımlı topluluk kurma sihirbazı, yönetici onay süreci
- Etkinlik oluşturma, düzenleme, iptal · RSVP · kontenjan ve bekleme listesi
- Türkçe tam metin arama (Postgres FTS), şehir ve kategori filtreleri
- WhatsApp paylaşımı için otomatik OG görselleri, takvime ekleme (`.ics`)
- E-posta bildirimleri: hatırlatma, katılım isteği, etkinlik değişikliği/iptali
- Kullanıcı bildirim tercihleri (işlemsel mailler ayrı tutulur)
- Şikayet mekanizması ve yönetici paneli
- PWA — ana ekrana eklenebilir, statik dosyalar çevrimdışı önbellekte

**Henüz yok:** ödeme/ücretli etkinlik, mesajlaşma, QR ile giriş, mobil uygulama.

---

## Teknoloji

| Katman | Seçim |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Veritabanı, giriş, depolama | Supabase (Postgres, RLS zorunlu) |
| E-posta | Resend |
| Rate limit | Upstash Redis |
| Harita | Leaflet |
| Doğrulama | zod |
| Barındırma | Vercel |

Yetkilendirme **her zaman** Postgres RLS ile çözülür; `service_role` anahtarı
hiçbir yerde kullanılmaz.

---

## Hızlı başlangıç

```bash
git clone https://github.com/Pvquantlab/literas-mvp.git
```

```bash
cd literas-mvp && npm install
```

`.env.example`'ı `.env.local` olarak kopyala ve doldur. Sonra:

```bash
npm run dev
```

> Kendi Supabase/Vercel/Resend hesaplarınla sıfırdan kurulum yapıyorsan
> **[KURULUM-REHBERI.md](KURULUM-REHBERI.md)** dosyasını izle — veritabanı
> şeması, depolama kovaları, e-posta alan adı doğrulaması ve cron sırrı gibi
> adımlar orada tek tek anlatılıyor.

### Komutlar

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

## Dizin yapısı

```
app/
  page.tsx              ana sayfa — etkinlik listesi, şehir/kategori filtresi
  kesfet/               keşfet: sekmeler, kategori şeridi, FTS arama, sayfalama
  event/[id]/           etkinlik detayı: RSVP, harita, paylaşım, .ics, düzenleme
  event/new/            etkinlik oluşturma
  community/[id]/       topluluk sayfası, üyelik yönetimi
  community/new/        5 adımlı kurma sihirbazı
  ayarlar/              profil, hesap, gizlilik, bildirimler, ilgi alanları...
  admin/                yönetici paneli — topluluk onayı, şikayetler
  api/                  route handler'lar (event, report, waitlist, cron...)
components/             paylaşılan bileşenler
lib/                    supabase, email, date, upload, validations, rate-limit
supabase/
  schema.sql            TAM ŞEMA — sıfırdan kurulum ve felaket kurtarma
  migrations/           şema değişiklik geçmişi
```

---

## Belgeler

| Dosya | İçerik |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Proje bağlamı, kod kuralları, mimari kararlar |
| [KURULUM-REHBERI.md](KURULUM-REHBERI.md) | Sıfırdan kurulum, adım adım |
| [literas-yol-haritasi.md](literas-yol-haritasi.md) | Yol haritası, yapılanlar, bilinen borçlar |
| [literas-vizyon-ve-kararlar.md](literas-vizyon-ve-kararlar.md) | Ürün vizyonu ve stratejik kararlar |
| [supabase/schema.sql](supabase/schema.sql) | Tam veritabanı şeması |

---

## Katkı kuralları

Bu kurallar `CLAUDE.md`'de ayrıntılı; özeti:

1. Kullanıcıya görünen tüm metin **Türkçe**.
2. Her API rotası ve server action şu sırayı izler:
   `auth.getUser()` → rate limit → zod doğrulama → yetki kontrolü.
3. E-posta HTML'inde her değişken `escapeHtml()` ile kaçırılır.
4. Yeni tablo veya kolon = migration dosyası + RLS politikası + gerekli index.
   İstisnasız.
5. Tarih/saat için `lib/date.ts` kullanılır — çıplak `toLocaleDateString`
   veya `toISOString` yazma. Sunucu UTC'de koşuyor, saat kayar.
6. Her görev sonunda `npm run build`, `npm run lint` ve `npm run typecheck`
   geçmeli.

---

## Lisans

Özel proje. Tüm hakları saklıdır.
