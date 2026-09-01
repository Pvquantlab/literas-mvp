# Tekrarlayan seriler — ertelenmiş bulgular ve sonraki tur

PR [#13](https://github.com/Pvquantlab/literas-mvp/pull/13) birleşti (31.08.2026).

Aşağıdakiler 12 görevlik uygulama ve beş mercekli final inceleme sırasında
tespit edilip **bilinçli olarak ertelenmiş** bulgular. Hiçbiri birleşmeyi
engellemedi; final inceleme her birini tek tek triyaj etti.

## Sonraki turun ilk maddesi

**"Seriye geri kat" eylemi yok.** Bir tekrarı tek başına düzenlemek onu seriden
**kalıcı** olarak çıkarıyor. Spec ilk yazıldığında bu eylemi öngörüyordu
(`seri_disina_alindi_at = NULL`); uygulanmadı ve açıkça kapsam dışına alındı.
Kendi RPC'sini, rota dalını ve arayüz denetimini gerektiriyor.

## Ertelenmiş bulgular (18)

- **Görev 1-4** · k2 — seri_sil iptal maili başlığını v_idler[1]'den okuyor, array_agg sırası tanımsız. K2 düzeltmesinden sonra başlıklar tekdüze olacağı için pratik etkisi kalmıyor.
- **Görev 1-4** · k3 — kuyruk temizliği yalnızca 'reminder' şablonunu siliyor; 'promotion' satırı da payload->>'event_id' taşıyor.
- **Görev 1-4** · k4 — seri fonksiyonları p_title/p_location'ı NOT NULL kolonlara doğrulamadan yazıyor; zod katmanı atlanırsa ham 23502.
- **Görev 1-4** · k5b — hiçbir alan değişmese bile `sonrakiler` seriyi bölüyor ("değişti mi" kapısı yalnızca UPDATE'i ve maili tutuyor, bölme ondan önce ve koşulsuz). İncelemeci kural ihlali saymadı; bölme zaten anlamlı bir işlem olarak döndürülüyor. Son incelemede triyaj edilsin.
- **Görev 1-4** · `etkinlik_guncelle`'deki yeni EXISTS tarih kontrolü TOCTOU — iki eşzamanlı tarih taşıma hâlâ ham 23505 üretebilir. Pencere çok dar.
- **Görev 6** · K2 — seri duyurusu `sendBulkEmail` kullanıyor (`Promise.all`, hepsi paralel), oysa aynı hedef kitle için `sendChunkedEmail` yazılmıştı. 60 üyeli toplulukta Resend saniyelik sınırına çarpanlar sessizce düşüyor. Kardeş dalla tutarlı (bilinçli borç) ama yeni bir çağrı noktası açıyor.
- **Görev 6** · K4 — mail gövdesinde `seri.uretilen` (int) ve `seri.ilk_event_id` (uuid) `escapeHtml`'siz. Enjeksiyon mümkün değil (RPC'nin tip güvenli dönüşü), ama kural mutlak yazılmış ve duyuru şablonu uuid'yi kaçırıyor. Tutarlılık notu.
- **Görev 7** · K1 — `kapsam !== 'tek'` ama `series_id` NULL ise sessizce tekil yola düşüyor. Bayat sekme senaryosu (başkası seriyi silmiş, `ON DELETE SET NULL` ile series_id boşalmış). Yanıt şekli farklı olduğu için arayüz ayırt EDEBİLİR ama açık sinyal yok.
- **Görev 7** · K3 — boş `seriRows`/`silRows` gerçek sıfır sonuçtan ayırt edilmiyor (`?? 0` fallback'i beklenmeyen boş dönüşü başarı gibi gösterir).
- **Görev 9** · K1 — radyo gruplarında `role="radiogroup"` / `<fieldset><legend>` yok. Görünür etiket var (bağlayıcı gereksinim karşılanıyor) ama ekran okuyucu kullanıcısı grubun neyle ilgili olduğunu duymuyor.
- **Görev 9** · K2 — inline ezme radyonun boyutunu düzeltiyor ama `border`/`background`/`border-radius`'unu değil; Firefox'ta 16×16 krem yuvarlatılmış kare, Chrome'da daire görünebilir. globals.css'e `accent-color` ya da `appearance` eklemek Görev 8 ve 9'u tek seferde çözer — AYRI İŞ.
- **Görev 9** · K3 — radyolar `disabled={loading}` almıyor (fonksiyonel etkisi yok, kapanış submit anındaki değeri yakalıyor).
- **Görev 9** · K6 — onay satırının dikey hizası `center`, radyo kolonu geldiği için `flex-start` daha okunur olurdu. Kozmetik.
- **Görev 10** · detay sayfasında "diğer etkinlikler" listesi seri elenince 4'ten 3'e düşebilir, yerine yenisi çekilmiyor. Brief'in kabul ettiği davranış.
- **Görev 10** · `takvimRes` hatası yutuluyor (console.error yok). Dosyadaki diğer iki sorgu da aynı desende — tutarlı ama ana sayfa logluyor.
- **Görev 11** · K7 — `profile/[id]` iki sorguda `series_id` çekiyor ama hiç kullanmıyor (rozet o sayfada bilinçli olarak yok). Ölü kolon.
- **Görev 11** · K9 — detayda iki seri sorgusu sequential, Promise.all ile tek gidiş-dönüşe inebilir.
- **Görev 11** · K10 — bilinmeyen frekans sessizce "aylık" yazıyor (bugün CHECK üç değere kilitli, zararsız).

## Ayrı iş olarak ayrılanlar

- **globals.css'e `accent-color` / `appearance`** — radyo ve checkbox'ların
  tarayıcılar arası görünümünü Görev 8 ve 9 için tek seferde çözer. Tasarım dili
  ölçülmüş olduğu için **ölçmeden dokunulmamalı**.
- **Toplu mail chunking** — seri duyurusu `sendBulkEmail` kullanıyor; aynı hedef
  kitle için yazılmış `sendChunkedEmail` var ama event rotaları bilinçli olarak
  eskisinde kalmış. Dalın borcu değil, deponun borcu.
- **Kuyruk hijyeni** — `seri_sil` yalnızca `reminder` şablonunu temizliyor;
  `promotion` satırı da `payload->>'event_id'` taşıyor.

## Final düzeltme dalgasında kapatılanlar

- **Görev 11 K8** — ana sayfanın "Yaklaşan etkinlikler" listesine seri ibaresi
  eklendi. Erteleme kararı GERİ ALINDI: sayaç düzeltilince ekran kendi kendini
  yalanlayacaktı (başlık "24 buluşma", liste 2 satır).
- **Görev 9** — `edit-event-form`'un `handleDelete`'i artık başarı gövdesini
  okuyor ve `atlanan` sayısını söylüyor.

## Görev 12'de kapatılanlar

- Ölü indeks `idx_events_community_id` düşürüldü (migration 20260830120400).
- `CLAUDE.md`'deki tarih kuralına "biçimlendirme için" ibaresi eklendi —
  `timestamptz` serileştirmesi için `toISOString()` zararsız ve depoda 20+
  emsali var; kural metni her incelemede yanlış alarm üretiyordu.


---

# Kapatma turu (01.09.2026, commit sonrası)

## Kapatıldı

- **Kuyruk hijyeni** — `seri_sil` yalnızca `reminder` temizliyordu. Ölçerken
  daha büyük ve BELGELENMEMİŞ bir boşluk çıktı: **tekil etkinlik silme yolu
  kuyruğu hiç temizlemiyordu**. İkisi birden `events` üzerine konan
  `AFTER DELETE ... FOR EACH STATEMENT` trigger'ıyla kapandı
  (migration `20260901140000`). Trigger seçilme sebebi: `email_outbox`'ın
  sıfır politikası ve sıfır GRANT'i var, RPC olsaydı "kimin hangi etkinliğin
  kuyruğunu silme hakkı var" sorusunu elle çözmek gerekirdi.
  Ölçüt `event_id` — bu anahtarı yalnızca `reminder` ve `promotion` taşıyor,
  `event_cancel` taşımıyor; yoksa trigger `seri_sil`'in silmeden ÖNCE yazdığı
  iptal maillerini silerdi. Beş maddelik geri sarılan blokla doğrulandı.
- **Görev 9 · K1** — `role="radiogroup"` + `aria-labelledby` iki forma da
  eklendi. `<fieldset><legend>` seçilmedi: tarayıcının kendi kenarlık/dolgu
  stilini getiriyor, tasarım dili ölçülmüş durumda.
- **Görev 9 · K3** — iptal formundaki radyolar artık `disabled={loading}`,
  düzenleme formundakiler `disabled={busy}` (ilk turda ikincisi atlanmıştı;
  formdaki diğer HER kontrol zaten `busy` ile kapanıyordu).
- **WCAG 4.1.3 durum mesajları** — iptal/kaydetme sonucu ekran okuyucuya hiç
  duyurulmuyordu. Hata dalı `role="alert"` aldı; bilgilendirme için `.sr-only`
  + `role="status"` bölgesi KOŞULSUZ mount'lu (içerikle aynı anda DOM'a giren
  polite bölge duyurulmuyor), görünür kopya `aria-hidden`. NOT: ekran
  okuyucuyla ELLE doğrulanmadı — "duyuruluyor" diye yazmıyorum, yalnızca
  yapının doğru olduğunu söylüyorum.
- **Toplu kapsamın tarihi düşürdüğü** artık hem kalıcı bir `.sr-only`
  açıklamayla radyolara bağlı (alan `disabled` olduğu için açıklamayı ALANA
  bağlamak işe yaramaz — odaklanamıyor), hem de sonuç metninde yazıyor.
  Öncesinde kullanıcı tarihi doldurup "tümü" seçiyor, sunucu tarihi sessizce
  atıyor ve hiçbir yerde söylenmiyordu.
- **Görev 11 · K10** — bilinmeyen frekans sessizce "aylık" yazıyordu; İKİ
  değil **DÖRT** yerde birbirinden habersiz (`components/event-card.tsx`,
  `app/event/[id]/page.tsx`, `components/upcoming-events.tsx` ve
  `app/api/event/route.ts` seri duyuru maili). İlk turda ikisini bağlayıp
  "tek kaynak" yazmıştım; inceleme kalan ikisini buldu. Dördü de `lib/seri.ts`e
  bağlandı. Tanınmayan değerde `null` dönüyor ve arayüz frekansı YAZMIYOR;
  duyuru mailinde cümle sıfatsız kuruluyor ("12 buluşma"), Türkçede sorunsuz
  bozunduğu için yedek metin seçmek gerekmedi. Eksik bilgi, yanlış bilgiden
  iyidir.
- **Görev 11 · K7 (kısmen — belge yarı yanlıştı)** — `profile/[id]`'de iki
  sorgunun `series_id` çektiği yazıyordu. Ölçüldü: `organizedEvents`'teki
  KULLANILIYOR (seri katlaması, satır ~100). Yalnızca `rsvps` embed'indeki
  ölüydü ("Katıldığı" listesi seriyi bilinçle katlamıyor) — o kaldırıldı.
- **Görev 10 · `takvimRes` hatası yutuluyordu** — aynı dosyadaki diğer iki
  sorgunun hatası da yutuluyordu; üçü de artık loglanıyor.

## Kapatılmadı — gerekçesiyle

- **"Seriye geri kat" eylemi** — kendi RPC'si, rota dalı ve arayüz denetimini
  gerektiriyor. Bu turun kapsamındaki "ertelenmiş bulgu" değil, ayrı bir
  özellik.
- **`accent-color` / `appearance`** — belgenin kendi notu: tasarım dili
  ÖLÇÜLMÜŞ olduğu için ölçmeden dokunulmamalı. Tarayıcıda ölçüm gerektiriyor
  ve bu turda giriş yapmış yüzeylere erişemedim.
- **Görev 1-4 k2/k4/k5b, TOCTOU, Görev 6 K2/K4, Görev 7 K1/K3, Görev 11 K9** —
  hepsi `seri_sil`/`seri_guncelle`'nin 100+ satırlık gövdelerini yeniden
  yazmayı ya da davranış kararı vermeyi gerektiriyor. Hiçbirinin bugün
  kullanıcıya görünen etkisi yok (canlıda sıfır seri var). O fonksiyonlara
  bir sonraki gerçek dokunuşta toplu ele alınmalı.

## Bu turun incelemesinden çıkan yeni defter maddeleri

- **`seri_sil` içindeki çevrim hâlâ korumasız.** Trigger'ın çevrim yönü
  düzeltildi ama `seri_sil`'in kendi satır içi `DELETE`'i hâlâ
  `(payload->>'event_id')::uuid = ANY(v_idler)` kullanıyor
  (`20260830120200`:255). O gövdeye dokunmak "bilinçli kapatılmayanlar"
  listesinde. Bir sonraki dokunuşta hem çevrim yönü hem de yeni METİN
  indeksiyle uyum (`email_outbox_bekleyen_event_idx` uuid ifadeli yükleme
  eşleşmez) birlikte ele alınmalı.
- **`email_outbox` gönderilmiş satırları hiç budanmıyor.** Tabloya dokunan
  iki `DELETE` de `sent_at IS NULL` ile sınırlı. Kısmi indeks trigger tarafını
  çözdü ama günde bir koşan `claim_email_outbox`'ın taraması duruyor.
  `sent_at < now() - interval '90 days'` süpüren bakım işi ayrı bir iş.
- **`login`/`signup` sayfalarındaki `<p role="status">`** bu turda düzeltilen
  zayıflığın aynısını taşıyor: bölge içeriğiyle aynı anda mount ediliyor,
  polite duyuru kaçabilir.
- **Kenar çubuğuna taşma göstergesi ("+N daha").** Eklenirse kişisel şerit ile
  kenar çubuğu arasındaki kapsam farkı gerçekten kapanır.
- **SÜREÇ KUSURU: migration'lar dosyadan uygulanmıyor.** İnceleme yakaladı —
  canlı defterde kayıt `20260831232330 kuyruk_hijyeni`, depodaki dosya
  `20260901140000_kuyruk_hijyeni.sql`, ve canlı gövdenin yorumları ASCII'ye
  çevrilmişti (MCP ile elle uygulandığı için). Yani depoyu düzeltmek üretimi
  düzeltmiyor; bu turda ikisi de ayrı ayrı uygulandı ve `pg_get_functiondef`
  ile doğrulandı. Kalıcı çözüm: migration'ları dosyadan uygulayan bir yol.
