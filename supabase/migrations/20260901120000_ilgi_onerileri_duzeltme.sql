-- İlgi önerisi motoru — birinci düzeltme turu.
--
-- 20260901100000_ilgi_onerileri.sql tarihsel kayıt olarak olduğu gibi duruyor;
-- oradaki üç ölçüm yanlışının düzeltilmiş hâli aşağıdaki yorumlarda.
--
-- KAPATILAN ASIL KUSUR: ayırt edicilik kapısı KATEGORİ düzeyinde eliyordu ama
-- etkisi zincirin tamamına iniyordu — kullanıcının BİREBİR yazdığı konu adı
-- onaylı bir topluluğun konu listesinde dururken bile kart üretilmiyordu.
-- Ölçüm (01.09.2026, canlı): 'Kahve Buluşmaları' 0 satır döndürüyordu, oysa o
-- konuyu İKİ onaylı topluluk taşıyor; 'Erasmus Öğrencileri' 0 döndürüyordu,
-- oysa Eyüpsultan grubunun konusu. Ana sayfa bu sırada "... ilgi alanına uyan,
-- henüz üyesi olmadığın topluluk yok." basıyor, aynı ekranın alt ızgarası o
-- toplulukları gösteriyordu.
--
-- RETURNS TABLE DEĞİŞTİĞİ İÇİN DROP + CREATE: CREATE OR REPLACE dönüş tipini
-- değiştiremez. REVOKE/GRANT bu yüzden tekrarlanıyor.

DROP FUNCTION IF EXISTS public.ilgi_onerileri(int);

CREATE FUNCTION public.ilgi_onerileri(p_limit int DEFAULT 4)
RETURNS TABLE (
  id uuid, name text, city text, category text, cover_image_url text,
  member_count int, skor int, eslesen_ilgiler text[], dogrudan_ilgiler text[]
)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
WITH ben AS (
  -- AÇIK YÜKLEM ZORUNLU. profiles_select_authenticated politikası
  -- `(auth.uid() = id) OR is_admin()` — yüklemsiz bir SELECT, YÖNETİCİ
  -- çağırdığında BÜTÜN profillerin ilgi alanlarını birleştirirdi.
  SELECT unnest(coalesce(p.interests, '{}'::text[])) AS ham
    FROM public.profiles p
   WHERE p.id = auth.uid()
),
kirp AS (
  -- TEK NORMALLEŞTİRME NOKTASI. Eskiden uzunluk kapısı `btrim(ham)` ile
  -- ölçülüyor ama eşleşme anahtarı KIRPILMAMIŞ `ham`'dan kuruluyordu:
  -- '  Felsefe  ' kapıyı geçip hiçbir konuya vurmuyordu, 'Felsefe ' ise önek
  -- koluna düşüp "Felsefe Okumaları" üzerinden YANLIŞ kart üretiyordu.
  -- `btrim`in varsayılanı yalnızca boşluk siler; sekme/CR/LF açıkça veriliyor.
  SELECT btrim(ham, E' \t\r\n') AS ham FROM ben
),
n AS (
  -- TRANSLATE ÖNCE, LOWER SONRA. Ters sırada lower('İ') iki kod noktası
  -- üretiyor ('i' + U+0307) ve translate onu artık yakalayamıyor:
  -- 'i̇ngilizce' ≠ 'ingilizce'. Aynı kural topics.search_text'i üretiyor.
  --
  -- NORMALİZE ANAHTAR BAŞINA TEK TEMSİLCİ: 'Şiir' ile 'şiir' aynı ilgi
  -- alanıdır. Ham metin üzerinden tekilleştirmek skoru iki kez sayıyor ve
  -- gerekçe satırına "şiir ve Şiir ilgi alanlarından" yazdırıyordu.
  --
  -- ÜÇ KARAKTER EŞİĞİ ARTIK BURADA DEĞİL, `onek` KOLUNDA: birebir kol
  -- yayılamaz (topics.search_text BENZERSİZ), eşik oradayken katalogdaki iki
  -- gerçek konu ('Go', 'C#') sessizce eleniyordu.
  SELECT DISTINCT ON (lower(translate(ham, 'çğıİIöşüÇĞÖŞÜ', 'cgiiiosucgosu')))
         ham,
         lower(translate(ham, 'çğıİIöşüÇĞÖŞÜ', 'cgiiiosucgosu')) AS k
    FROM kirp
   WHERE ham <> ''
   ORDER BY lower(translate(ham, 'çğıİIöşüÇĞÖŞÜ', 'cgiiiosucgosu')), ham
),
g AS (
  -- JOKER KAPISI. `interests` serbest metin: interest-picker.tsx'te "kendin
  -- ekle" kutusu var, ilgiAlanlariSchema yalnızca trim/1-60 karaktere bakıyor.
  -- Ölçüm (01.09.2026) — '%' TEK BAŞINA uzunluk kapısına takılıyordu, yani
  -- eski yorumdaki örnek gerçekleşemiyordu. Gerçek tehlike üç ve daha uzun
  -- desenlerde: '___' kaçırmasız 569 konu, '%e%' 332 konu, '%ap' 19 konu —
  -- her biri konusu olan üç onaylı topluluğun ÜÇÜNÜ birden işaretlerdi.
  SELECT ham, k, replace(replace(replace(k, '\', '\\'), '%', '\%'), '_', '\_') AS esc
    FROM n
),
birebir AS (
  SELECT g.ham, t.id AS topic_id
    FROM g JOIN public.topics t ON t.search_text = g.k
),
onek AS (
  -- YALNIZCA o etiket için birebir HİÇ sonuç yoksa. Önek kolu TAŞIYICI:
  -- "Kısa Öykü" birebir hiçbir konuya vurmuyor, yalnızca önekle
  -- "Kısa Öyküler"e ulaşıyor.
  --
  -- KELİME SINIRI YA DA KISA EK. `LIKE 'doga%'` ham karakter öneki:
  -- "Doğaçlama"yı da yakalıyordu, o da film-dizi-medya kategorisinde, yani
  -- "doğa" yazan kullanıcıya felsefe ve fotoğraf kulübü çıkıyor, kartın
  -- altında "doğa ilgi alanından" yazıyordu (ölçüm 01.09.2026: 2 satır).
  -- Düz kelime sınırı yetmez, taşıyıcı vakayı öldürürdü; bu yüzden VEYA ile
  -- en fazla üç karakterlik ek. Ölçüldü: "Kısa Öykü"->"Kısa Öyküler",
  -- "Konser"->"Konser Arkadaşları", "Sergi"->"Sergi Turları" korunuyor;
  -- "Doğaçlama" (ek 5) düşüyor.
  --
  -- ÜÇ KARAKTER EŞİĞİ YALNIZCA BURADA. Ölçüm (01.09.2026, 571 konu): en kötü
  -- iki karakterli önek 'ka' -> 26 konu, en kötü tek karakterli 'k' -> 71.
  -- (Eski yorumdaki "'üç' yüzlerce konuya yayılırdı" ölçülmemişti: 'uc%' 1
  -- konu döndürüyor.)
  SELECT g.ham, t.id AS topic_id
    FROM g
    JOIN public.topics t
      ON t.search_text LIKE g.esc || '%'
     AND (t.search_text LIKE g.esc || ' %'
          OR length(t.search_text) - length(g.k) <= 3)
   WHERE length(g.ham) >= 3
     AND NOT EXISTS (SELECT 1 FROM birebir b WHERE b.ham = g.ham)
),
coz AS (SELECT * FROM birebir UNION ALL SELECT * FROM onek),
onayli AS (SELECT count(*)::numeric AS toplam FROM public.communities WHERE status = 'approved'),
genis AS (
  -- AYIRT EDİCİLİK KAPISI. Onaylı katalogun yarısından fazlasına ulaşan bir
  -- konu kategorisi kişiselleştirme sinyali değil, gürültüdür.
  --
  -- KAPI ARTIK YALNIZCA KATEGORİ YAYILIMINI BUDUYOR (bkz. `eslesme`);
  -- birebir konu vuruşu her hâlükârda geçer.
  --
  -- MUTLAK TABAN (>= 3): eşik oransal olduğu için küçük katalogda gevşemiyor,
  -- TERSİNE sıkışıyordu. N=1'de eşik 0,5 olup tek topluluğun dokunduğu HER
  -- kategori eleniyor ve fonksiyon hangi ilgi alanı girilirse girilsin 0 satır
  -- döndürüyordu; N=3'e kadar eşleşmelerin bir kısmı kayboluyordu. Ölçüldü:
  -- taban eklendiğinde N=4 ve N=5 sonuçları BİREBİR aynı kalıyor.
  --
  -- YALNIZCA KULLANICININ ULAŞTIĞI KATEGORİLER: `kat` zaten yalnızca bunları
  -- yokluyor, sonuç birebir aynı; ama tarama katalogla değil ilgi alanı
  -- sayısıyla orantılı kalıyor. (Ölçüm: 10.000 topluluklu sentetik katalogda
  -- korelesiz hâli tek başına ~50-70 ms ve tek ilgi alanlı çağrının %83'ü.)
  --
  -- Ölçüm (01.09.2026, N=5): yalnızca 'sosyal' eleniyor (3/5 = %60).
  SELECT m.category_id
    FROM public.topic_category_map m
    JOIN public.community_topics ct ON ct.topic_id = m.topic_id
    JOIN public.communities c ON c.id = ct.community_id AND c.status = 'approved'
   WHERE m.category_id IN (
           SELECT m0.category_id
             FROM public.topic_category_map m0
             JOIN coz ON coz.topic_id = m0.topic_id)
   GROUP BY m.category_id
  HAVING count(DISTINCT ct.community_id) >= 3
     AND count(DISTINCT ct.community_id)::numeric > 0.5 * (SELECT toplam FROM onayli)
),
kat AS (
  SELECT DISTINCT coz.ham, m.category_id AS cid
    FROM coz
    JOIN public.topic_category_map m ON m.topic_id = coz.topic_id
   -- NOT IN DEĞİL NOT EXISTS: alt sorgu tek bir NULL döndürseydi NOT IN
   -- tüm sonucu sessizce boşaltırdı.
   WHERE NOT EXISTS (SELECT 1 FROM genis WHERE genis.category_id = m.category_id)
),
eslesme AS (
  -- KATEGORİ YAYILIMI — ayırt edicilik kapısına TABİ, `dogrudan` = false.
  SELECT kat.ham, ct.community_id, false AS dogrudan
    FROM kat
    JOIN public.topic_category_map m2 ON m2.category_id = kat.cid
    JOIN public.community_topics ct ON ct.topic_id = m2.topic_id
  UNION ALL
  -- DOĞRUDAN KOL — KAPIDAN MUAF. Kullanıcının çözülen konusu topluluğun konu
  -- listesinde birebir duruyor: zincirin en güçlü sinyali, kategorisi
  -- kalabalık diye elenemez. `dogrudan` bayrağı hem sıralamayı hem arayüzdeki
  -- gerekçe cümlesini besliyor.
  SELECT coz.ham, ct.community_id, true
    FROM coz
    JOIN public.community_topics ct ON ct.topic_id = coz.topic_id
)
SELECT c.id, c.name, c.city, c.category, c.cover_image_url, c.member_count,
       count(DISTINCT e.ham)::int AS skor,
       array_agg(DISTINCT e.ham) AS eslesen_ilgiler,
       coalesce(array_agg(DISTINCT e.ham) FILTER (WHERE e.dogrudan), '{}'::text[])
         AS dogrudan_ilgiler
  FROM public.communities c
  JOIN eslesme e ON e.community_id = c.id
 -- RLS'E BIRAKILMIYOR: "Topluluklar okunabilir" politikası
 -- `status='approved' OR founder_id=auth.uid() OR is_admin()` — yüklemsiz
 -- bırakılsaydı kurucuya kendi inceleme bekleyen topluluğu ÖNERİLİRDİ.
 WHERE c.status = 'approved'
   AND c.founder_id IS DISTINCT FROM auth.uid()
   -- Zaten üye olduğun YA DA isteği BEKLEYEN topluluk öneri değildir: katılma
   -- isteği kullanıcının verebileceği en güçlü ilgi sinyali, o topluluğa dört
   -- yuvadan birini harcamak israf. Reddetme/ayrılma satırı SİLDİĞİ için bu
   -- kalıcı bir gizlenme yaratmıyor.
   AND NOT EXISTS (
     SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = c.id AND cm.user_id = auth.uid())
 GROUP BY c.id, c.name, c.city, c.category, c.cover_image_url, c.member_count, c.created_at
 -- Çok ilgi alanına birden dokunan topluluk önce; eşitlikte BİREBİR konu
 -- vuruşu olan, sonra kalabalık, sonra yeni. İkinci basamak olmadan tek ilgi
 -- alanı 'Fotoğrafçılık' olan kullanıcıya adı ve konusu literal olarak
 -- "Fotoğrafçılık" olan kulüp, felsefe-kahve topluluğunun ALTINDA kalıyordu.
 ORDER BY count(DISTINCT e.ham) DESC,
          count(DISTINCT e.ham) FILTER (WHERE e.dogrudan) DESC,
          c.member_count DESC NULLS LAST, c.created_at DESC
 LIMIT greatest(1, least(p_limit, 12));
$function$;

-- NEDEN SECURITY INVOKER: zincirin dört halkası (topics, topic_categories,
-- topic_category_map, community_topics) `FOR SELECT USING (true)` politikalı ve
-- toplu GRANT'te; community_members SELECT politikası da `USING (true)`.
-- Aşılacak duvar YOK.

-- Postgres'te yeni fonksiyon PUBLIC'e EXECUTE ile doğar; yalnızca GRANT
-- yazmak koruma değildir.
REVOKE ALL ON FUNCTION public.ilgi_onerileri(int) FROM PUBLIC;
-- anon'a VERİLMİYOR: misafirin ilgi alanı yok, auth.uid() null döner.
GRANT EXECUTE ON FUNCTION public.ilgi_onerileri(int) TO authenticated;
