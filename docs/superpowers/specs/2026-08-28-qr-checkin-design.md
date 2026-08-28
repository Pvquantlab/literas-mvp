# QR ile giriş (check-in) — tasarım

> Tarih: 28.08.2026 · Yol haritası maddesi 2.6 · Durum: onaylandı, uygulanacak

## Amaç

Organizatör etkinlik kapısında kimin geldiğini kaydedebilsin. Katılımcı
telefonundan QR'ını gösterir, organizatör okutur, giriş işlenir.

Bu, etkinlik akışının son halkası: topluluk kur → etkinlik aç → RSVP → hatırlat
→ **giriş**. Yol haritasında Aşama 2'nin kalan tek maddesi.

## Kapsam

**İçinde:** token üretimi ve korunması · katılımcının QR'ını görmesi ·
organizatörün okutup girişi işlemesi · yanlış okutmayı geri alma ·
"X kayıt / Y giriş" sayacı.

**Dışında:** çevrimdışı check-in · maile QR gömme · sürekli kamera tarayıcısı ·
token yenileme/iptal. Hiçbiri bugünün ihtiyacı değil; her biri ayrı bir iş.

## Kararlar ve gerekçeleri

### Okutma yöntemi: telefonun kendi kamerası

QR bir adres kodlar. Organizatör telefonun normal kamerasıyla okutur, link
tarayıcıda açılır, onaylar.

Alternatif olan sürekli kamera tarayıcısı kapıda daha hızlı olurdu ama QR okuma
kütüphanesi ve kamera izni yönetimi getiriyor. Bu ölçekteki topluluk
buluşmalarında (10–30 kişi) kazanç, maliyeti karşılamıyor.

### Token `rsvps`'te, kolon bazlı kilitli

```sql
REVOKE SELECT (checkin_token) ON rsvps FROM anon, authenticated;
```

`rsvps` tablosunun okuma politikası `USING (true)` — yani herkese açık. Token
oraya düz kolon olarak konsaydı herkes okuyabilirdi.

Ayrı bir kilitli tablo (projede `app_secrets` ve `email_outbox` için kullanılan
kasa deseni) de düşünüldü, ama orada kasaya kapatılan şey *gerçekten* gizliydi.
Burada gizli olan yalnızca token; `checked_in_at` gizli değil ve onu da kasaya
kapatmak "kim geldi" sorgusunu gereksiz yere zorlaştırırdı.

Kolon bazlı yetki bu asimetri için doğru araç. **Uygulanabilir olduğu
doğrulandı:** kod tabanında `rsvps` üzerinde `select('*')` yapan hiçbir sorgu
yok — hepsi kolonları tek tek sayıyor, dolayısıyla yetki kısıtı hiçbir yeri
kırmıyor.

### QR yalnızca etkinlik sayfasında

Maile gömmek düşünüldü ama birçok mail istemcisi gömülü görseli engelliyor ve
QR boş kare görünüyor. Ayrıca e-posta teslimatına yeni bir bağımlılık
doğuruyor — bu sistem daha yeni çalışır hale geldi.

## Veri modeli

```sql
ALTER TABLE public.rsvps
  ADD COLUMN checkin_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN checked_in_at timestamptz,
  ADD COLUMN checked_in_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX rsvps_checkin_token_key ON public.rsvps (checkin_token);

REVOKE SELECT (checkin_token) ON public.rsvps FROM anon, authenticated;
```

Mevcut satırlar otomatik token alır: Postgres uçucu varsayılanı satır başına
değerlendirir, yani her satıra farklı uuid düşer. Benzersiz indeks bunu ayrıca
garantiye alır.

`checked_in_by` denetim izi için. İleride "bu girişi kim onayladı" sorusu
kaçınılmaz olarak çıkar ve sonradan eklemek geçmişi kurtarmaz.

## Fonksiyonlar

Üçü de `SECURITY DEFINER`, `SET search_path = public`, yetkiyi kendi içinde
kontrol edip yetkisizde `RAISE EXCEPTION 'yetkisiz'` atar. Bu, projedeki
`get_event_rsvp_emails` / `get_member_emails` deseninin aynısı.

**Yetki tanımı** (üçü de aynı, `checkin_kodum` hariç): çağıran kişi
etkinliğin `organizer_id`'si **veya** etkinliğin topluluğunda `status =
'approved'` ve `role IN ('founder','admin')` olan bir üye.

### `checkin_kodum(p_event_id uuid) RETURNS uuid`

Yalnızca `auth.uid()`'in **kendi** RSVP'sinin token'ını döner. RSVP yoksa
`NULL`. Başkasının token'ını almanın yolu yok.

### `checkin_dogrula(p_token uuid) RETURNS TABLE(...)`

Okuma amaçlı önizleme, hiçbir şeyi değiştirmez. Döndürdükleri:
katılımcı adı, etkinlik başlığı, `checked_in_at`.

**Kontrol sırası önemli ve bağlayıcı:**

1. Token ile RSVP aranır. Bulunamazsa **boş küme** döner — yetki kontrolü
   yapılmaz, çünkü hangi etkinliğe ait olduğu bilinmiyor.
2. Bulunursa, o RSVP'nin etkinliği üzerinden yetki kontrol edilir.
   Yetkisizse `RAISE EXCEPTION 'yetkisiz'`.

Sıra ters çevrilirse hiçbir şey kazanılmaz ama bu sıra, uygulayanın tahmin
etmesini engeller. Not: bu ayrım teorik olarak "geçerli ama benim olmayan
token" ile "geçersiz token"ı ayırt edilebilir kılar; sömürmek için önce
geçerli bir token ele geçirmek gerektiğinden ve token okunamadığından
kabul edilebilir bir risk.

### `checkin_yap(p_token uuid) RETURNS TABLE(...)`

`checked_in_at` boşsa `now()` ve `checked_in_by = auth.uid()` yazar.
**İdempotent:** zaten doluysa dokunmaz, mevcut durumu döner. İkinci okutma
hata değil, bilgi.

### `checkin_geri_al(p_token uuid) RETURNS void`

Yanlış okutmayı düzeltir: `checked_in_at` ve `checked_in_by` temizlenir.
Aynı yetki kontrolü.

## Akışlar

### Katılımcı

Etkinlik sayfası, RSVP vermiş kullanıcı için sunucuda `checkin_kodum` çağırır,
dönen token'dan **inline SVG QR** üretir. İstemciye ek JS inmez, QR her boyutta
net kalır.

QR şunu kodlar: `{SITE_URL}/event/{eventId}/checkin?t={token}`

### Organizatör

`/event/[id]/checkin` sayfası üç durumu karşılar:

| Durum | Ne gösterir | Çağrılan fonksiyon |
|---|---|---|
| Giriş yapılmamış | Login'e yönlendirir, dönüşte aynı sayfaya gelir | — |
| `?t=` yok | Sayaç + katılımcı listesi (giriş yapmış/yapmamış) | doğrudan sorgu |
| `?t=` var | Katılımcı adı + "Girişi onayla" düğmesi | `checkin_dogrula` |
| Onay düğmesi | Giriş işlenir, sonuç gösterilir | `checkin_yap` |
| "Geri al" düğmesi | Yanlış okutma temizlenir | `checkin_geri_al` |

Yetkisizlik her durumda fonksiyonun attığı `yetkisiz` istisnasından gelir ve
sayfada "Bu etkinliği yönetme yetkin yok" olarak gösterilir.

Token'sız hâl, organizatörün kapıya gitmeden durumu görmesini sağlar ve yol
haritasındaki "X kayıt / Y giriş" sayacı isteğini karşılar.

## Hata durumları

| Durum | Davranış |
|---|---|
| Token bulunamadı | "Bu kod geçersiz." |
| Çağıran yetkisiz | "Bu etkinliği yönetme yetkin yok." |
| Giriş yapılmamış | `/login?next=...` |
| Zaten giriş yapmış | Hata değil: "Ahmet 21:03'te giriş yapmış." + geri al seçeneği |
| Etkinlik geçmiş/uzak gelecekte | Engellenmez. Zamanlama organizatörün kararı. |

## Dosyalar

| Dosya | Durum |
|---|---|
| `supabase/migrations/2026...._qr_checkin.sql` | yeni |
| `supabase/schema.sql` | güncellenir (baseline) |
| `package.json` | `qrcode` + `@types/qrcode` |
| `lib/qr.ts` | yeni — SVG QR üretimi |
| `app/event/[id]/page.tsx` | QR bloğu + yöneticiye check-in bağlantısı |
| `app/event/[id]/checkin/page.tsx` | yeni |
| `app/event/[id]/checkin/actions.ts` | yeni — onayla / geri al |

## Test planı

**Veritabanı fonksiyonları** — Postgres'te işlem geri alınarak, bu oturumda
`email_izni` ve `profiles_guard` için uygulanan yöntemle:

1. Yetkisiz kullanıcı `checkin_yap` çağırır → `yetkisiz`
2. Organizatör geçerli token ile çağırır → `checked_in_at` dolar
3. Aynı token ikinci kez → idempotent, zaman değişmez
4. Başka etkinliğin token'ı → boş küme / yetkisiz
5. `checkin_kodum` başkasının RSVP'si için → `NULL`
6. `checkin_geri_al` → alan temizlenir
7. `anon` rolü `checkin_token` kolonunu okumaya çalışır → yetki reddi

**Uygulama:** `npm run build`, `lint`, `typecheck`. Canlıda yetki kapısı
(girişsiz istek yönlendiriliyor mu).

## Deploy sırası

**Migration önce, kod sonra.** Değişiklik tamamen eklemeli: yeni kolonlar ve
yeni fonksiyonlar, mevcut hiçbir şeyi değiştirmiyor. Eski kod yeni kolonları
bilmiyor ve onlara dokunmuyor, dolayısıyla migration uygulandıktan sonra deploy
tamamlanana kadar hiçbir şey kırılmaz.

(Bu, dünkü kolon yeniden adlandırmasının tersi. Orada değişiklik yıkıcıydı ve
pencere kaçınılmazdı; burada pencere yok.)
