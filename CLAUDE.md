# CLAUDE.md — literas Proje Bağlamı

> Bu dosya repo kökünde durur. Claude (Code/Opus), her oturumda önce bunu okur.
> **Buradaki bilgiler soruların cevabıdır — bu dosyada cevabı olan bir şeyi kullanıcıya sorma.**

## Proje nedir?

**literas** — Türkiye odaklı, Meetup benzeri GENEL AMAÇLI topluluk/etkinlik platformu.
(Temmuz 2026 kararı: niş DEĞİL; 14 keşfet kategorisi eşittir. Farklılaşma:
UX kalitesi + adil/şeffaf fiyat + Türkçe yerellik + şehir bazlı yoğunlaşma.
Kategoriye özel istekler "kategori modülü" park alanına gider, çekirdeğe girmez.)
Canlı adres: https://literas-mvp.vercel.app · Repo: github.com/Pvquantlab/literas-mvp

Rakip analizi yapıldı (Kommunity, Meetup, Luma, Partiful, Eventbrite, Biletix).
Strateji: **ücretsiz RSVP + ileride ücretli etkinlikte düşük tek kalem komisyon**,
WhatsApp-first paylaşım ve Türkçe-öncelikli UX ile farklılaşma; tüm kategoriler eşit.

## Teknoloji yığını (KESİN — değiştirme, alternatif önerme)

| Katman | Seçim |
|---|---|
| Framework | Next.js App Router + TypeScript (next 16.2.9, react 19.2.7 — SABİT) |
| DB + Auth + Realtime | Supabase (Postgres, RLS zorunlu) |
| Supabase istemcileri | `lib/supabase.ts` (browser) · `lib/supabase-server.ts` (server, `await createClient()`) · `proxy.ts` (session yenileme — Next 16'da `middleware.ts` bu ada taşındı, named export `proxy`) |
| E-posta | Resend, `lib/email.ts` → `sendEmail()` · gönderen: `bildirimler@literaslab.com` |
| Harita | Leaflet + react-leaflet (Google Maps/Mapbox YOK) |
| Doğrulama | zod v4, `lib/validations.ts` (şemalar rotalara bağlı) |
| Rate limit | Upstash Redis, `lib/rate-limit.ts` (`checkRateLimit`) |
| Deploy | Vercel |
| Hata izleme | Sentry (`@sentry/nextjs`) · `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation.ts`, `instrumentation-client.ts` · DSN yoksa TAMAMEN SESSİZ |
| Stil | Global CSS + inline style; tek kaynak `app/globals.css`. Ölçülmüş tasarım DNA'sı: `docs/tasarim/wild-week-dna.json` |

Ortam değişkenleri (`.env.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `RESEND_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `CRON_SECRET`, `NEXT_PUBLIC_SENTRY_DSN` (+ kaynak haritası için opsiyonel `SENTRY_ORG`/`SENTRY_PROJECT`/`SENTRY_AUTH_TOKEN`). `service_role` anahtarı **hiçbir yerde kullanılmaz** — yetki her zaman RLS ile çözülür.

`CRON_SECRET` üç yerde aynı olmalı: `.env.local`, Vercel env, Supabase `app_secrets` (key=`cron_secret`). Örnek dosyaya gerçek değer yazılmaz.

Tarih/saat: `lib/date.ts` tek kaynaktır. Kodun hiçbir yerinde çıplak `toLocaleDateString`/`toISOString`'i **biçimlendirme için** kullanma — Vercel UTC'de koşuyor, saat 3 saat kayıyor. Form girdisi için `localInputToISO` / `isoToLocalInput`. (`toISOString()` bir `timestamptz` parametresine değer serileştirmek için zararsızdır — depoda 20+ emsali var; kural yalnızca kullanıcıya gösterilecek biçimlendirmeyi kapsar.)

## Dizin haritası (mevcut, çalışıyor)

```
app/
  page.tsx                    ana sayfa (etkinlik listesi, şehir/kategori filtresi, arama)
  kesfet/                     keşfet: sekmeler, kategori şeridi, sayfalama, FTS arama (unaccent)
  event/[id]/                 etkinlik detay: RSVP formu, harita, WhatsApp paylaş, .ics, edit
  event/new/                  etkinlik oluşturma (yetki: topluluğun founder/admin'i)
  community/[id]/             topluluk sayfası, üyelik katıl/yönet
  community/[id]/duyuru/      topluluk duyuruları: yayınla/düzenle/sil, liste sayfası
  community/new/              5 adımlı kurma sihirbazı (ad→konum→konular→açıklama→gönder)
  admin/                      yönetici paneli: topluluk onay/red, şikayet raporları
                              (guard: layout.tsx → profiles.is_admin kontrolü)
  ayarlar/                    profil, hesap, gizlilik, bildirimler, ilgi alanları, sosyal medya...
  login, signup, sifremi-unuttum, sifre-sifirla, auth/callback
  api/
    event/route.ts            POST etkinlik (zod + rate limit + founder/admin kontrolü + Resend)
    event/[id]/route.ts       PATCH/DELETE (zod eventEditSchema)
    event/[id]/ics/route.ts   takvim dosyası
    community/[id]/join/       üyelik başvurusu (rate limit)
    community/[id]/member/[memberId]/  üye onay/çıkarma
    report/                   şikayet oluşturma (zod + rate limit); [id] admin işlemi
    waitlist/                 dolu etkinlik bekleme listesi (zod + rate limit) + otomatik terfi
components/                   event-card, header, footer, calendar-button, image-upload, report-button
lib/                          supabase.ts, supabase-server.ts, email.ts, validations.ts, rate-limit.ts
supabase/schema.sql           TAM ŞEMA ANLIK GÖRÜNTÜSÜ — sıfırdan kurulum ve
                              felaket kurtarma için. Migration zincirinin
                              parçası DEĞİL (tarihsel migration'lar idempotent
                              olmadığı için bilinçli ayrıldı).
supabase/migrations/          Tarihsel değişiklik kaydı. Şemayı DEĞİŞTİRMEK için
                              buraya yeni migration yaz.
```

## Veritabanı gerçeği (ÖNEMLİ)

Gerçek şema Supabase'de yaşıyor. Denetlenmiş tablolar (RLS hepsinde AÇIK):
`profiles` (is_admin dahil), `communities` (status: pending/approved/rejected, founder_id),
`community_members` (role: founder/admin/member, status), `events` (organizer_id, community_id,
event_date, cover_image_url, series_id), `event_series` (frekans: haftalik/iki_haftalik/aylik,
tekrar_sayisi 2-26 — yazma yalnızca SECURITY DEFINER fonksiyonlardan), `rsvps` (email YOK —
sadece uuid'ler), `waitlist`, `reports`
(reporter_id, target_type: event/community/user, reason enum, description), ayrıca referans
tabloları: `community_drafts`, `community_topics`, `topics`, `topic_categories`,
`topic_category_map`, `topic_suggestions`, `locations`.

Şema bilgisi gerekiyorsa önce `supabase/schema.sql`'e bak — tüm tablolar,
kolonlar, kısıtlar, RLS politikaları, fonksiyonlar ve trigger'lar orada.
`supabase/migrations/` ise nelerin ne zaman değiştiğini anlatır.
Tahmin yürütüp kod yazma.

DİKKAT: `handle_new_user()` trigger'ı `auth.users` üzerinde. Kayıt olan
kullanıcıya profil satırı onunla açılıyor; hiçbir migration'da yoktu,
şimdi schema.sql'de.

## Kod kuralları (her görevde geçerli)

1. Kullanıcıya görünen TÜM metin Türkçe. Rota adları mevcut karma düzeni izler
   (İngilizce: event, community, profile, admin · Türkçe: kesfet, ayarlar, gizlilik).
2. Her API rotası ve server action: önce `auth.getUser()`, sonra rate limit, sonra
   zod doğrulama, sonra yetki kontrolü (örnek: `app/api/event/route.ts`).
3. E-posta HTML'inde her değişken `escapeHtml()` ile kaçırılır.
4. Yeni tablo/kolon = migration dosyası + RLS politikası + gerekli index. İstisnasız.
5. Hata mesajları Türkçe: `{ error: 'Giriş yapmalısın' }` gibi kısa ve net.
6. Tasarım dili `docs/tasarim/wild-week-dna.json`'dan gelir ve ÖLÇÜLMÜŞTÜR —
   göz kararı değiştirme. Özeti: tek vurgu rengi `--ink` (#0755BB), zeminler
   sıcak greige, köşe 4px, **gölge yok, çerçeve yok**, başlık ağırlığı 400 ve
   harf aralığı POZİTİF, mono yalnız etiket/veri için. Ayrım renkle değil zemin
   tonu ve tipografiyle kurulur.
   Kategori başına renk atama YOK — `CATS` dizisindeki 28 renk (soft/ink)
   bu yüzden silindi.
   Sabit hex yazma; `var(--…)` kullan. Marka rengi gerektiren istisnalar
   (WhatsApp gibi) da paletin diline çekildi.
7. Tek görev = tek commit ölçeği. Görev dışına taşan "iyileştirme" yapma, öner.
8. Her görev sonu: `npm run build` geçmeli.
9. `vercel.json`'a YORUM ya da açıklama anahtarı ekleme. JSON yorum
   desteklemiyor ve Vercel bilinmeyen üst düzey anahtarı şema hatasıyla
   reddediyor — deploy build başlamadan kırılır (bir kez yaşandı). Açıklama
   ilgili route dosyasının yorumuna yazılır.

## Yol haritası durumu

Ayrıntılar `literas-yol-haritasi.md` dosyasında. Özet durum:

- [x] **1.1** Sürümleri sabitle — next/react `latest` → `^16.2.9`/`^19.2.7` (commit 55943e7)
- [x] **1.2** Şema + RLS denetimi — 14 tablo denetlendi (hepsi güvenli); pending topluluklar
      gizlendi; eski supabase-schema.sql silindi; migration senkron (commit 3ac7436)
- [x] **1.3** zod doğrulama — 4 rota bağlandı; reportSchema gerçek koda uyarlandı;
      eventEditSchema eklendi (commit ef9a0f9)
- [x] **1.4** Upstash rate limit — 4 uca limit; Vercel env + redeploy; anon 401 doğrulandı
      (commit 6579976)
- [x] **1.5** Sentry — `@sentry/nextjs` elle kuruldu (sihirbaz değil): sunucu/edge/istemci
      yapılandırması, `onRequestError` kancası, tracesSampleRate 0.1, `sendDefaultPii: false`,
      Session Replay YOK. Gizlilik politikasına beşinci işleyici olarak eklendi.
      DSN env'e konmadan sistem tamamen sessiz.
- [ ] **2.1** OG görselleri ✓ · **2.2** cron hatırlatma ✓ · **2.3** PWA ✓ ·
      **2.4** Realtime katılımcı listesi ✓ · **2.5** Türkçe FTS ✓ · **2.6** QR check-in ✓
- [ ] **Aşama 3** tekrarlayan etkinlik serileri ✓, topluluk duyuruları ✓, katılım karnesi, kişisel keşif
- [ ] **Aşama 4** iyzico/PayTR ödeme, Expo mobil (kullanıcı çekişi görünce)

Bir görevi bitirince bu listede `[x]` işaretle ve tek satır not düş.

## Aşama 1 bitiş kriterleri — DURUM

- [x] Build geçiyor
- [x] Anonim kullanıcı hiçbir tabloya yazamıyor (401 testiyle doğrulandı)
- [x] Geçersiz veri 400 alıyor (zod safeParse)
- [x] Spam 429 alıyor (rate limit + Upstash env canlıda aktif)
- [x] Sentry kuruldu (DSN env'e konunca hatalar panele düşer)

## Kullanıcıya soru sormadan önce

Şu sıra ile dene: (1) bu dosya, (2) `literas-yol-haritasi.md`, (3) ilgili mevcut kod
(benzer bir özellik nasıl yapılmış — ör. yetki kontrolü için event/route.ts,
form deseni için community/new sihirbazı), (4) migration dosyaları.
Yine cevap yoksa **tek ve somut** bir soru sor ("communities tablosunda X kolonu
var mı?" gibi) — genel "ne yapmak istiyorsun?" soruları sorma; hedef yol
haritasında yazıyor.
