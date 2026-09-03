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
| II · bu hafta masada | boş masa, yalnız kenar | henüz kimse oturmadı (0 etkinlik dürüstçe) |
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
    II   BU HAFTA MASADA — yaklaşan etkinlikler
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

## Çıkarılanlar (Chanel kuralı)

- kapanıştaki noktalı zemin (`radial-gradient` deseni) — süs
- kategori kutuları
- header alt çizgisi ve hap köşeleri
- topluluk ızgarasının ana sayfadaki kopyası

## Kısıtlar — ihlal edilmez

kontrast ≥4.5 (ölçülür) · gövde ≥16px · sabit hex yok · Türkçe · tek mavi ·
sıfır gölge/çerçeve · typecheck/lint 87-0/build · reduced-motion son kare ·
klavye odağı · dokunma listesindeki rotalara yapısal dokunuş yok.

## Bulunan, bu turda dokunulmayan

- **Hydration uyumsuzluğu `main`'de var** (bayat önbellek DEĞİL: 23 Turbopack
  parçası, 0 webpack, SW yok). Sebep `components/sis.tsx`: `SisKatmani`
  `#sis-hero`'ya `<canvas>`'ı hydration bitmeden ekliyor, React kendi
  çizmediği çocuğu buluyor. Dosya bu akış tuzağını uzun uzun belgeliyor ve
  "dikkatli" kapsamda; bu turun işi değil. Yeni bölüm hücreleri sis hedefi
  değil (id ile bağlanıyor), etkilenmiyor.
- **Mobilde kabuk iki satır** (logo+düğmeler, hap arama): içerikten önce
  ~190px krom. Header her rotada; bu turda yalnızca token düzeyi.
- **Künye 1. hücresinde sis, rölyefi çamurlaştırıyor** (mobil). Sis imza
  etkileşimi olarak korunuyor; tavan ayarı ayrı bir ölçüm işi.

## Doğrulama defteri (01.09.2026)

| ne | nasıl | sonuç |
|---|---|---|
| kontrast, 18 çift | hesaplandı (WCAG formülü) | hepsi ≥4.5; en düşük 4.55 (ikincil bağlantı, mavi zemin; .78 ile 4.33 çıkıp DÜŞMÜŞTÜ, 81%'e çekildi) |
| gövde ≥16px, başlık 24px | DOM ölçümü (masaüstü + 375) | 16 / 24 |
| yatay taşma (375) | `scrollWidth > innerWidth` | yok |
| kademeli çizim aktif | `animationName`/`animationTimeline` | `masa-cizgi` / `view()` |
| reduced-motion | YAPISAL: `stroke-dasharray` yalnız `no-preference` bloğunda; kademe gizleme `@supports` dışında | son kare tam masa |
| klavye odağı | YAPISAL: tüm yeni eylemler native `<a href>`, `outline:none` yok, global `:focus-visible` | **elle Tab turu yapılmadı** — sentetik Tab pane odaksızken odağı taşımıyor |
| sabit hex | grep | yeni kodda yok (`#fff` → `--paper-cream`) |
| hydration hatası | portal diff okundu | yalnızca `sis.tsx` canvas'ı, `main`'de de var, bileşenlerimden değil |
| typecheck / lint / build | koşuldu | temiz / 87-0 / geçti |
