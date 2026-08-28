# Topluluk Duyuruları — Tasarım Dokümanı

**Tarih:** 28.08.2026
**Yol haritası:** Aşama 3, "Topluluk duyuruları"
**Durum:** onaylandı, uygulama planı bekliyor

---

## Amaç

Topluluğun founder/admin'i, **etkinlikten bağımsız** bir duyuru yazıp onaylı
üyelerine ulaştırabilsin. Duyuru topluluğun sayfasında kalıcı olarak dursun.

Bugün platformda "duyuru" diye geçen tek şey, topluluğa yeni etkinlik
açıldığında `app/api/event/route.ts` içinden giden postadır. Organizatörün
kendi yazdığı bir mesajı üyelerine iletmesinin hiçbir yolu yok.

### Neden bu madde, neden şimdi

Aşama 3'ün dört maddesi arasında **aktivite üreten tek madde** bu; diğer üçü
(katılım karnesi, kişisel keşif, tekrarlayan seriler) var olan aktiviteyi
yansıtıyor ya da ondan besleniyor. Ölçüm: platformda 6 topluluk, 7 onaylı
üyelik, 8 etkinlik ve **toplam 1 RSVP** var. Darboğaz raporlama değil, erişim.

Katılım karnesi ve kişisel keşif bilinçli olarak ertelendi: 4 profil ve 1
RSVP ile ne karne anlamlı bir şey gösterir ne de sıralamanın iyi olup
olmadığı ölçülebilir. Bu, `CLAUDE.md`'nin Aşama 4'e uyguladığı "gerçek
kullanım verisi gelmeden başlama" mantığının aynısı.

---

## Zaten var olan altyapı (yeniden yazılmayacak)

Bu tasarımın büyük kısmı mevcut parçaların üstüne oturuyor. Uygulayıcı bunları
**yeniden yazmasın**, kullansın:

| Parça | Ne yapıyor |
|---|---|
| `get_member_emails(p_community_id uuid, p_exclude uuid)` | `SECURITY DEFINER`. Çağıranın o topluluğun founder/admin'i olduğunu doğrular (değilse `RAISE 'yetkisiz'`), onaylı üyelerin e-postalarını döner ve **`email_izni(user, 'announcement')` ile süzer**. Alıcı listesi için gereken her şey burada. |
| `email_izni(p_user uuid, p_template text)` | `'announcement'` şablonunu `profiles.email_community_announcements` kolonuna bağlar; `account_active` kontrolünü de yapar. |
| `lib/email.ts` → `sendEmail`, `sendBulkEmail` | Resend sarmalayıcıları. `sendBulkEmail` alıcılara **tek tek** gönderir (BCC sızıntısı yok) ve en az bir başarısızlıkta log düşer. |
| `email_outbox` + `/api/cron/reminders` | Kuyruk ve günlük boşaltıcı (06:00). |
| `checkUserRateLimit(userId, tier)` | Server action'lar için hız sınırı. |
| `ayarlar/bildirimler` sayfası | "Topluluk duyuruları" anahtarı zaten kullanıcıya görünür ve çalışır durumda. |

---

## Kararlar

Aşağıdaki dördü tartışıldı ve karara bağlandı. Uygulama bunları **yeniden
açmaz**.

### K1 — Duyuru hem sayfada kalır hem e-posta gider

Yalnızca e-posta olsaydı: gönderildikten sonra düzeltilemezdi, kaçıran bir
daha göremezdi, sonradan katılan üye geçmişi göremezdi ve moderasyon şikâyeti
geldiğinde elde içerik olmazdı. Yalnızca sayfada olsaydı: 8 etkinliğe 1 RSVP
olan bir platformda kimse uğrayıp görmezdi ve çalışır durumdaki posta
altyapısı boşa yatırım olurdu.

### K2 — Sayfadaki duyuruları yalnızca onaylı üyeler görür

Duyuru üye iletişimidir; "salon değişti", "kapı kodu 1234" gibi şeyler
yazılır. Postayı zaten yalnızca üyeler alıyor; sayfa da aynı kitleyi görmeli.
Aksi hâlde postada kapalı olan şey sayfada herkese açık olurdu.

### K3 — E-posta anında gider, ama denetimli

Üç seçenek vardı:

- **Kuyruğa yaz (reddedildi):** Hobby planında cron günde bir kez 06:00'da
  koşuyor. Duyuru 24 saate kadar beklerdi. "Bu akşam salon değişti" diyen
  organizatör için kullanılamaz; özelliğin ana kullanımını öldürür.
- **Anında, mevcut deseni aynen tekrarla (reddedildi):** `sendBulkEmail`
  bütün alıcılara `Promise.all` ile **aynı anda** gidiyor. `sendEmail`'de ne
  yeniden deneme var ne hız sınırlama — Resend 429 dönerse o alıcının postası
  sessizce kayboluyor (yalnızca loglanıyor). Bugün 3 kişilik topluluklarda
  görünmez; duyuru etkinlik oluşturmadan çok daha sık gönderileceği için
  10–15 üyede ısırır.
- **Anında ama parçalı (seçildi):** aşağıdaki "Gönderim" bölümü.

### K4 — Düzenleme e-postayı geri almaz

Duyuru düzenlenebilir ve silinebilir, ama giden posta gitmiştir. Form bunu
açıkça yazar. Düzenleme yeniden posta göndermez.

---

## Veri modeli

```sql
CREATE TABLE IF NOT EXISTS public.community_announcements (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  -- Yazar silinse de duyuru kalsın: kalan üyeler geçmişi kaybetmemeli.
  author_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  title        text NOT NULL,
  body         text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz,
  -- Kaç kişiye ULAŞTI. Üye sayısıyla aynı olmak zorunda değil: bildirim
  -- tercihini kapatmış üyeler get_member_emails tarafından süzülüyor.
  sent_count   integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS community_announcements_community_created_idx
  ON public.community_announcements (community_id, created_at DESC);
```

Tablo adı İngilizce — mevcut tablolarla (`communities`, `community_members`,
`events`, `rsvps`) tutarlı. Yardımcı fonksiyon adı Türkçe — son turdaki
`etkinlik_yoneticisi_mi` ile tutarlı. `CLAUDE.md` bu karma düzeni zaten
kabul ediyor.

Uzunluk sınırları veritabanında `CHECK` ile değil, zod ile uygulanır
(projedeki mevcut desen): `title` 3–120, `body` 10–3000.

---

## Yetki

### Ortak yüklem

`get_member_emails` içindeki founder/admin kontrolü üç RLS politikasında ve
sayfa kapısında tekrar edilecekti. Tekrar yerine tek fonksiyon:

```sql
CREATE OR REPLACE FUNCTION public.topluluk_yoneticisi_mi(p_community_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM community_members cm
    WHERE cm.community_id = p_community_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('founder','admin')
      AND cm.status = 'approved'
  );
$$;

GRANT EXECUTE ON FUNCTION public.topluluk_yoneticisi_mi(uuid) TO authenticated;
```

`SECURITY DEFINER` olması ayrıca RLS özyinelemesini önlüyor. `GRANT` vermek
güvenli: fonksiyon içeride `auth.uid()` kullanıyor, yani çağıran yalnızca
**kendi** yetkisini sorabiliyor — dönen bilgi zaten kendisinin bildiği bir şey.
Bu, `etkinlik_yoneticisi_mi` için verilen kararla birebir aynı.

### RLS politikaları

```sql
ALTER TABLE public.community_announcements ENABLE ROW LEVEL SECURITY;

-- K2: yalnızca onaylı üye okur.
CREATE POLICY "Duyurulari onayli uye okur" ON public.community_announcements
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM community_members cm
    WHERE cm.community_id = community_announcements.community_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
  ));

CREATE POLICY "Duyuruyu yonetici yazar" ON public.community_announcements
  FOR INSERT WITH CHECK (
    public.topluluk_yoneticisi_mi(community_id) AND author_id = auth.uid()
  );

CREATE POLICY "Duyuruyu yonetici gunceller" ON public.community_announcements
  FOR UPDATE USING (public.topluluk_yoneticisi_mi(community_id));

CREATE POLICY "Duyuruyu yonetici siler" ON public.community_announcements
  FOR DELETE USING (public.topluluk_yoneticisi_mi(community_id));
```

### Yetkiler (GRANT)

```sql
GRANT SELECT ON public.community_announcements TO authenticated;
GRANT INSERT (community_id, author_id, title, body)
  ON public.community_announcements TO authenticated;
GRANT UPDATE (title, body, updated_at, sent_count)
  ON public.community_announcements TO authenticated;
GRANT DELETE ON public.community_announcements TO authenticated;
```

**Neden kolon bazlı INSERT/UPDATE:** `created_at` ve `id` istemciden
yazılamamalı — `created_at` sıralamayı belirliyor, uydurulabilseydi bir duyuru
akışın başına çivilenebilirdi. Risk düşük ama desen kurulu ve maliyeti iki
satır.

**`community_id` neden UPDATE listesinde yok:** UPDATE politikasında yalnızca
`USING` var, `WITH CHECK` yok — yani yeni değerler politika tarafından
denetlenmiyor. `community_id` güncellenebilseydi bir yönetici duyuruyu
yönetmediği bir topluluğa taşıyabilirdi. Kolon listesinden çıkarılması bunu
kapatıyor; iki koruma birbirine bağlı, biri kaldırılırsa diğeri de gözden
geçirilmeli.

**Bilinçli kabul:** `sent_count`'u topluluğun yöneticisi güncelleyebiliyor,
yani şişirebilir. Gönderim HTTP üzerinden yapıldığı için sayacı veritabanının
kendisi yazamıyor. Zaten duyurunun metnini de o yazıyor; kendi topluluğunun
sayfasında bir sayacı şişirmek anlamlı bir saldırı değil.

**DİKKAT — Postgres tuzağı (bu projede bir kez düşüldü):** kolon bazlı
`REVOKE`, tablo bazlı `GRANT`'i **ezmez**. Yeni tabloda tablo düzeyinde
INSERT/UPDATE hiç verilmediği için sorun yok; ama `supabase/schema.sql`'e
yansıtılırken bu tablo toplu `GRANT INSERT, UPDATE ... TO authenticated`
listelerinden **uzak tutulmalı**.

---

## Gönderim

Server action, projedeki zorunlu sırayı izler:
`auth.getUser()` → rate limit → zod → yetki → iş.

### Sabitler

```ts
const PARCA_BOYU = 5             // aynı anda gidecek posta sayısı
const PARCALAR_ARASI_MS = 1000   // parçalar arası bekleme
const ANLIK_ALICI_TAVANI = 100   // üstünde kuyruğa düşer
const GUNLUK_DUYURU_SINIRI = 3   // topluluk başına, son 24 saat
```

100 alıcı en kötü ihtimalle ~20 saniye sürer (20 parça × 1 sn). Vercel Hobby'de
fonksiyon tavanı 60 saniye — rahat pay var.

### Akış

1. `auth.getUser()`; yoksa `/login`'e.
2. `checkUserRateLimit(user.id, 'normal')`.
3. zod: `duyuruSchema` (`community_id` uuid, `title` 3–120, `body` 10–3000).
4. `topluluk_yoneticisi_mi(community_id)` — sayfa kapısı. RLS ikinci kapı.
5. Son 24 saatte bu topluluğun duyuru sayısı `GUNLUK_DUYURU_SINIRI`'na
   ulaştıysa dur, kullanıcıya söyle. (Sayım satırlara bakıyor, dolayısıyla
   yönetici duyurularını silerek sınırı aşabilir. Bilinçli kabul: sınırın
   amacı kötü niyetliyi durdurmak değil, dalgınlıkla üyelerin gelen kutusunu
   doldurmayı engellemek. Gerçek kötüye kullanım görülürse gönderim sayacı
   ayrı bir tabloya taşınır.)
6. Satırı `INSERT` et (`author_id = user.id`).
7. `get_member_emails(community_id, user.id)` ile alıcıları al.
   Yetkisizlik burada da yakalanır (`RAISE 'yetkisiz'`).
8. Alıcı sayısı `ANLIK_ALICI_TAVANI`'nı **aşmıyorsa**: `lib/email.ts`'e
   eklenecek parçalı gönderici ile gönder, dönen başarılı sayısını
   `sent_count`'a yaz.
9. **Aşıyorsa**: posta gönderme, logla ve kullanıcıya söyle. Duyuru sayfada
   durur.

   > **Güncelleme (plan yazımı sırasında):** bu adım önce "kuyruğa yaz" diye
   > tasarlanmıştı. Plan yazılırken ölçüldü ki cron'daki `buildMail` yalnızca
   > `'reminder'`, `'promotion'` ve `'join_request'` şablonlarını tanıyor ve
   > başkasında `null` dönüyor — yani kuyruğa yazılan `'announcement'`
   > satırları **hiçbir zaman gönderilmezdi, üstelik sessizce**. Aşağıdaki
   > YAGNI notunun önceden yetkilendirdiği kesim uygulandı: bozuk bir yedek
   > yerine tanımlı bir ret. Bir topluluk tavana yaklaşırsa yapılacak iş
   > `buildMail`'e `'announcement'` dalı eklemek (payload'da
   > `title`/`body`/`community_name` taşıyarak) ve bu adımı geri açmaktır.

### Yeni yardımcı: `lib/email.ts`

```ts
/**
 * Alıcılara parçalar hâlinde gönderir. sendBulkEmail hepsini aynı anda
 * yolluyor; Resend saniyelik istek sınırı uyguluyor ve sendEmail'de yeniden
 * deneme yok, yani sınıra çarpan alıcının postası kayboluyor.
 */
export async function sendChunkedEmail(
  { to, subject, html }: { to: string[]; subject: string; html: string },
  etiket: string,
  { parcaBoyu = 5, bekleMs = 1000 } = {}
): Promise<{ gonderildi: number; basarisiz: number }>
```

`sendBulkEmail` **kaldırılmaz** — `app/api/event/route.ts` ve üyelik
postaları onu kullanıyor. Onları bu yeni fonksiyona taşımak ayrı bir iştir ve
bu spec'in kapsamı dışındadır.

### YAGNI notu — 100 üstü kuyruk yedeği

Bugün hiçbir topluluk bu tavanın yanına yaklaşmıyor (en kalabalığı bir avuç
kişi), yani 9. adım fiilen ölü kod. Tavanı koyup üstünde **reddetmek** daha az
kod olurdu. Yedeğin gerekçesi: tavana çarpıldığı gün davranışın sessiz bir
veri kaybı değil, tanımlı ve kullanıcıya söylenen bir şey olması. Kapsam
daraltılmak istenirse **kesilecek ilk parça budur**; kesilirse 9. adım
"kullanıcıya sınırı söyle ve gönderme" olur.

---

## Arayüz

### Topluluk sayfası — `app/community/[id]/page.tsx`

- Yalnızca **onaylı üyeye** görünen "Duyurular" bölümü. En yeni 5 duyuru.
- Üye değilse bölüm hiç render edilmez (RLS zaten boş döner; bölümü de
  göstermemek yanlış izlenim vermemek için).
- founder/admin ise bölümün başında "Duyuru yaz" bağlantısı.
- Beşten fazlası varsa "tümü" bağlantısı → `app/community/[id]/duyuru/page.tsx`,
  o topluluğun bütün duyurularını en yeniden eskiye listeler.

**Bu liste sayfası zorunlu, süs değil:** K1'in gerekçesi "sonradan katılan üye
geçmişi görür" idi. Yalnızca son 5 gösterilip arşiv olmasaydı altıncı duyuruyla
birlikte geçmiş erişilemez hâle gelir ve K1 kendi kendini çürütürdü.

### Yazma / düzenleme — `app/community/[id]/duyuru/`

`app/event/new/` desenini izler: server action + form.

Her iki sayfa da en başta `topluluk_yoneticisi_mi(id)` kapısından geçer; yetkisi
olmayan formu hiç görmez. RLS ikinci kapıdır, tek kapı değil — QR turunda bu
sayfa kapısının unutulması gerçek bir açığa yol açmıştı.

- `yeni/page.tsx` — başlık + metin, "Bu duyuru **N üyeye** e-posta olarak
  gidecek" uyarısı (sayı `get_member_emails` ile değil, onaylı üye sayısıyla
  tahmini verilir — kesin sayı gönderimden sonra `sent_count`'ta).
- `[duyuruId]/duzenle/page.tsx` — düzenleme ve silme. Formda açık uyarı:
  **"Düzenleme, gönderilmiş e-postayı değiştirmez."** (K4)

### Sonuç bildirimi

Mevcut desen: server action'ın dönüş değeri `<form action={fn}>` içinde
kullanıcıya ulaşmaz. `lib/ayarlar-sonuc.ts` → `ayarlarSonucu(path, hata?)`
kullanılır; sayfa `components/ayarlar-durum.tsx` ile gösterir.

Hata metni **serbest string olarak query'ye konmaz**; QR turunda kapatılan
içerik sahteciliği vektörünün aynısıdır. Kod taşınır, metni sayfa seçer.

---

## E-posta

`app/api/event/route.ts`'teki serif şablonun aynısı kullanılır (Georgia,
`#1F4A3D` başlık, `#B8541A` vurgu).

- Konu: `${topluluk adı} — duyuru`
- Gövde: başlık, metin, altında yazarın adı ve topluluk sayfasına bağlantı.
- Bağlantı `SITE_URL` üzerinden kurulur (`lib/site.ts`) — sabit adres yazılmaz.
- **Her değişken `escapeHtml`'den geçer.** `CLAUDE.md` kural 3.
- Tarih basılacaksa `lib/date.ts` kullanılır; çıplak `toLocaleDateString`
  yasak.

---

## Hata durumları

| Durum | Kullanıcı ne görür |
|---|---|
| Giriş yok | `/login`'e yönlendirme |
| Hız sınırı | "Çok fazla istek, biraz bekle" |
| zod başarısız | İlgili alanın Türkçe hata mesajı |
| Yönetici değil | "Bu toplulukta duyuru yayınlama yetkin yok" |
| Günlük sınır dolu | "Bu topluluk bugün 3 duyuru gönderdi, yarın tekrar dene" |
| `get_member_emails` hata verdi | Duyuru **kaydedilmiş** olur; "Duyuru yayınlandı ama e-posta gönderilemedi" + `console.error` |
| Alıcı yok (herkes kapatmış) | "Duyuru yayınlandı. E-posta bildirimi açık üye yok." |
| Tavan aşıldı | "Duyuru yayınlandı ama üye sayısı tek seferde e-posta göndermek için fazla. Sayfada görünüyor." |

Gönderim hatası duyuruyu **geri almaz**: satır zaten yazılmıştır ve sayfada
görünür. Sessizce yutulmaz, kullanıcıya söylenir — bu projede bir ay boyunca
tek posta gitmemesinin sebebi tam olarak yutulan hatalardı.

---

## Kapsam dışı

- Push bildirim — altyapı yok (`push_new_messages` gibi kolonlar hiçbir şeyi
  yönetmiyor, "yakında" etiketiyle duruyorlar).
- Görsel/ek dosya.
- Zamanlanmış gönderim ("yarın sabah yolla").
- Duyuru başına kitle seçimi — K2 ile üyeler diye karara bağlandı.
- Yorum/tepki.
- `sendBulkEmail` çağıran mevcut yerlerin parçalı göndericiye taşınması.

---

## Doğrulama

Bu projede test koşucusu (jest/vitest) **yok**. Doğrulama:

1. **SQL:** RLS ve yetkiler geri alınan işlemde (`DO` bloğu + `RAISE`) test
   edilir — onaylı olmayan üye okuyabiliyor mu, sıradan üye yazabiliyor mu,
   yönetici yazıp güncelleyebiliyor mu, `created_at` istemciden yazılabiliyor
   mu. Test sonunda kalıntı sıfır olmalı.
2. **Parçalı gönderici:** `node --experimental-strip-types` ile sahte bir
   gönderici fonksiyonla çağrılıp parça sayısı ve toplam süre ölçülür.
3. **Uygulama:** `npm run typecheck && npm run lint && npm run build`.
4. **Canlı:** dağıtımdan sonra üye olmayan bir kullanıcıyla duyuru bölümünün
   görünmediği doğrulanır.
