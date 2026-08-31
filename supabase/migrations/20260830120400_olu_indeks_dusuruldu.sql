-- Tekrarlayan etkinlik serileri — 5/5: ölü indeks düşürüldü.
--
-- idx_events_community_id (community_id) tek başına artık hiçbir sorgu planı
-- için seçilemiyor: Görev 1'de eklenen idx_events_community_date
-- (community_id, event_date) onu sütun öneki olarak TAMAMEN kapsıyor —
-- planlayıcı community_id'ye göre süzen her sorguda bunun yerine onu seçer.
-- Tespit Görev 1-4 incelemesinde yapıldı (k1, deferred). Eski indeks yalnızca
-- INSERT/UPDATE/DELETE'te bakım maliyeti bırakıyordu, okuma tarafında hiçbir
-- kazancı kalmamıştı.
DROP INDEX IF EXISTS public.idx_events_community_id;
