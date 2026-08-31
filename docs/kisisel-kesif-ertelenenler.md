# Kişisel keşif — ertelenmiş bulgular

Dal `ozellik/kisisel-kesif-kusurlar` (31.08.2026). İki mercekli inceleme
10 bulgu çıkardı, 8'i çürütme turunu geçti. Dördü aynı commit'te kapatıldı
(bkz. `ddcc218`); aşağıdaki dördü **bilinçli olarak ertelendi**.

Ortak özellikleri: hiçbirinde gösterilen veri yanlış değil ve hiçbirinde
başlık içeriğe yalan söylemiyor. Hepsi `app/page.tsx`'te.

## 1. Kişiselleştirme genel listeyi tamamlamıyor, yerine geçiyor

`gosterilecekEtkinlikler = kisiselMi ? seninIcin : events` — tek üyeliği ve
o toplulukta tek yaklaşan buluşması olan kullanıcı ana sayfada **tek kart**
görüyor. Sezgiye aykırı yön: üyelik kazandıkça ana sayfa küçülüyor.

Ölçüm, ilk iddiayı küçülttü: `83909a9^:app/page.tsx` bu dalda zaten
`events.slice(0, 4)` basıyordu, yani gerçek fark 4→1, iddia edilen 12→1
değil. Tam liste `SectionHead href="/kesfet"` ile tek tık uzakta ve altta
24'e kadar topluluk ızgarası duruyor.

**Karar bekliyor:** yerine koyma mı, tamamlama mı (kişiselleri başa al,
kalanı `events`'ten id'ye göre tekilleştirerek 4'e doldur), yoksa iki ayrı
bölüm mü? Bu bir ürün kararı, kusur değil.

## 2. Üyelik iki kez sorgulanıyor

`uyelikIdler` (satır ~237) `membershipRes`'in (satır ~203) birebir aynısı:
aynı tablo, aynı iki yüklem. Tek fark `.limit(6)` ve embed. `uyelikIdler`
`user` dışında hiçbir şeye bağlı değil — `Promise.all`'a girebilirdi.

Görünür sonuç: 9 topluluğa üye kullanıcının kenar çubuğu `.limit(6)`
yüzünden 6 tanesini listeliyor ("+3 daha" göstergesi yok), "Senin için"
şeridi ise 9'un hepsinden çekiyor. Yani kenar çubuğunda **adı hiç geçmeyen**
bir topluluğun etkinliği "topluluklarından" başlığı altında çıkabiliyor.

**Tek dokunuşla ikisi de kapanır:** `membershipRes`'i tek kaynak yap —
`.limit(6)`'yı kaldır, `select('community_id, community:communities(id, name)')`,
`myCommunities = rows.map().filter(Boolean).slice(0, 6)`,
`topluluklarim = rows.map(r => r.community_id)`. Embed yine `communities`
RLS'ine tabi olduğu için `.filter(Boolean)` davranışı korunur.

`.limit(6)`'nın `.order()`'sız ve göstergesiz olması **önceden vardı**;
bu dal yalnızca tutarsızlığı görünür kıldı.

## 3. Şehir süzgeci kişisel listeye uygulanmıyor

Genel sorguda `if (activeCity) eventQuery.eq('community.city', activeCity)`
var; kişisel sorguda `activeCity` hiç geçmiyor. Sonuç: `CityFilter`'ın
kapsamı kullanıcının **göremediği** bir duruma (üyeliğinde yaklaşan buluşma
var mı) göre değişiyor. Bu dal öncesi şerit `events.slice(0, 4)` bastığı
için süzgece tabiydi; bağı kesen bu dal.

Doğru düzeltme illa "şehir süzgecini kişisele de ekle" değil: Ayşe
Ankara'ya bakarken kendi İstanbul kulübünün buluşmasını gizlemek de yanlış
olurdu. Asıl kusur kapsamın görünmez duruma göre değişmesi — iki koldan
birini seçip yorumla gerekçelendirmek yeterli (ör.
`const kisiselMi = !activeCity && seninIcin.length > 0`).

`kesfet/page.tsx` `.in('community_id', …)` ile şehir süzgecini aynı sorguda
birleştiriyor, yani eksiklik teknik zorunluluk değil.

## 4. `kisiselMi` doğruyken genel `seri_kalanlar` RPC'si boşa gidiyor

`kalanMap`'in giriş yapmış daldaki tek tüketicisi `gosterilenKalanMap`
ataması, o da hemen üzerine yazılıyor. Diğer iki tüketici yalnızca misafir
dalında kullanılıyor. `revalidate = 60` var ama `createClient()` `cookies()`
çağırdığı ve `searchParams` await edildiği için sayfa dinamik — her istekte
tekrarlanıyor.

Düzeltme: `seriIdler ∪ kisiselSeriIdler` üzerinden tek RPC, ya da seri/toplam
hesabını `if (!user)` ile koşullandır. Kullanıcıya yanlış veri gösterilmiyor.

---

## Kapsam dışı bırakılanlar (kusur sayılmadı)

- **Taksonomi birleştirme.** `profiles.interests` serbest metin,
  `community_topics` `topics.id` ile bağlı, ikisi birbirine değmiyor.
  Kullanıcının açık kararıyla ertelendi. Ölçüldü: 3 örnek ilgi alanından
  1'i eşleşmiyor ("Kısa Öykü" ↔ "Kısa Öyküler").
- **Canlıda `category`'si boş iki topluluk** (Eyüpsultan Erasmus, Kadıköy
  Felsefe & Kahve). Kullanıcı verisi tahmin edilmesin diye dokunulmadı;
  kurucularına mı bırakılacak, elle mi doldurulacak — karar bekliyor.

---

# İkinci tur — ilgi alanı motoru (01.09.2026)

Migration `20260901100000_ilgi_onerileri.sql` ile `profiles.interests` ilk kez
okunuyor. Aşağıdakiler bu turda **bilinçli olarak** dışarıda bırakıldı.

## 1. Kategori kolu yazılmadı (kullanıcı kararı)

`communities.category` üzerinden ikinci bir eşleştirme kolu kurulabilirdi.
Kurulmadı: 14'lü `lib/categories.ts` ile 25'li `topic_categories` arasında
elle yazılmış bir eşleme tablosu gerektiriyordu.

**Ölçülen bedel** — bugün iki onaylı topluluğun (`kadıköy kitap kulübü`,
`taksim yürüyüş kulübü`) hiç konusu yok, dolayısıyla **hiçbir ilgi alanından
görünmüyorlar**. Somut örnek: `{Kısa Öykü, Felsefe}` ilgi alanlı bir kullanıcı
iki kart görüyor; kategori kolu olsaydı üç görecekti. `Doğa Yürüyüşü` sıfır
dönüyor — oysa `taksim yürüyüş kulübü`nün `category` değeri `yürüyüş` ve
`lib/categories.ts`'in `ALIASES` tablosu bunu `doga`'ya bağlıyor.

**Neden geri gelmeyebilir:** sihirbaz artık hem kategoriyi hem en az bir konuyu
zorunlu kılıyor, yani bundan sonra doğan her topluluk konu taşıyor. Kol
yalnızca ESKİ kayıtlar için değerliydi. Bu iki kayda konu eklenirse ihtiyaç
tamamen ortadan kalkar.

**Gerektiği gün yeri belli:** `Category` tipine `dbKategoriler: string[]` alanı
(tek dosya, migration yok) + fonksiyona `p_kopru jsonb` parametresi.
Eşanlamlılar mevcut `ALIASES`'tan programatik türetilmeli, ikinci bir kopya
yazılmamalı.

## 2. `match_distance_km` hâlâ ölü, ama artık işaretli

Kolon yazılıyor, hiçbir sorguda okunmuyor. Bu turda "yakında" rozeti aldı.
Gerçekten çalışması için topluluklarda **koordinat** gerekiyor; bugün yalnızca
serbest metin `city` var (`taksim yürüyüş kulübü` gibi kayıtlarda şehir bile
tutarsız). Ya koordinat toplanmalı ya da ayar kaldırılmalı — rozet kalıcı
çözüm değil.

## 3. Keşfet yüzeyi dokunulmadı

Öneri yalnızca ana sayfada. `/kesfet` kendi `CATS` dizisini taşıyor, kategori
parametresi `?kategori=doğa` (aksanlı) — ana sayfa `?category=doga` (ASCII).
Aynı süzgeç, iki ayrı sözlük. İlgi alanı önerisini oraya taşımadan önce bu
ikiliğin çözülmesi gerekir.

## 4. Tohumlanmış `topic_category_map`'te kalite kusurları var

Ölçülen örnekler: `Fotoğrafçılık` → `film-dizi-medya` (sanat ya da hobi
olmalıydı), `Felsefe` → `kisisel-gelisim` (bilim-egitim olabilirdi). Eşleştirme
bu tabloya güveniyor; yanlış eşleme yanlış gerekçe üretir. Ayrı bir gözden
geçirme işi.

## 5. Katalog darboğazı — kodla çözülmez

25 konu kategorisinin 20'si hiçbir onaylı topluluğa ulaşmıyor. `spor-fitness`'ta
46, `teknoloji`'de 36, `oyunlar`'da 30 konu var ve üçü de sıfır döndürüyor.
Uygulamanın kendi önerdiği 20 ilgi etiketinden 9'u sıfır dönüyor. Motorun
kusuru değil; katalog 5 onaylı topluluk.
