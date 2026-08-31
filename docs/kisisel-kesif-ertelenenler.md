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
