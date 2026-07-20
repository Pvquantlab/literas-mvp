-- rsvps tablosunu Supabase Realtime publication'ına ekle (canlı katılımcı listesi için)
-- SQL Editor'de elle uygulandı; bu dosya migration geçmişini senkron tutar.
alter publication supabase_realtime add table public.rsvps;
