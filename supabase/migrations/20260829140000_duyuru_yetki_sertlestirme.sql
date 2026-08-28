-- community_announcements: kolon yetkilerini tablo düzeyi sızıntısına karşı sertleştirir.
--
-- NEDEN: kolon bazlı yetki, tablo bazlı GRANT'i EZMEZ. Baseline panelden
-- çalıştırıldığında (KURULUM-REHBERI.md'nin anlattığı yol) supabase_admin
-- varsayılanı authenticated'a arwdDxtm veriyor ve kolon listeleri sessizce
-- anlamsızlaşıyor.
--
-- DİKKAT — canlıda yaşandı: kolon LİSTESİZ bir REVOKE, yalnız tablo düzeyini
-- değil, aynı ayrıcalığın KOLON düzeyi ACL'ini de siler. Bu yüzden REVOKE ile
-- kolon GRANT'leri AYNI dosyada, art arda olmak ZORUNDA. Ayrı ayrı
-- uygulanırsa aradaki sürede yazma tamamen kapanır.
REVOKE INSERT, UPDATE ON public.community_announcements FROM authenticated, anon;
GRANT  INSERT (community_id, author_id, title, body) ON public.community_announcements TO authenticated;
GRANT  UPDATE (title, body, updated_at, sent_count) ON public.community_announcements TO authenticated;
