-- events SELECT policy'si USING (true) idi: bekleyen/reddedilen topluluklarin
-- etkinlikleri herkese gorunuyordu. communities'teki gizleme baypas ediliyordu.
--
-- Yeni kural, communities SELECT policy'siyle ayni hizada:
--   community_id NULL  -> bagimsiz etkinlik, herkese acik
--   onayli topluluk    -> herkese acik
--   kendi toplulugun   -> kurucusuna gorunur
--   admin              -> hepsini gorur
--   organizator        -> kendi etkinligini her durumda gorur

DROP POLICY IF EXISTS "Events okunabilir" ON public.events;
CREATE POLICY "Events okunabilir" ON public.events
  FOR SELECT
  TO public
  USING (
    community_id IS NULL
    OR organizer_id = auth.uid()
    OR is_admin()
    OR EXISTS (
      SELECT 1
      FROM communities c
      WHERE c.id = events.community_id
        AND (c.status = 'approved'::text OR c.founder_id = auth.uid())
    )
  );

CREATE INDEX IF NOT EXISTS idx_events_community_id
  ON public.events (community_id);
