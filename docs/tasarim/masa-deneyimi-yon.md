# Masa deneyimi — yaratıcı yön

> `sanat-yonetimi-brief.md`'ye cevap. Uygulamadan ÖNCE yazıldı; karar defteri.
> Ölçüm: 1280×3467 tam sayfa ekran görüntüsü + DOM ölçümü (01.09.2026).

## Teşhis — sayfa bugün nerede zayıflıyor

Sayfa **tepede zirve yapıyor, sonra dizine dönüşüyor.**

| bölüm | durum | sorun |
|---|---|---|
| dev logotype + soluk masa | GÜÇLÜ | tez bu; dokunma |
| künye üçlüsü | GÜÇLÜ | koru, ritmi tazele |
| kategori şeridi | ZAYIF | 14 kare kutu + ikon = "uygulama ikon satırı"; afiş diline yabancı |
| yaklaşan etkinlikler | ÖLÜ | 0 etkinlik → gri kutu + buton; "asıl iş" boş bir kutu |
| topluluklar | GENERİK | 4+1 yetim kartlı ızgara; brief'in yasakladığı kalıbın kendisi |
| nasıl çalışır | İYİ | Roma rakamlı hap satırları; DNA'ya oturuyor |
| kapanış | ORTA | ortalanmış başlık+buton; noktalı zemin süs |
| hikâye | YOK | masa metaforu ilk hücrede başlıyor ve orada bitiyor |

## Tek fikir

**Masa, kaydırdıkça kurulur.**

Tepede masa bir hayalet (opaklık .10, var olan). Her bölüm geçişinde AYNI
masa — aynı gravür dili, aynı yukarıdan bakış — biraz daha çizilir:

| bölüm | masa hâli | anlam |
|---|---|---|
| I · logotype | soluk çember, hayalet | "burada bir masa var" |
| II · bu hafta / yakında masada | boş masa, yalnız kenar | henüz kimse oturmadı (0 etkinlik dürüstçe); başlık zaman iddiasını veriye göre seçer |
| III · masalar (topluluklar) | tabaklar geliyor | masalar kuruluyor |
| IV · nasıl oturulur | fincanlar | oturmak kolay |
| V · masayı sen kur | tam kurulu, tam opak | son söz: sen |

Cesaret tek yere harcanıyor: bu. Geri kalan her şey sessizleşir.

## Neden bu, başkası değil

- **Yapı bilgi taşıyor.** Roma rakamları gerçek bir sıralamayı işaretliyor —
  sayfa bir program, program sıralıdır. Süs değil.
- **Hareket anlatım.** Gravürün çizilmesi (`stroke-dashoffset`) matbaa
  metaforunun kendisi: kalıp basılıyor. `animation-timeline: view()` — deponun
  zaten kullandığı deyim, kütüphane yok, `prefers-reduced-motion`'da son kare.
- **Var olanı büyütüyor.** `RolyefMasa` yeniden çizilmiyor; aynı bileşen
  `asama` parametresiyle kademeli çiziliyor.
- **Referansın hücre dilinin dikey uzantısı.** Bölüm ayracı = tek dev hücre:
  sol üstte mono rakam, sol altta 24px büyük harf başlık, hücreyi dolduran
  rölyef. DNA: "içerik üste/alta yaslı, ortası boş."

## Bilgi mimarisi — ana sayfa (misafir)

    I    Logotype hücresi                      (var, dokunma)
         Künye üçlüsü                          (var, ritim)
    II   BU HAFTA / YAKINDA MASADA — yaklaşan etkinlikler
           dolu → mevcut tarih omurgası (UpcomingEvents)
           boş  → boş masa ayracı + tek dürüst cümle + eylem
    III  MASALAR — topluluk PROGRAMI
           kart ızgarası DEĞİL: hap satırı listesi (.hw-row dilinin uzantısı)
           rakam · ad · şehir(ek uyumlu) · kategori işareti · üye
           "Tümünü gör → /kesfet" (kartlar orada kalır: afiş vs katalog)
    IV   NASIL OTURULUR — üç adım              (var, başlık dili)
    V    MASAYI SEN KUR — kapanış              (tam kurulu masa, noktalı zemin gider)

Kategori şeridi → **program lejantı**: kutusuz, düz glif + etiket, `·` ile
ayrılmış, sarar. 14 kutu gider, kimlik (şekil) kalır.

## Tipografi

Değişmez: Marcellus + IBM Plex Mono + Instrument Sans. En büyük metin 24px
kuralı korunur — dramayı dev SVG logotype ile 10-12px etiketler arasındaki
ölçek farkı veriyor, punto değil. Gövde ≥16px. Rakamlar mono.

## Kabuk

Header: hap arama → 4px alan; hap düğmeler → 4px; alt çizgi gider, ayrım
zemin farkıyla. Footer: "kendi topluluklarını" → "kendi masalarını"
(metafor tutarlılığı). Token düzeyi; yapı değişmez (her rotada kullanılıyor).

## Çıkarılanlar (Chanel kuralı) — uygulandı

- kapanıştaki noktalı zemin ve `ClosingCta` bileşeni (tek kullanım)
- kategori kutuları: `category-strip.tsx` + `kesfet-category-strip.tsx` silindi
- header alt çizgisi ve üç hap köşe; keşfet sekmelerinin hapları
- topluluk ızgarasının ana sayfadaki kopyası (kartlar /kesfet'te)
- beş sayfada yüklenmeyen `Playfair Display` çağrısı (Georgia'ya düşüyordu)
- `/hakkinda` yer tutucusu — gerçek sayfa yazıldı

## Kısıtlar — ihlal edilmez

kontrast ≥4.5 (ölçülür) · gövde ≥16px · sabit hex yok · Türkçe · tek mavi ·
sıfır gölge/çerçeve · typecheck/lint 87-0/build · reduced-motion son kare ·
klavye odağı · dokunma listesindeki rotalara yapısal dokunuş yok.

## Bulunan, bu turda dokunulmayan

- ~~Hydration uyumsuzluğu `main`'de var~~ → **KAPATILDI (sis turu,
  01–05.09.2026, `bakim/sis-hydration`).** Sebep `sis.tsx`'in tuvali React'in
  yönettiği hücrelerin İÇİNE eklemesiydi; `load` beklemek ve `offsetParent`
  kontrolü engellemiyordu. Fix: layout kabuğunda React'in çocuksuz render
  ettiği `#sis-host`; tuval oraya eklenir ve hedefin üstüne belge
  koordinatlarıyla oturur (kaydırmayla birlikte hareket eder; köşe yarıçapı
  hedefin hesaplanmış değerinden okunur: künye 4px, ızgara 0).
  İLK KESİMİN KUSURU (inceleme + ölçüm, 05.09.2026): `esitle()` bekçisi
  hedefin İÇİNDE canvas arıyordu; tuval taşındığı için hep boş dönüyor, her
  DOM mutasyonunda yık-kur yapıyor ve gözlemci kendi ev sahibindeki
  mutasyonla kendini tetikliyordu → sonsuz mikro-görev döngüsü, misafir ana
  sayfası DONUYORDU (headless Chrome/CDP: `1+1` üç kez 8 s cevapsız,
  `/kesfet` 30 ms). Gizli panelde görülen "zaman aşımı" bunu maskelemişti.
  Düzeltme: bekçi hedef kimliğine bakar; gözlemci `#sis-host` içi kayıtları
  yutar; hedef gidince (rota geçişi, üye dalı) tuval sökülür; reduced-motion
  yolu da yerleşimi izler; `ResizeObserver` border-box izler (içerik kutusu,
  `vw` dolgusunun bir kare geç güncellenmesini kaçırıyordu: tampon 240px
  kalırken hedef 194px'ti); `load` beklenmez; kesirli rect yuvarlanmaz.
  KANIT (headless Chrome + CDP, 05.09.2026): `main`'de konsolda "Hydration
  failed" VAR, dalda YOK. Dalda ana iş parçacığı 1–11 ms; iki tuval hedef
  rect'ine 0 px farkla oturur ve arka tampon rect'e eşit (1280→820→1280,
  iki hareket modunda); fare-sil merkez alfa 79→18; `/`→`/kesfet` geçişinde
  `#sis-host` boş, dönüşte yeniden 2 tuval; SSR'de `#sis-host` çocuksuz.
  Not: konsolda Next'in `scroll-behavior: smooth` uyarısı var (`html`'de
  tanımlı, `main`'den geliyor, bu turun dışı).
- **Mobilde kabuk iki satır** (logo+düğmeler, hap arama): içerikten önce
  ~190px krom. Header her rotada; bu turda yalnızca token düzeyi.
- **Künye 1. hücresinde sis, rölyefi çamurlaştırıyor** (mobil). Sis imza
  etkileşimi olarak korunuyor; tavan ayarı ayrı bir ölçüm işi.

## Doğrulama defteri (01.09.2026)

| ne | nasıl | sonuç |
|---|---|---|
| kontrast, 21 çift | hesaplandı (WCAG formülü) | hepsi ≥4.5. /hakkinda: dt --muted/--panel 7.93, alt paper-cream/ink 6.08, ikincil %81 → 4.55. DÜŞENLER: krem@78% 4.33 ve --muted-light 10px 4.14 — ikisi düzeltildi |
| gövde ≥16px, başlık 24px | DOM ölçümü (masaüstü + 375) | 16 / 24 |
| yatay taşma (375) | `scrollWidth > innerWidth` | yok |
| kademeli çizim GERÇEKTEN akıyor | 1280×720'de `strokeDashoffset` okundu: hücre III tam görünürken kenar+tabak 1px→0px; sayfa sonunda #kur rm-orta 0px. `getAnimations()` sahte sinyal (.reveal'de de 0). Anonim `view()` SVG çocuklarında çözülmüyor → adlı `view-timeline: --masa` HTML sarmalayıcıda | çizim tamam; son tamamlanıyor |
| reduced-motion | YAPISAL: `stroke-dasharray` yalnız `no-preference` bloğunda; kademe gizleme `@supports` dışında | son kare tam masa |
| klavye odağı | YAPISAL: native `<a href>`, `outline:none` yok. Koyu zeminde global halka (--ink) 1.00:1 idi → `.bolum-koyu :focus-visible` krem (6.08); ana sayfa V + /hakkinda kapanış | **elle Tab turu yapılmadı** — sentetik Tab odağı taşımıyor |
| sabit hex | grep | yeni kodda yok (`#fff` → `--paper-cream`) |
| hydration hatası | portal diff okundu | yalnızca `sis.tsx` canvas'ı, `main`'de de var, bileşenlerimden değil |
| typecheck / lint / build | koşuldu | temiz / 87-0 / geçti |
| masa yalnız I hayalet + 4 ayraç + V tam | `grep -rn RolyefMasa app components` → bolum.tsx, hakkinda, page.tsx künye; how-it-works artık Kahve | "ilk kez tam" anı V'e ait |
| başlık ve içerik aynı sol ray | CSS'ten TÜRETİLDİ: sentezin `−8px`'li formülü her genişlikte 8px kaydırıyordu (hesaplandı); düzeltilmiş ifadeyle 375…1920'de fark **0px** (768'de .container 24, .bolum 8+16=24). Tarayıcı ölçümü YAPILAMADI: gizli sekmede `#content` 0×0 (React akış commit'i ertelenir) | uygulandı; elle bakılmalı |

## Doğrulama defteri (05.09.2026, sis)

Araç: headless Google Chrome + DevTools Protocol (Node betiği, `Runtime.evaluate`
zaman aşımlı). Tarayıcı paneli gizliyken her çağrı zaman aşımına düştüğü için
tercih edildi; donmuş sayfayı gizli panelden ayırt etmenin tek yolu buydu.

| ne | nasıl | sonuç |
|---|---|---|
| donma (fix öncesi, 9480e52) | `/`'de `1+1` ×3, 8 s zaman aşımı; `/kesfet` kontrol | `/` üçü de cevapsız, `/kesfet` 30 ms → sonsuz MutationObserver döngüsü |
| donma (fix sonrası) | aynı yoklama, yükleme + geçiş + dönüş boyunca | 1–11 ms |
| `main` kontrolü | aynı yoklama, `git checkout main` | cevap veriyor; `#sis-hero canvas` 1/1; konsolda **Hydration failed** |
| hydration (dal) | `Runtime.consoleAPICalled` + `exceptionThrown`, gezinmeden önce açık | hata yok |
| tuval ↔ hedef rect | iki hedef için top/left/width/height farkı | 0 px |
| arka tampon ↔ rect | `cv.width/height` vs `round(rect×dpr)`; 1280→820→1280 | 0 (border-box fix'ten önce logotype 240 vs 194) |
| köşe | `getComputedStyle(hedef).borderRadius` vs tuval | 0px / 0px, 4px / 4px |
| fare-sil | 6 sentetik `pointermove` merkeze, 300 ms | maks alfa 79 → 18 |
| rota geçişi | `a[href^="/kesfet"]` tıkla → say → logo tıkla → say | 0 tuval → 2 tuval, parite 0 |
| reduced-motion | `Emulation.setEmulatedMedia` reduce | 2 tuval, çizili (alfa 103/63), daraltmada parite ve tampon 0 |
| typecheck / lint / build | koşuldu | bkz. commit |
