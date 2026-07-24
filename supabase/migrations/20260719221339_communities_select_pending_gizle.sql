-- Bekleyen (pending) topluluklar herkese gorunmesin.
-- Bu policy canli veritabaninda SQL Editor'den elle uygulanmisti; dosya bos kalmisti.
-- Migration'lar tek dogruluk kaynagi oldugu icin buraya birebir yazildi.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT p.is_admin FROM profiles p WHERE p.id = auth.uid()), false);
$$;

DROP POLICY IF EXISTS "Topluluklar okunabilir" ON public.communities;
CREATE POLICY "Topluluklar okunabilir" ON public.communities
  FOR SELECT
  TO public
  USING (
    (status = 'approved'::text)
    OR (founder_id = auth.uid())
    OR is_admin()
  );
