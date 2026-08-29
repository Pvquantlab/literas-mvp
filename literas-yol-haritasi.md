# literas — Teknik Yol Haritası

> Bu dosya repo kökünde durur. `CLAUDE.md` buna atıfta bulunur.
> Kaynak: Fable 5'in teknik yol haritası + rekabet/teknoloji araştırma raporu.
> Her görev tek commit ölçeğinde. Her görevden sonra `npm run build` + Vercel preview testi.

## Mevcut durum özeti

Teknoloji yığını modern ve sektör standardında: Next.js App Router + TypeScript +
Supabase (Postgres, RLS) + Leaflet + Resend + Vercel. Farklılaşma niş değil, genel
platform: UX kalitesi + adil fiyat + Türkçe yerellik + şehir bazlı yoğunlaşma.

---

## AŞAMA 1 — Sağlamlaştırma ✅ TAMAMLANDI

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

- [x] **1.5 Sentry** — ELLE kuruldu (sihirbaz değil: sihirbaz Sentry hesabına
      tarayıcıdan giriş istiyor ve dosyaları öngörülemez biçimde değiştiriyor).
      sunucu + edge + istemci yapılandırması, `instrumentation.ts` içinde
      `onRequestError` kancası (bu olmadan Next 15+ sunucu hatalarının çoğu
      Sentry'ye HİÇ ulaşmıyor), tracesSampleRate 0.1.
      `sendDefaultPii: false` ve Session Replay YOK — gizlilik kararı.
      Gizlilik politikasına beşinci veri işleyici olarak eklendi (tarih güncellendi).
      Doğrulama ucu: `/api/sentry-test` (üretimde 404).
      DSN env'e konmadan sistem tamamen sessiz.

**Aşama 1 bitiş kriterleri:** Build geçiyor ✅ · anon yazamıyor ✅ · geçersiz veri 400 ✅
· spam 429 ✅ · Sentry ✅

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
- [x] **CRON_SECRET rotasyonu** — TAMAMLANDI 28.08.2026. Vercel + Supabase +
      .env.local üçü de yeni değerde; cron uçtan uca doğrulandı (`ok: true`).
      NOT: `.env.example`'a sızmış olan değerin gerçek production sırrı
      OLMADIĞI ortaya çıktı (o base64'tü, gerçek sır 64 karakterlik hex'ti).
      Sızıntı riski sanıldığından düşükmüş; rotasyon yine de doğru adımdı.
- [x] **E-POSTA SİSTEMİ İLK KEZ ÇALIŞTI** — 28.08.2026
      Kök neden: Resend'de `literaslab.com` alan adı doğrulanmamıştı, her
      gönderim 403 (`domain is not verified`) alıyordu. Temmuz'da kurulan
      e-posta kasası mimarisi bir ay boyunca TEK BİR MAİL teslim etmemiş
      (`email_outbox`: 1 satır kuyrukta, 0 gönderilmiş) ve kimse fark etmemiş,
      çünkü `sendEmail` sonucu hiçbir çağrı yerinde okunmuyordu.
      Çözüm: Resend klasik DNS kurulumu (MX + TXT at `send`) — Natro'nun
      paneli CNAME kabul etmiyordu, MX/TXT kabul ediyor. Doğrulama sonrası
      kuyruktaki mail gönderildi (1 ay 1 gün beklemişti).
      DNS notu: alan adı Natro'da (`ns1/ns2.natrohost.com`), Vercel'de değil.
      Panel CNAME eklemeyi "09-Unable to add record" ile reddediyor; TXT/MX
      sorunsuz. İleride Resend kaydı değişirse bunu hatırla.
- [x] **Sessiz mail hataları görünür oldu** — `sendBulkEmail` yardımcısı;
      gönderim başarısızlıkları artık loglanıyor. Bu olmasaydı aynı arıza
      bir ay daha sessizce sürebilirdi. Gerçek değer `.env.example` ile
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

- [x] **Kalan server action'lar sertleştirildi** (28.08.2026)
      profil / kişisel / ilgi-alanları action'ları + `member` rotası. Kural 2
      (auth → rate limit → zod → yetki) artık istisnasız uygulanıyor.
      `username` biçim kuralı + ayrılmış ad listesi eklendi (`@admin`,
      `@literaslab` alınamıyor); unique çakışması artık kullanıcıya
      gösteriliyor (eskiden 23505 yutuluyordu).
- [x] **İkinci profil düzenleme yolu kapatıldı**
      `/profile/[id]/edit` doğrudan istemciden `profiles`'a yazıyordu — zod,
      uzunluk sınırı ve rate limit yoktu, yani `/ayarlar/profil`in tüm
      doğrulamaları bu URL'den atlanabiliyordu. Artık `/ayarlar/profil`e
      yönlendiriyor (silinmedi ki eski yer imleri 404 vermesin).
- [x] **Canlı manuel testler geçti** — kayıttaki "Postanı kontrol et" ekranı
      ve avatar yükleme kullanıcı tarafından denendi, ikisi de çalışıyor.

- [x] **ESLint kuruldu ve yeşil** (28.08.2026)
      `next lint` Next 16'da kaldırıldığı için `npm run lint` kırıktı ve ESLint
      hiç kurulu değildi — koddaki `eslint-disable` yorumları da bu yüzden
      hiçbir şey yapmıyordu. ESLint 9 + `eslint-config-next` flat config.
      NOT: ESLint 10 denendi, `eslint-config-next`'in içindeki
      `eslint-plugin-react` ile uyumsuz (kaldırılmış API kullanıyor) — 9'da
      kalındı. `@eslint/eslintrc` FlatCompat da çakışıyor; config doğrudan
      yayılımla (spread) kuruluyor.
      İlk çalıştırmada 66 hata / 86 uyarı. Hataların 55'i tek bir kuraldandı
      (`react-hooks/static-components`) ve hepsi iki ÖLÜ dosyadaydı:
      `iso-cover.tsx` ve `community-emblem.tsx` hiçbir yerden kullanılmıyordu
      (tasarım "sadece gerçek fotoğraf"a geçince arafta kalmışlar). 544 satır
      silindi. Kalanlar düzeltildi; `no-unescaped-entities` bilinçli olarak
      kapatıldı (Türkçe kesme işareti her cümlede geçiyor, faydası yok).
      `npm run typecheck` de eklendi.

- [x] **Baseline şema çıkarıldı** (`supabase/schema.sql`, 28.08.2026)
      Şemanın tek kaynağı canlı Supabase'di; migration klasöründe 12 tablonun
      ve ~30 profiles kolonunun tanımı yoktu. Artık tam anlık görüntü sürüm
      kontrolünde: 16 tablo, 22 fonksiyon, 8 trigger, 15 indeks, 36 RLS
      politikası, 1 görünüm, kısıtlar ve yetkiler. Kapsam otomatik doğrulandı.
      Migration zincirine EKLENMEDİ — tarihsel migration'lar idempotent değil,
      baseline oraya konsaydı sıfırdan kurulumda çakışırlardı. `schema.sql`
      sıfırdan kurulum için, `migrations/` değişiklik kaydı için.
      YAN BULGU: `auth.users` üzerindeki `on_auth_user_created` trigger'ı
      hiçbir migration'da yoktu. O olmadan yeniden kurulan bir veritabanında
      kayıt olan kullanıcıya profil satırı açılmaz ve uygulama sessizce
      bozulurdu. Artık belgelendi.
      NOT: referans verisi (topics, locations, topic_categories satırları)
      şemada değil; yeniden kurulumda ayrıca yüklenmeli.

- [x] **`NEXT_PUBLIC_SITE_URL`** (28.08.2026) — adres beş dosyada sabit
      yazılıydı; preview dağıtımlarında OG görselleri, sitemap ve mail
      bağlantıları hep production'ı gösteriyordu. `lib/site.ts` tek kaynak;
      preview'da `VERCEL_URL`, yerelde localhost. Yerelde doğrulandı:
      robots/sitemap/OG artık localhost gösteriyor, sabit adres sızmıyor.
- [x] **README** (28.08.2026) — repo sunumu, hızlı başlangıç, dizin haritası,
      belge indeksi ve katkı kuralları. Tüm atıflar koda karşı doğrulandı.

- [x] **RSVP API'ye taşındı** (`app/api/rsvp/route.ts`, 28.08.2026)
      RSVP oluşturma ve iptal doğrudan tarayıcıdan Supabase'e gidiyordu; tek
      koruma RLS'ti, kural 2'nin hiçbir adımı uygulanamıyordu. Rate limit
      özellikle önemliydi: RSVP'yi hızla aç-kapa yapmak her kapanışta
      `promote_from_waitlist` trigger'ını ateşleyip mail kuyruğuna satır
      ekliyor — sınırsız hızda Resend kotası tüketilebilirdi.
      Hata eşlemesi de sunucuya taşındı: istemci eskiden hata METNİNDE
      'EVENT_FULL' arıyordu, artık net durum kodu ve Türkçe mesaj dönüyor.
      `rsvpSchema` nihayet kullanılıyor (ölü koddu).
      DOĞRULANDI: kod tabanında istemciden doğrudan veritabanına yazan
      HİÇBİR yer kalmadı. Kalan istemci Supabase kullanımları meşru —
      `.auth` (giriş/kayıt) ve `.storage` (dosya yükleme).

- [x] **Topluluk sihirbazı doğrulaması** (28.08.2026)
      `submitCommunity` yalnızca "boş mu" kontrolü yapıyordu; uzunluk sınırı
      yoktu (3 karakterlik ad, 1 MB'lık açıklama geçebiliyordu). `saveDraft`
      hiç doğrulanmıyordu, oysa taslak jsonb'ye yazılan kullanıcı girdisi.
      `communitySchema` yazılıydı ama YANLIŞ şekle göre (`city`, `topics:
      string[]`) ve hiç bağlanmamıştı — sihirbaz `location_name`,
      `topic_ids: number[]` gönderiyor. Şema gerçek şekle göre yeniden
      yazıldı, `taslakSchema` eklendi, ikisi de bağlandı. Gerçek şema 16
      senaryoda test edildi.
      AYRICA: üç insert tek işlem olmadığı için kurucu üyeliği başarısız
      olduğunda ortada YÖNETİLEMEZ bir topluluk kalıyordu (hata sadece
      loglanıyordu). Artık telafi ediliyor: topluluk geri alınıp kullanıcıya
      hata dönülüyor.
      `validationError` ölü kodu kaldırıldı — dosyanın ortasında `next/server`
      import ediyordu ve şema dosyasını düz Node ile test edilemez kılıyordu.

- [x] **Tercih kolonları gerçekte ne yaptıklarını söylüyor** (28.08.2026)
      `push_event_reminders` → `email_event_reminders`,
      `push_new_members` → `email_new_members`,
      `push_community_announcements` → `email_community_announcements`.
      Platformda push altyapısı yok; bu üç anahtar fiilen e-posta gönderimini
      kapılıyor ve kodu okuyan biri haklı olarak push ayarı sanıyordu.
      Diğer iki `push_*` kolonu (`push_new_messages`, `push_suggested_events`)
      henüz var olmayan özellikler için duruyor ve hiçbir şeyi yönetmiyor —
      adları o gün doğru olacak, dokunulmadı.
      DEPLOY SIRASI: kod önce, migration hemen ardından. Kolon adı değişince
      eski kod ile yeni şema uyuşmaz; ters sırada pencere ~2 dakika olurdu,
      bu sırada saniyeler. Etkilenen tek yer /ayarlar/bildirimler (okuma
      hatası, veri kaybı değil).

**Kalan işler:** yok. Denetim listesi kapandı.

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

- [x] **2.6 QR check-in** (akışın son halkası)
      rsvps'e checkin_token uuid DEFAULT gen_random_uuid() + checked_in_at + checked_in_by
      (migration `20260828120000_qr_checkin.sql`), benzersiz indeks checkin_token üzerinde,
      beş SECURITY DEFINER fonksiyon (etkinlik_yoneticisi_mi, checkin_kodum, checkin_dogrula,
      checkin_yap, checkin_geri_al — hepsi yetkiyi auth.uid() ile fonksiyon İÇİNDE kontrol
      eder). lib/qr.ts (qrcode paketi, sabit sürüm) katılımcının QR'ını app/event/[id]/checkin-qr.tsx
      ile etkinlik sayfasına gömer — token istemciye asla inmez, yalnızca QR geometrisinde.
      Organizatör tarafı app/event/[id]/checkin/ altında: onay/geri alma server action'ları,
      etkinlik_yoneticisi_mi yetki kapısı (ayrı migration `20260828140000_checkin_yetki_grant.sql`
      ile GRANT EXECUTE TO authenticated). KOLON BAZLI YETKİ TUZAĞI: rsvps üzerindeki blanket
      `GRANT SELECT ... TO authenticated` satırı checkin_token'ı da açığa çıkarıyordu (herkes
      herkesin giriş kodunu okuyabilirdi); düzeltme `REVOKE SELECT ON rsvps FROM authenticated`
      ile tablo yetkisini tümüyle geri alıp ardından yalnızca güvenli kolonları (id, event_id,
      user_id, created_at, checked_in_at, checked_in_by) tek tek GRANT etmek — sıra kritik,
      çünkü kolon bazlı REVOKE tablo bazlı GRANT'i geçersiz kılmıyor. KAPSAM DIŞI: tarayıcı içi
      QR okuyucu yok (telefonun kendi kamerası kullanılıyor), QR yalnızca etkinlik sayfasında
      (RSVP onay e-postasına gömülmedi), offline/çevrimdışı giriş desteklenmiyor.

      SONRAKİ TUR (`20260828180000_qr_checkin_borclar.sql` + kod): checkin_yap artık koşulu
      UPDATE'in içinde tutuyor, iki yönetici aynı QR'ı aynı anda okutunca checked_in_by son
      yazana kaymıyor. `?hata=` serbest metin yerine kod taşıyor (limit/gecersiz/yetkisiz/
      basarisiz), metni sayfa seçiyor — katılımcı kendi QR'ını kurup organizatöre sahte sistem
      mesajı gösteremiyor. checkin_dogrula'nın döndürdüğü event_id adresteki id ile
      karşılaştırılıyor; "kod geçersiz" ile "başka etkinliğin QR'ı" ayrıştı. sonuc() ve
      /login?next= artık encodeURIComponent'ten geçiyor. AYRICA: rsvps canlıda realtime
      yayınındaydı (bu dosya ve schema.sql doğruyu söylüyordu, veritabanı ayrışmıştı) —
      abone olan kod olmadığı halde giriş yapmış herkes kimin nereye kaydolduğunu anlık
      dinleyebiliyordu; yayından çıkarıldı. AÇIK KALAN: spec checkin_dogrula'nın etkinlik
      başlığını da döndürmesini istiyordu, dönmüyor (eksik özellik, arıza değil).

**Aşama 2 bitiş kriterleri:** WhatsApp linkleri güzel önizleme, RSVP'liler hatırlatma
alıyor, katılımcı listesi canlı, QR ile giriş alınabiliyor.

---

## AŞAMA 3 — Derinlik (2-3. ay)

- [ ] Tekrarlayan etkinlik serileri
- [x] **Topluluk duyuruları** (28.08.2026)
      Migration `20260829100000_topluluk_duyurulari.sql`: community_announcements
      tablosu (id, community_id, author_id, title, body, created_at, updated_at,
      sent_count — 8 kolon), indeks (community_id, created_at DESC), 4 RLS
      politikası (onaylı üye okur; founder/admin yazar/günceller/siler), yeni
      SECURITY DEFINER fonksiyon topluluk_yoneticisi_mi(uuid) + GRANT EXECUTE.
      KOLON BAZLI YETKİ TUZAĞI (2.6'daki ile aynı ders, burada da tekrar
      düşülmedi): community_announcements toplu GRANT INSERT/UPDATE/DELETE
      listesine EKLENMEDİ, ayrı satırlarda GRANT INSERT (community_id, author_id,
      title, body) ve GRANT UPDATE (title, body, updated_at, sent_count) verildi
      — aksi halde created_at ve community_id korumaları sessizce anlamsızlaşırdı.
      Alıcı listesi için yeni kod YAZILMADI: mevcut get_member_emails zaten
      founder/admin doğrulaması yapıp email_izni(user,'announcement') ile
      süzüyordu, olduğu gibi yeniden kullanıldı. Gönderim anında ama parçalı:
      lib/email.ts → sendChunkedEmail 5'erli parça, parçalar arası 1 sn bekleme,
      100 alıcı üstünde reddediliyor. KUYRUK BİLİNÇLİ OLARAK SEÇİLMEDİ: Hobby
      planda cron günde bir kez çalışıyor, duyuru kuyruğa düşerse ertesi güne
      kadar gitmezdi — anlık-ama-parçalı gönderim tercih edildi. (Not: cron'daki
      buildMail zaten yalnızca reminder/promotion/join_request tanıyor,
      'announcement' satırları hiç işlemiyor — kuyruk yolu bilerek kesik
      bırakıldı, geri açmak için buildMail'e ayrı dal eklemek gerekir.)
      app/community/[id]/duyuru/: actions.ts (yayınla/güncelle/sil server
      action'ları), liste sayfası, yazma ve düzenleme sayfaları, iki adımlı
      silme onayı. app/community/[id]/duyurular.tsx: topluluk sayfasındaki
      bölüm, yalnızca onaylı üyeye görünür. KAPSAM DIŞI: push bildirim,
      görsel/ek dosya, zamanlanmış gönderim, duyuru başına kitle seçimi,
      yorum/tepki.
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
