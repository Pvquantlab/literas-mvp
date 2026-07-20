-- realtime.messages üzerindeki geçici policy kaldırıldı.
-- postgres_changes kaynak tablonun RLS'ini kullanır; realtime.messages policy'si
-- yalnızca private Broadcast/Presence içindir (ileride onları bozmasın diye kaldırıldı).
-- Canlı katılımcı listesi asıl olarak supabase-js/realtime-js 2.108→2.110 upgrade'i ile çözüldü.
drop policy if exists "authenticated can receive broadcasts" on realtime.messages;
