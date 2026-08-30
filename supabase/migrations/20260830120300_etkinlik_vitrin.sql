-- Tekrarlayan etkinlik serileri — 4/4: okuma tarafı katlama.

-- security_invoker = true ZORUNLU: unutulursa view, events SELECT politikasını
-- atlar ve ONAYLANMAMIŞ topluluk etkinlikleri listelere sızar. Görünür bir
-- patlama olmaz; sessiz bir güvenlik açığıdır.
--
-- Yalnızca WHERE içeriyor → çağıranın sorgusuna düzleştirilir (pull-up), yani
-- .textSearch, city_key ilike ve community_id koşulları doğrudan events'e
-- uygulanır ve GIN/b-tree indeksleri kullanılır.
--
-- SELECT e.* : kolon listesi events ile birebir aynı kalmalı. search_vector
-- (generated tsvector) de dahil — keşfetteki .textSearch onu okuyor.
DROP VIEW IF EXISTS public.etkinlik_vitrin;
CREATE VIEW public.etkinlik_vitrin WITH (security_invoker = true) AS
SELECT e.*
FROM public.events e
WHERE e.event_date >= now()
  AND (
    -- tekil etkinlik
    e.series_id IS NULL
    -- elle düzenlenmiş tekrar: artık serinin temsilcisi değil, kendi kartı var
    OR e.seri_disina_alindi_at IS NOT NULL
    -- seri temsilcisi = aynı seride kendisinden önce gelen gelecek tekrar YOK
    OR NOT EXISTS (
      SELECT 1 FROM public.events e2
      WHERE e2.series_id = e.series_id
        AND e2.seri_disina_alindi_at IS NULL
        AND e2.event_date >= now()
        AND e2.event_date < e.event_date
    )
  );

-- View'lar GRANT gerektirir (emsal: public_profiles, schema.sql:1147).
-- Unutulursa altı yüzey "permission denied for view" alır.
GRANT SELECT ON public.etkinlik_vitrin TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- seri_kalanlar — rozet sayacı
-- -----------------------------------------------------------------------------
-- Bu sayı view'ın target list'inde korele alt sorgu olarak DURMUYOR: orada
-- olsaydı satır başına koşardı ve asıl maliyet kaynağı olurdu. Sayfa topladığı
-- seri kimliklerini tek çağrıda soruyor.
--
-- SECURITY INVOKER (varsayılan) BİLİNÇLİ: sayım çağıranın RLS'i altında
-- yapılır, yani görmediği bir seri için sayı üretmez.
CREATE OR REPLACE FUNCTION public.seri_kalanlar(p_series_ids uuid[])
RETURNS TABLE (series_id uuid, kalan int, frekans text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, pg_temp
AS $function$
  SELECT e.series_id, count(*)::int, s.frekans
    FROM public.events e
    JOIN public.event_series s ON s.id = e.series_id
   WHERE e.series_id = ANY(p_series_ids)
     AND e.event_date >= now()
     AND e.seri_disina_alindi_at IS NULL
   GROUP BY e.series_id, s.frekans;
$function$;

REVOKE ALL ON FUNCTION public.seri_kalanlar(uuid[]) FROM PUBLIC;
-- anon da alıyor: ana sayfa ve keşfet giriş yapmamış kullanıcıya da açık.
GRANT EXECUTE ON FUNCTION public.seri_kalanlar(uuid[]) TO anon, authenticated;
