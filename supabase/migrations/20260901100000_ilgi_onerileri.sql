-- İlgi alanlarına göre topluluk önerisi.
--
-- NEDEN — `profiles.interests` bugüne kadar ÜÇ YERDE yazılıp SIFIR sorguda
-- okunuyordu, üstelik ayarlar sayfası açıkça "size yakın toplulukları bunlara
-- göre önerelim" diye söz veriyordu. Bu, depoda ÜÇÜNCÜ kez aynı hata:
--   1. profile_visibility — 20260827120000_guvenlik_paketi_3.sql:81
--      "hiçbir etkisi yoktu"
--   2. show_participation — katilim_karnesi turunda "üç yerde birden değiştir"
--      kuralı tam da bu yüzden konuldu
--   3. interests — burası
-- Kolonun okunduğu ilk sorgu bu.
--
-- YÜZEY NEDEN TOPLULUK, ETKİNLİK DEĞİL: ölçüm (01.09.2026)
-- `select count(*) from events where event_date >= now()` = 0. Sekiz etkinliğin
-- sekizi de geçmişte (en yenisi 13.08.2026). Etkinlik üstüne kurulan her
-- kişiselleştirme bugün %100 boş dönerdi.

-- -----------------------------------------------------------------------------
-- ilgi_onerileri
-- -----------------------------------------------------------------------------
-- ZİNCİR: profiles.interests (serbest metin)
--           → topics (birebir, yoksa önek)
--           → topic_category_map → topic_categories (25'li taksonomi)
--           → aynı kategorideki konular → community_topics → communities
--
-- KATEGORİ DÜZEYİNDE DURULUYOR, KONU KİMLİĞİNDE DEĞİL. Ölçüm: ahmet'in üç
-- ilgi alanının çözüldüğü konular (Kısa Öyküler, Podcast, Müze) HİÇBİR
-- toplulukta kullanılmıyor — konu düzeyinde birebir eşleştirme sıfır döner.
-- Kategori düzeyi çalışıyor.
--
-- KATEGORİ KOLU BİLİNÇLİ OLARAK YOK. `communities.category` üzerinden ikinci
-- bir kol kurulabilirdi ve bugün +2 topluluğa erişim sağlardı (kadıköy kitap
-- kulübü, taksim yürüyüş kulübü — ikisinin de konusu yok). Kullanıcı kararıyla
-- yazılmadı: 14'lü lib/categories.ts ile 25'li topic_categories arasında elle
-- yazılmış bir eşleme tablosu gerektiriyordu ve sihirbaz artık hem kategoriyi
-- hem en az bir konuyu zorunlu kıldığı için (MIN_TOPICS, validations.ts) o
-- kolun gelecekteki değeri sıfırdı. BEDELİ: konusuz onaylı topluluklar hiçbir
-- ilgi alanından görünmüyor ve "Doğa Yürüyüşü" sıfır döndürüyor.

CREATE OR REPLACE FUNCTION public.ilgi_onerileri(p_limit int DEFAULT 4)
RETURNS TABLE (
  id uuid, name text, city text, category text, cover_image_url text,
  member_count int, skor int, eslesen_ilgiler text[]
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
n AS (
  -- TRANSLATE ÖNCE, LOWER SONRA. Ters sırada lower('İ') iki kod noktası
  -- üretiyor ('i' + U+0307) ve translate onu artık yakalayamıyor:
  -- 'i̇ngilizce' ≠ 'ingilizce'. Aynı kural topics.search_text'i üretiyor.
  -- Üç karakterden kısa etiket elenir: "üç" gibi bir girdi öneke düşüp
  -- yüzlerce konuya yayılırdı.
  SELECT DISTINCT ham, lower(translate(ham, 'çğıİIöşüÇĞÖŞÜ', 'cgiiiosucgosu')) AS k
    FROM ben
   WHERE length(btrim(ham)) >= 3
),
g AS (
  -- JOKER KAPISI. `interests` serbest metin: kaçırılmazsa ilgi alanı olarak
  -- '%' kaydeden kullanıcı 571 konunun tamamıyla, dolayısıyla katalogun
  -- tamamıyla eşleşirdi. lib/categories.ts sanitizeQuery ile aynı refleks.
  SELECT ham, k, replace(replace(replace(k, '\', '\\'), '%', '\%'), '_', '\_') AS esc
    FROM n
),
birebir AS (
  SELECT g.ham, t.id AS topic_id
    FROM g JOIN public.topics t ON t.search_text = g.k
),
onek AS (
  -- YALNIZCA o etiket için birebir HİÇ sonuç yoksa. Ölçüm: düz önek
  -- 'felsefe%' hem "Felsefe"yi (kisisel-gelisim) hem "Felsefe Okumaları"nı
  -- (kitap-edebiyat) getiriyor ve gerekçeyi kirletiyor. Buna karşılık önek
  -- kolu TAŞIYICI: "Kısa Öykü" birebir hiçbir konuya vurmuyor, yalnızca
  -- önekle "Kısa Öyküler"e ulaşıyor.
  SELECT g.ham, t.id AS topic_id
    FROM g JOIN public.topics t ON t.search_text LIKE g.esc || '%'
   WHERE NOT EXISTS (SELECT 1 FROM birebir b WHERE b.ham = g.ham)
),
coz AS (SELECT * FROM birebir UNION ALL SELECT * FROM onek),
onayli AS (SELECT count(*)::numeric AS toplam FROM public.communities WHERE status = 'approved'),
genis AS (
  -- AYIRT EDİCİLİK KAPISI. Onaylı katalogun yarısından fazlasına ulaşan bir
  -- konu kategorisi kişiselleştirme sinyali değil, gürültüdür — "senin ilgine
  -- göre" diye katalogun çoğunu işaretlemek geçen turda kapatılan kusurun
  -- aynısı olurdu. Eşik verinin KENDİSİNDEN hesaplanıyor, sabit değil:
  -- katalog büyüdükçe kendiliğinden gevşiyor.
  -- Ölçüm (01.09.2026): yalnızca 'sosyal' eleniyor (3/5 = %60).
  SELECT m.category_id
    FROM public.topic_category_map m
    JOIN public.community_topics ct ON ct.topic_id = m.topic_id
    JOIN public.communities c ON c.id = ct.community_id AND c.status = 'approved'
   GROUP BY m.category_id
  HAVING count(DISTINCT ct.community_id)::numeric > 0.5 * (SELECT toplam FROM onayli)
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
  SELECT DISTINCT kat.ham, ct.community_id
    FROM kat
    JOIN public.topic_category_map m2 ON m2.category_id = kat.cid
    JOIN public.community_topics ct ON ct.topic_id = m2.topic_id
)
SELECT c.id, c.name, c.city, c.category, c.cover_image_url, c.member_count,
       count(DISTINCT e.ham)::int AS skor,
       array_agg(DISTINCT e.ham) AS eslesen_ilgiler
  FROM public.communities c
  JOIN eslesme e ON e.community_id = c.id
 -- RLS'E BIRAKILMIYOR: "Topluluklar okunabilir" politikası
 -- `status='approved' OR founder_id=auth.uid() OR is_admin()` — yüklemsiz
 -- bırakılsaydı kurucuya kendi inceleme bekleyen topluluğu ÖNERİLİRDİ.
 WHERE c.status = 'approved'
   AND c.founder_id IS DISTINCT FROM auth.uid()
   -- Zaten üyesi olduğun topluluk öneri değildir.
   AND NOT EXISTS (
     SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = c.id AND cm.user_id = auth.uid()
        AND cm.status = 'approved')
 GROUP BY c.id, c.name, c.city, c.category, c.cover_image_url, c.member_count, c.created_at
 -- Çok ilgi alanına birden dokunan topluluk önce. Eşitlikte kalabalık,
 -- sonra yeni.
 ORDER BY count(DISTINCT e.ham) DESC, c.member_count DESC NULLS LAST, c.created_at DESC
 LIMIT greatest(1, least(p_limit, 12));
$function$;

-- NEDEN SECURITY INVOKER: zincirin dört halkası (topics, topic_categories,
-- topic_category_map, community_topics) `FOR SELECT USING (true)` politikalı ve
-- toplu GRANT'te; community_members SELECT politikası da `USING (true)`.
-- Aşılacak duvar YOK. DEFINER olsaydı her daraltmayı elle yazmak gerekirdi —
-- 20260831160000_karne_gizlilik_hizalama.sql'in pahalıya öğrettiği ders.

-- Postgres'te yeni fonksiyon PUBLIC'e EXECUTE ile doğar; yalnızca GRANT
-- yazmak koruma değildir.
REVOKE ALL ON FUNCTION public.ilgi_onerileri(int) FROM PUBLIC;
-- anon'a VERİLMİYOR: misafirin ilgi alanı yok, auth.uid() null döner.
GRANT EXECUTE ON FUNCTION public.ilgi_onerileri(int) TO authenticated;
