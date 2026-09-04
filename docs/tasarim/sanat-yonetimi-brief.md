# literaslab — Sanat Yönetimi ve Deneyim Brief'i

> Bu dosya bir **prompt**tur. Bir yapay zekâ ajanına ya da bir tasarım/frontend
> ekibine olduğu gibi verilebilir. PORTALE brief'inin literas'a uyarlanmış hâli.

---

## Devraldığın şey

**literaslab**, Türkiye'nin genel amaçlı topluluk ve etkinlik platformu.
Kitap kulübünden yürüyüş grubuna, dil pratiğinden fotoğraf gezisine kadar her
ilgi alanından topluluk burada kurulur, buluşmalar buradan duyurulur, katılım
burada takip edilir.

Çekirdek fikir: **"Konu senden, masa bizden."**

Markanın merkezî metaforu **masa**dır. Bir masa kurmak — birkaç kişiyle
başlayıp şehre yayılabilen bir şey başlatmak. Site bugün bunu şöyle söylüyor:

> *İnsanların kendi masalarını kurduğu yer.*
>
> *Bir masanın etrafında toplanmak için bahane çok: kitap, yürüyüş, kahve,
> fotoğraf. Birkaç kişiyle başlayıp şehre yayılan bir şey olabilir.*
>
> *Masayı sen kur.*

Farklılaşma kategoriyle değil: **UX kalitesi + adil fiyat + Türkçe yerellik +
şehir bazlı yoğunlaşma**. Meetup'ın hantallığı ve abonelik baskısı olmadan.

---

## Kritik fark — bunu atlarsan her şeyi kırarsın

PORTALE kurgusal bir pazarlama sitesiydi. **literas çalışan bir üründür.**

41 rota, kimlik doğrulama, satır düzeyi güvenlik (RLS), veritabanı, e-posta
kuyruğu, QR check-in, çok adımlı topluluk kurma sihirbazı, on bir ayar sayfası.
Gerçek kullanıcı verisi var.

Bu şu demek: **sanat yönetimi ürünün üstüne gelir, yerine değil.** Bir bölümü
güzelleştirmek için bir sorguyu, bir yetkiyi ya da bir formu bozmak kabul
edilemez. Aşağıdaki "kapsam" bölümü neyin serbest, neyin dokunulmaz olduğunu
söylüyor.

---

## Önce incele

Değiştirmeden önce mevcut projeyi baştan sona anla:

- görsel kimlik ve palet — `app/globals.css` `:root`
- **ölçülmüş tasarım DNA'sı** — `docs/tasarim/wild-week-dna.json`
  (bu dosya tarayıcıda `getComputedStyle` ile ÖLÇÜLDÜ, göz kararı değil;
  içinde literas'a uyarlama kısıtları da yazılı — onları oku, yeniden keşfetme)
- tipografi: Marcellus (Roma yazıtı serifi) + IBM Plex Mono iş bölümü
- imgeler: `components/rolyef.tsx` — Masa, Kahve, Kitap, Sandalye, Şehir
- künye ızgarası (`app/page.tsx` misafir dalı) ve `components/kunye.tsx`
- bileşenler: `event-card`, `community-card`, `how-it-works`, `closing-cta`,
  `category-strip`, `upcoming-events`, `header`, `footer`
- metin sesi: kuru, somut, esprili; Türkçe ek uyumu `lib/turkce.ts` ile
- kod yapısı: Next.js 16 App Router, sunucu bileşenleri, Turbopack
- responsive davranış ve mevcut kırılma noktaları
- `literas-vizyon-ve-kararlar.md` — alınmış kararlar; bir şey soracağın zaman
  önce buraya bak

**Neyin şu anda ayırt edici olduğunu anlamadan hiçbir şeyi değiştirme.**

### Bugün güçlü olan ve korunması gereken şeyler

1. **Tek kromatik renk.** Bütün sitede tek bir renk var: mürekkep mavisi
   `#0755BB`. Geri kalan sıcak greige ve sıcak siyah. İddia renk çokluğundan
   değil, kısıtlamadan geliyor. **İkinci bir kromatik renk ekleme.**
2. **Sıfır çerçeve, sıfır gölge.** Ayrım zemin farkı ve boşlukla yapılıyor.
   Bu bir tercih değil, kimliğin kendisi.
3. **Künye ızgarası.** Dev logotype + arkasında soluk dev rölyef + minik yazı.
   Sergi afişi / duvara asılan program hissi. Sitenin en güçlü ekranı bu.
4. **Rölyefler.** Tek renk, sessiz, büyük ölçekte ve düşük opaklıkta kullanılan
   kabartma çizimler. Yeni bir illüstrasyon dili icat etme — bunun ölçeğini,
   ritmini ve rolünü genişlet.
5. **Ölçek karşıtlığı.** 10-12px etiketlerle dev tipografi arasındaki fark.
   Sayfa büyük puntoyla değil, bu farkla konuşuyor.
6. **Türkçe yerellik.** "İstanbul'da" / "İzmir'de" / "Sinop'ta" ek uyumu
   çalışıyor. Bu, ürünün farklılaşma noktalarından biri.

---

## Görev

Mevcut projeyi, eksiksiz, üretim kalitesinde, güçlü sanat yönetimi taşıyan bir
dijital deneyime dönüştür — Awwwards / Site of the Day seviyesinde.

Mevcut sayfanın altına birkaç bölüm eklemek **değil**. Yaratıcı yönün tamamını
üstlen ve literas'ı başlangıcı, ilerleyişi, hikâyesi ve güçlü bir sonu olan
bütünlüklü bir siteye evir.

Mevcut kimliği alakasız bir yeniden tasarımla değiştirme; **en güçlü
parçalarını koru ve üzerine kur.** Sonuç, "masa" fikrini bugünkünden çok daha
derin, akılda kalıcı, premium ve kasıtlı hissettirmeli.

---

## Yaratıcı özerklik

Şunlara **sen** karar veriyorsun:

- sitenin hangi ek bölümlere ihtiyacı olduğu
- masa hikâyesinin nasıl açılacağı
- bilgi mimarisi ve görsel hiyerarşi
- tipografi ve ölçek
- kompozisyon, boşluk, ritim
- imge ve sanat yönetimi
- geçişler, kaydırma davranışı, hareket dili
- etkileşimler ve mikro etkileşimler
- **masa metaforunun deneyim boyunca nasıl evrileceği**
- ürün özelliklerinin nasıl anlatılacağı
- deneyimin nasıl biteceği
- tüm ekran boyutlarında responsive davranış

Tasarım yönünü bana sorma. Hangi bölümleri kuracağını sorma. Hangi animasyon,
düzen, yazı karakteri, etkileşim ya da görsel işlemi tercih ettiğimi sorma.
Hem sanat yönetmeni hem frontend geliştiricisisin. Kararları kendin ver.

---

## Kalite çıtası

Sonuç şöyle hissettirmeli: sanat yönetimli, editoryal, sürükleyici, çağdaş,
premium, görsel olarak kendinden emin, kavramsal olarak tutarlı, kasıtlı
tempolu, yüksek cilalı.

Tipografi, imge, hareket, kaydırma ve kompozisyon **bağımsız efektler değil,
tek bir sistem** gibi çalışmalı. Her tasarım kararı masa fikrini
güçlendirmeli. Sonuç güçlü bir dijital tasarım stüdyosunun elinden çıkmış
gibi durmalı — hazır kalıplardan monte edilmiş gibi değil.

---

## Kaçın

Genel bir SaaS açılış sayfasına dönüştürme. Şu öngörülebilir kalıplara düşme:

- tekrar eden özellik kartı ızgaraları
- aşırı yuvarlatılmış dikdörtgenler
- gereksiz haplar ve rozetler
- jenerik degrade bölümler
- rastgele parlama efektleri
- amaçsız kullanılan panel görselleri
- tekrar eden ortalanmış düzenler
- jenerik startup bölümleri
- aşırı dekoratif animasyon
- yalnızca bir efekti göstermek için var olan hareket

**literas'a özel olarak ayrıca kaçın:**

- **İkinci kromatik renk.** Palet tek mavi. "Vurgu için turuncu ekleyelim" yok.
- **Çerçeve ve gölge.** Kimliğin tanımı bunların yokluğu.
- **Yeni bir kart dili.** Depoda zaten iki kart var (`event-card`,
  `community-card`) ve ikisi de ölçülmüş. Üçüncüsünü icat etme; var olanı
  güçlendir.
- **Meetup taklidi.** Kalabalık filtre çubukları, rozet enflasyonu, sonsuz
  kaydırma listeleri.
- **Yazı boyutunu küçültmek.** Referans mikrosite 10px gövde kullanıyor;
  literas okunan bir üründür. **Gövde metni en az 16px.** 10-12px yalnızca
  ETİKET içindir.
- **İngilizce metin.** Kullanıcıya görünen her kelime Türkçe.
- **Süs için hareket.** Kaydırma bir anlatım aracı; efekt vitrini değil.

Kullanılabilirlik, okunabilirlik, responsive davranış ve performansı görsel
karmaşıklık uğruna feda etme.

---

## Dokunulmaz kısıtlar

Bunlar tercih değil, ihlal edilirse iş geri çevrilir:

| kısıt | değer |
|---|---|
| kontrast | WCAG AA, **4.5:1**. Soluk mavi (`rgba(7,85,187,.32)`) bizim zeminlerimizde 1.6:1 veriyor — **kullanılamaz**, yalnızca dekorasyon |
| gövde metni | **≥ 16px** |
| rakamlar | IBM Plex Mono, `tabular-nums`. Marcellus'ta `1` ile `I` ayırt edilmiyor |
| form denetimleri | sans/mono kalır — onlar okunan metin değil, dokunulan nesne |
| renk yazımı | sabit hex YOK, `var(--...)` |
| dil | kullanıcıya görünen tüm metin Türkçe |
| doğrulama | `npm run typecheck` temiz · `npm run lint` **87 uyarı / 0 hata** tabanı aşılmaz · `npm run build` geçer |
| erişilebilirlik | klavye odağı görünür, `prefers-reduced-motion` desteklenir, canlı bölgeler korunur |

---

## Kapsam

**Serbest — sanat yönetiminin asıl alanı:**
`/` (misafir dalı), `/kesfet`, `/hakkinda`, `/sss`, `/topluluk-kurallari`,
`/iletisim` ve tüm paylaşılan bileşenler.

**Dikkatli — ürün yüzeyi, görsel dil uygulanır ama akış korunur:**
`/community/[id]`, `/event/[id]`, `/profile/[id]`, `/` (giriş yapmış dal).

**Dokunma — işlevsel, kırılırsa ürün durur:**
`/community/new/*` sihirbazı, `/ayarlar/*`, `/login`, `/signup`,
`/event/[id]/checkin`, `/admin/*`, tüm `app/api/*` ve `supabase/*`.

Bu üçüncü grupta yalnızca token düzeyinde (renk, tipografi, boşluk)
iyileştirme yapılabilir; yapı ve mantık korunur.

---

## Mevcut site birinci bölümdür

Bugünkü siteyi atılacak bir şey değil, **final deneyimin ilk bölümü** olarak
gör. Mevcut kimlik, künye ızgarası, rölyefler ve masa fikri sonuçta
tanınabilir kalmalı. Gerektiğinde iyileştir, yeniden düzenle, geliştir — ama
var olan görsel temeli silme. **Etrafındaki dünyayı büyüt.**

Bugünkü misafir akışı şu sırayla ilerliyor:
künye ızgarası → kategori şeridi → yaklaşan etkinlikler → topluluklar →
nasıl çalışır → kapanış çağrısı.

Bu bir iskelet; hikâye değil. Hikâyeyi sen kuracaksın.

---

## Yetenekler

Şu yetenekleri **aktif olarak kullan**, yalnızca adını anma:
`design-dna`, `frontend-design`, `design-taste-frontend`, `scrollcraft`.

Oturumda bulunmuyorlarsa: önce ara. Yoksa ilkelerini eldeki tasarım
yetenekleriyle uygula ve **hangisinin bulunmadığını açıkça söyle** — sessizce
başka bir şeye geçme. (`docs/tasarim/wild-week-dna.json` zaten `design-dna`
Faz 2 çıktısıdır; yeni ölçüm yapmadan önce onu oku.)

---

## Yürütme

Önce incele. Mevcut siteyi anla ve **uygulamadan önce kendi yaratıcı yönünü
oluştur.** Sonra inşa et.

Gerekli gördüğün her yerde yeni bileşen, bölüm, etkileşim, geçiş ve destekleyici
içerik üretebilirsin. Gerektiğinde mevcut metni iyileştirebilirsin — ürün
fikrini koruyarak.

Uygulamanın gerçekten çalıştığından, responsive kaldığından ve deneyimin
baştan sona tutarlı olduğundan emin ol.

**Sayfa sadece uzadığında durma. Birkaç güzel bölüm ekledikten sonra durma.**
Bitmiş bir dijital ürün ve tamamlanmış bir yaratıcı deneyim gibi hissedene
kadar rafine etmeye devam et.

Uygulama sırasında zayıf bir tasarım kararıyla karşılaşırsan bana sorma,
kendin düzelt. Ek yön vermeyeceğim. Yaratıcı kararlar senin.

---

## Bitti sayılma ölçütü

- `typecheck` temiz, `lint` 87/0, `build` geçiyor
- 360px, 768px, 1024px, 1440px ve 1920px'te kontrol edildi
- klavyeyle baştan sona gezilebiliyor, odak her adımda görünür
- `prefers-reduced-motion: reduce` açıkken deneyim hâlâ anlaşılır
- kontrast çiftleri ölçüldü, hepsi ≥ 4.5:1
- "Dokunma" listesindeki hiçbir akış bozulmadı
- sayfa yeniden yüklenmeden anlatı tamamlanıyor: giriş → gelişme → kapanış
