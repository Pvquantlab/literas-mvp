# literas — Teknik Yol Haritası

> Bu dosya repo kökünde durur. `CLAUDE.md` buna atıfta bulunur.
> Kaynak: Fable 5'in teknik yol haritası + rekabet/teknoloji araştırma raporu.
> Her görev tek commit ölçeğinde. Her görevden sonra `npm run build` + Vercel preview testi.

## Mevcut durum özeti

Teknoloji yığını modern ve sektör standardında: Next.js App Router + TypeScript +
Supabase (Postgres, RLS) + Leaflet + Resend + Vercel. Farklılaşma niş değil, genel
platform: UX kalitesi + adil fiyat + Türkçe yerellik + şehir bazlı yoğunlaşma.

---

## AŞAMA 1 — Sağlamlaştırma ✅ TAMAMLANDI (1.5 hariç)

Amaç: Güvenlik açıklarını kapatmak, projeyi kırılmaz hale getirmek. Yeni özellik yok.

- [x] **1.1 Sürümleri sabitle** (commit 55943e7)
      `next: latest` → `^16.2.9`, `react`/`react-dom` → `^19.2.7`. Build doğrulandı.
      Fazladan lockfile'lar temizlendi.

- [x] **1.2 Şema + RLS denetimi** (commit 3ac7436) — EN KRİTİK GÖREVDİ
      Supabase CLI kuruldu, migration geçmişi onarıldı (hayalet kayıt temizlendi).
      Tam RLS denetimi yapıldı: 14 tablonun HEPSİNDE RLS açık, hiçbirinde "herkes
      yazabilir" açığı yok, rsvps'te e-posta sızıntısı yok (sadece uuid'ler).
      Tek iyileştirme: onaylanmamış (pending/rejected) topluluklar artık herkese
      görünmüyor — sadece founder + admin görüyor (is_admin() fonksiyonu eklendi).
      Eski yanlış supabase-schema.sql silindi. Şema artık supabase/migrations/ altında.

- [x] **1.3 zod girdi doğrulama** (commit ef9a0f9)
      lib/validations.ts repoya kondu, zod v4'e uyarlandı. 4 yazma ucuna bağlandı:
      event POST (eventSchema), report POST (reportSchema — gerçek koda göre
      düzeltildi: user/kategori-reason/description), waitlist POST (waitlistSchema),
      event PATCH (eventEditSchema — yeni eklendi, tam güncelleme). join gövdesiz,
      atlandı. Geçersiz veri artık 400 + Türkçe hata mesajı dönüyor.

- [x] **1.4 Upstash rate limit** (commit 6579976)
      lib/rate-limit.ts repoya kondu. Upstash Redis (Frankfurt, free tier) oluşturuldu.
      4 hassas uca bağlandı: report/waitlist/event POST (strict, dk'da 3),
      join (normal, dk'da 10). Env değerleri Vercel'e eklendi (Sensitive) + redeploy.
      Anonim istek 401 alıyor (doğrulandı). Env yoksa limit sessizce kapanır.

- [ ] **1.5 Sentry** — ERTELENDİ (kullanıcı kararı)
      Yapılacak: `npx @sentry/wizard@latest -i nextjs`, client+server+edge config,
      tracesSampleRate 0.1, DSN env'e, kasıtlı test hatasıyla doğrula.

**Aşama 1 bitiş kriterleri:** Build geçiyor ✅ · anon yazamıyor ✅ · geçersiz veri 400 ✅
· spam 429 ✅ · Sentry ⏸️ (ertelendi)

---

## AŞAMA 2 — Büyüme ve UX (sıradaki)

Amaç: "Luma modeli" — paylaşılabilirlik ve sürtünmesiz akış. Kullanıcı kazandırır.

- [ ] **2.1 OG görselleri** (next/og — en yüksek etki/maliyet)
      app/event/[id]/opengraph-image.tsx ve app/community/[id]/opengraph-image.tsx.
      1200x630: başlık, tarih (Türkçe format), konum, topluluk adı, literas logosu.
      Kapak varsa arka plan karartılmış, yoksa kategori düz rengi (CATS paleti).
      generateMetadata'da title/description dolu. Türkiye'de davetler WhatsApp'ta
      paylaşılır — link önizlemesi tıklanmayı artırır.

- [ ] **2.2 E-posta hatırlatmaları** (Supabase Cron + Resend)
      app/api/cron/reminders/route.ts (GET). CRON_SECRET Bearer doğrulaması.
      24 saat içindeki + reminder_sent_at IS NULL etkinlikler → RSVP'lilere hatırlatma
      (lib/email.ts sendEmail, escapeHtml, .ics linki). Gönderim sonrası
      reminder_sent_at doldur. events'e reminder_sent_at timestamptz kolonu (migration).
      600ms bekleme (Resend rate limit). vercel.json'a cron: "0 * * * *".

- [ ] **2.3 PWA** (manuel, ekstra paket yok)
      app/manifest.ts (name "literas", theme --ink, 192/512 ikon).
      Basit service worker: statik asset cache (network-first), public/sw.js +
      layout.tsx kayıt scripti. iOS için apple-touch-icon + viewport meta.

- [ ] **2.4 Realtime katılımcı listesi** (Supabase Realtime)
      Migration: ALTER PUBLICATION supabase_realtime ADD TABLE rsvps.
      app/event/[id]/attendee-list.tsx: ilk veri server'dan props, sonra
      supabase.channel ile INSERT/DELETE dinle. Unmount'ta unsubscribe.

- [ ] **2.5 Türkçe tam metin arama** (Postgres FTS turkish config)
      Migration: events + communities'e search_vector tsvector GENERATED
      (to_tsvector('turkish', ...)) + GIN index. app/kesfet textSearch'ü bu kolona
      + { config: 'turkish', type: 'websearch' }. Mevcut unaccent'i koru.
      (NOT: events'te search_vector zaten var — kontrol et.)

- [ ] **2.6 QR check-in** (akışın son halkası)
      Migration: rsvps'e checkin_token uuid DEFAULT gen_random_uuid() + checked_in_at.
      RSVP onay e-postasına + etkinlik sayfasına QR (qrcode paketi, data-url).
      app/event/[id]/checkin/page.tsx: sadece founder/admin erişir; token doğrular,
      checked_in_at doldurur. Organizatöre "X kayıt / Y giriş" sayacı.

**Aşama 2 bitiş kriterleri:** WhatsApp linkleri güzel önizleme, RSVP'liler hatırlatma
alıyor, katılımcı listesi canlı, QR ile giriş alınabiliyor.

---

## AŞAMA 3 — Derinlik (2-3. ay)

- [ ] Tekrarlayan etkinlik serileri
- [ ] Topluluk duyuruları
- [ ] Katılım karnesi (profilde: katıldığı etkinlik sayısı, üye olduğu topluluklar;
      gizlilik toggle: show_reading_stats benzeri)
- [ ] İlgi alanına göre kişisel keşif
- [ ] (Talebi kanıtlanırsa) kategori derinlik modülleri

---

## AŞAMA 4 — Gelir ve Ölçek (3. ay+, gerçek kullanım verisi gelmeden BAŞLAMA)

| Eşik | Aksiyon |
|---|---|
| Ücretli etkinlik talebi | iyzico Marketplace (BDDK escrow) veya PayTR. Ücretsiz RSVP + %3-4 tek kalem komisyon. Parça parça: sandbox → şema → checkout → webhook → iade |
| 500 eşzamanlı Realtime | Supabase Pro; Ably veya self-host değerlendir |
| Aylık aktif >50K | Read replica, pooling, arama Meilisearch/Typesense'e |
| Web PWA yetmez | Expo ile React Native |

---

## Çalışma kuralları (her görevde hatırla)

1. Her görev tek PR/commit ölçeğinde — "hepsini birden yap" deme.
2. Her görevden sonra `npm run build` + Vercel preview'da elle test.
3. service_role anahtarı asla client'a inmesin; RLS ile çöz.
4. Yeni tablo = migration + RLS politikası + index. İstisnasız.
5. Kullanıcıya görünen tüm metinler Türkçe; kod/commit mesajları serbest.
6. E-posta HTML'lerinde mutlaka escapeHtml.
7. Mevcut tasarım dilini sürdür (IBM Plex Mono, --ink/--paper, CATS paleti).
8. Migration'ı olan görevde önce SQL'i incele/göster, sonra uygula.
