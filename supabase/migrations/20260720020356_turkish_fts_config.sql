-- search_vector kolonlarını 'simple' -> 'turkish' config'e geçir.
-- immutable_unaccent ve A/B/C ağırlıkları korunur (iki katman birlikte çalışır).
-- Böylece "kitaplar" araması "kitap" içeren sonuçları da bulur (stemming).

-- events: title(A) + description(B) + location(C)
DROP INDEX IF EXISTS events_search_vector_idx;
ALTER TABLE events DROP COLUMN IF EXISTS search_vector;
ALTER TABLE events ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('turkish', immutable_unaccent(COALESCE(title, ''))), 'A') ||
    setweight(to_tsvector('turkish', immutable_unaccent(COALESCE(description, ''))), 'B') ||
    setweight(to_tsvector('turkish', immutable_unaccent(COALESCE(location, ''))), 'C')
  ) STORED;
CREATE INDEX events_search_vector_idx ON events USING gin (search_vector);

-- communities: name(A) + description(B) + city(C)
DROP INDEX IF EXISTS communities_search_vector_idx;
ALTER TABLE communities DROP COLUMN IF EXISTS search_vector;
ALTER TABLE communities ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('turkish', immutable_unaccent(COALESCE(name, ''))), 'A') ||
    setweight(to_tsvector('turkish', immutable_unaccent(COALESCE(description, ''))), 'B') ||
    setweight(to_tsvector('turkish', immutable_unaccent(COALESCE(city, ''))), 'C')
  ) STORED;
CREATE INDEX communities_search_vector_idx ON communities USING gin (search_vector);
