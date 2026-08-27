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

## AŞAMA 1.6 — Denetim sonrası kapatma (27.08.2026)

Geniş tarama yapıldı (güvenlik / kod kalitesi / doküman tutarlılığı). Bulgular
`Literas Denetim Raporu` artifact'inde. Kapatılanlar:

- [x] **Güvenlik paketi 3** (migration `20260827120000`) — canlıya UYGULANDI
      - `profiles_guard` trigger: `is_admin`, `email`, `id` kilitlendi.
        Açık gerçekti ve doğrulandı: RLS kolon kısıtı koyamadığı için her
        kullanıcı konsoldan `is_admin: true` yazıp yönetici olabiliyordu.
      - `_check_cron_secret` PUBLIC'ten alındı (sır sınama oracle'ıydı).
        Kasa bozulmadı: SECURITY DEFINER iç çağrıları çalışıyor (test edildi).
      - `public_profiles` görünümüne gizlilik filtresi: `profile_visibility`
        ve `account_active` artık gerçekten etkili.
      - `community_members_guard`: admin rolünü yalnızca kurucu verebilir
        (API bunu zorluyordu, RLS zorlamıyordu).
- [x] **Güvenlik paketi 4** (migration `20260827120100`) — UYGULANDI 28.08.2026
      `mark_reminder_sent` / `mark_promotion_email_sent` artık sır kontrolü
      yapıyor. PR #1 merge edilip production deploy'u tamamlandıktan SONRA
      uygulandı (imza değiştiği için sıra buydu). Doğrulandı: anonim çağrı
      yanlış sırla `yetkisiz` dönüyor, imzalar `(uuid, text)`.
- [ ] **CRON_SECRET rotasyonu** — HÂLÂ BEKLİYOR, kullanıcıda. Gerçek değer `.env.example` ile
      public repoya commit edilmişti; örnek dosya boşaltıldı ama git geçmişi
      açık, o yüzden değer yakılmış sayılır.
- [x] **Kapak görseli veri kaybı** — düzenleme her kaydetmede kapağı siliyordu.
- [x] **Saat dilimi** — e-posta ve listelerde `lib/date.ts` bağlandı; formların
      yazma yolu İstanbul duvar saatine sabitlendi (`localInputToISO`).
- [x] **Geçmiş etkinlik düzenlenebiliyor** — edit şemasından gelecek kısıtı kalktı.
- [x] **Ayarlar sertleştirme** (gizlilik / sosyal-medya / hesap) — zod + rate
      limit + hata gösterimi (`AyarlarDurum`). `javascript:` URL'i artık
      kaydedilemiyor; e-posta alanı salt okunur.
- [x] **Ölü dosya temizliği** — `patch-hero2.js`, `patch-muted.js`,
      `kesfet/tab-bar.tsx`, `kesfet/category-strip.tsx`.

- [x] **Keşfet ve arama (Paket 4)**
      - Header araması `defaultValue="İstanbul"` ile sessizce kilitliydi.
      - Kategori/sekme tıklamasında `q` ve `city` düşüyordu; artık korunuyor.
      - Şehir filtresi yokken başlık "İstanbul" yazıp tüm Türkiye'yi
        listeliyordu — başlık gerçeği söylüyor.
      - `lib/turkce.ts`: ek sabit `'da` idi; "İzmir'da", "Sinop'da" yanlıştı.
        Ünlü uyumu + ünsüz benzeşmesi, 14 şehirde test edildi.
      - Sayfalama off-by-one: son sayfa tam dolduğunda boş sayfaya götürüyordu.
      - `search-box` / `city-filter` hedefi sabit `/` idi → `usePathname`.

- [x] **Bildirim tercihleri gerçekten uygulanıyor** (migration `20260827140000`)
      DB'de `email_izni(user, template)` izin katmanı. İşlemsel maillerle
      (terfi, etkinlik değişikliği/iptali) tercihe bağlı mailleri (hatırlatma,
      katılım isteği, duyuru) ayırıyor. `account_active` de artık okunuyor.
      Uçtan uca test edildi: tercih kapalıyken kuyruğa 0 satır, açıkken 1.
      `push_new_members` varsayılanı `false` → `true` düzeltildi (kurucuya
      katılım isteği maili gitmiyordu; düzeltilmeseydi bu değişiklik bir
      gerileme olurdu). "Tüm e-postaları kapat" artık gerçekten hepsini
      kapatıyor.

- [x] **Kayıt akışı ve auth hata gösterimi**
      `signUp` sonrası koşulsuz yönlendirme yüzünden, doğrulama açıkken
      kullanıcı kendini çıkış yapmış hâlde ana sayfada buluyordu. Artık
      `data.session` null ise "Postanı kontrol et" ekranı + tekrar gönderme.
      `emailRedirectTo` eklendi (yoktu, `?next` kayboluyordu). Giriş sayfası
      `?error=` parametresini okuyor (whitelist'ten, ekrana basmadan);
      doğrulanmamış hesap ayrı mesaj + tekrar gönderme alıyor. `auth/callback`
      `next`'i sunucuda doğruluyor ve hata türlerini ayırıyor.
      Çalışan sunucuda doğrulandı: 4 hata mesajı, 5 callback senaryosu (hiçbiri
      dışarı yönlendirmiyor), `guvenliNext` 12 girdi.

**Bilinen borç:** `push_*` kolonları fiilen e-postayı yönetiyor ama adları
push diyor; platformda push altyapısı yok. Yeniden adlandırma ayrı bir iş
olarak bırakıldı — arayüz metni şimdilik gerçeği söylüyor.

- [x] **Görsel yükleme kuralları tek kaynaktan** (`lib/upload.ts`)
      Avatar editörü istemcide 5 MB kontrol ediyordu ama `avatars` kovasının
      sunucu limiti 2 MB — arada kalan görseller ham Supabase hatası alıyordu.
      MIME kontrolü, `contentType` ve input sıfırlama da eklendi.
      İstemci limitlerinin canlı kova ayarlarıyla eşitliği otomatik
      doğrulanıyor (ayrışma bu hatanın kök nedeniydi).

- [x] **Cron idempotent hale getirildi**
      İşaretleme döngü sonunda tek seferde yapılıyordu; fonksiyon süre
      limitinde kesilince gönderilmiş mailler işaretsiz kalıyor ve ertesi koşu
      aynı kişilere tekrar gönderiyordu. Artık her gönderimden hemen sonra
      işaretleniyor + süre bütçesiyle temiz çıkış + `maxDuration`.

- [x] **Service worker araftan çıkarıldı** — 2.3 PWA artık gerçekten tamam
      Kayıt layout'tan kaldırılmış, yerine yazılacak bileşen hiç yazılmamıştı:
      `sw.js` ölü kod olarak duruyordu ama önceden kaydolmuş tarayıcılarda
      eski hatalı sürüm çalışmaya devam ediyordu. `components/register-sw.tsx`
      yazıldı; `sw.js` güvenli sürümle değiştirildi (yalnızca `/_next/static/*`
      — içerik hash'li olduğu için bayatlama imkânsız; doküman ve API'ye hiç
      dokunulmuyor). `activate` eski `literas-static-v1` önbelleğini siliyor,
      yani eski kullanıcılardaki bayat/kişisel HTML de temizleniyor.
      Tarayıcıda doğrulandı: 33 önbellek girdisinin hepsi statik, doküman yok.

**Vercel planı: HOBBY** (doğrulandı). Bunun iki somut sonucu var:
1. Fonksiyon tavanı **60 saniye** — `maxDuration`/bütçe buna göre ayarlı.
   Pro'ya geçilirse `app/api/cron/reminders/route.ts` içindeki yorumda yazan
   değerlere (300s / 240s) çıkarılabilir, kuyruk tek koşuda daha çok biter.
2. Cron **günde bir** çalışabiliyor. Hatırlatmalar 24 saatlik pencere
   kullandığı için doğru; ama bekleme listesi terfi maili ("yerin açıldı") de
   aynı cron'a bağlı olduğundan haber 24 saate kadar gecikebiliyor. Kullanıcı
   yerini kaybetmiyor (RSVP trigger'la oluşuyor), sadece geç öğreniyor.
   Çözüm: Pro + saatlik cron, ya da terfi mailini RSVP iptal akışından
   tetiklemek.
3. Kapasite: ~72 mail/koşu, günde bir koşu. 3 kullanıcılık MVP için fazlasıyla
   yeterli; büyürken bu sınır önce vurur.

**Denetimde yanlış çıkan iddialar** (doğrulandı, düzeltilmedi):
- Bekleme listesi bozuk DEĞİL — `rsvps` SELECT politikası `true`, sayım doğru.
- `cron/reminders` ve `event/[id]/page.tsx` saatleri zaten doğruydu.
- Font literal'leri bozuk DEĞİL — Next 16 `next/font` gerçek aile adını
  üretiyor (`"IBM Plex Mono", "IBM Plex Mono Fallback"`); tarayıcıda ölçüldü,
  literal ile değişken aynı sonucu veriyor. 121 dosyalık değişiklikten dönüldü.
- Avatar yükleme "depolanan XSS" DEĞİL — kovalarda `allowed_mime_types`
  tanımlı, `text/html` 415 ile reddediliyor; anonim yükleme de RLS'e takılıyor.
  Canlıda curl ile doğrulandı. (Yerinde bir UX hatası vardı, o düzeltildi.)

Kalan paketler: kalan 6 ayarlar action'ı + avatar yükleme MIME + `member`
rotası zod/limit · cron idempotent işaretleme + SW kararı + ESLint · kayıt
akışında e-posta doğrulama + bildirim tercihlerinin gerçekten uygulanması ·
belge/README + baseline migration (`supabase db pull`).

---

## AŞAMA 2 — Büyüme ve UX (sıradaki)

Amaç: "Luma modeli" — paylaşılabilirlik ve sürtünmesiz akış. Kullanıcı kazandırır.

- [x] **2.1 OG görselleri** (next/og — en yüksek etki/maliyet)
      app/event/[id]/opengraph-image.tsx ve app/community/[id]/opengraph-image.tsx.
      1200x630: başlık, tarih (Türkçe format), konum, topluluk adı, literas logosu.
      Kapak varsa arka plan karartılmış, yoksa kategori düz rengi (CATS paleti).
      generateMetadata'da title/description dolu. Türkiye'de davetler WhatsApp'ta
      paylaşılır — link önizlemesi tıklanmayı artırır.

- [x] **2.2 E-posta hatırlatmaları** (Supabase Cron + Resend)
      app/api/cron/reminders/route.ts (GET). CRON_SECRET Bearer doğrulaması.
      24 saat içindeki + reminder_sent_at IS NULL etkinlikler → RSVP'lilere hatırlatma
      (lib/email.ts sendEmail, escapeHtml, .ics linki). Gönderim sonrası
      reminder_sent_at doldur. events'e reminder_sent_at timestamptz kolonu (migration).
      600ms bekleme (Resend rate limit). vercel.json'a cron: "0 * * * *".

- [x] **2.3 PWA** (manuel, ekstra paket yok)
      app/manifest.ts (name "literas", theme --ink, 192/512 ikon).
      Basit service worker: statik asset cache (network-first), public/sw.js +
      layout.tsx kayıt scripti. iOS için apple-touch-icon + viewport meta.

- [x] **2.4 Realtime katılımcı listesi** (Supabase Realtime)
      Migration: ALTER PUBLICATION supabase_realtime ADD TABLE rsvps.
      app/event/[id]/attendee-list.tsx: ilk veri server'dan props, sonra
      supabase.channel ile INSERT/DELETE dinle. Unmount'ta unsubscribe.

- [x] **2.5 Türkçe tam metin arama** (Postgres FTS turkish config)
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
