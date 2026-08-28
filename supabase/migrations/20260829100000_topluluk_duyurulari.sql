-- Topluluk duyuruları: organizatörün etkinlikten bağımsız üye iletişimi.

-- -----------------------------------------------------------------------------
-- 1. Ortak yetki yüklemi
-- -----------------------------------------------------------------------------
-- get_member_emails içindeki founder/admin kontrolü üç RLS politikasında ve
-- iki sayfa kapısında tekrar edilecekti. Tek yerde tutuluyor ki ayrışamasınlar.
--
-- SECURITY DEFINER olması ayrıca RLS özyinelemesini önlüyor: politika
-- community_members'a bakıyor, o da kendi politikasını tetiklemiyor.
--
-- GRANT vermek güvenli: fonksiyon içeride auth.uid() kullanıyor, yani çağıran
-- yalnızca KENDİ yetkisini sorabiliyor. Dönen bilgi zaten kendisinin bildiği
-- bir şey. (etkinlik_yoneticisi_mi için verilen kararla birebir aynı.)
CREATE OR REPLACE FUNCTION public.topluluk_yoneticisi_mi(p_community_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM community_members cm
    WHERE cm.community_id = p_community_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('founder','admin')
      AND cm.status = 'approved'
  );
$function$;

REVOKE ALL ON FUNCTION public.topluluk_yoneticisi_mi(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.topluluk_yoneticisi_mi(uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- 2. Tablo
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_announcements (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  -- Yazar silinse de duyuru kalsın: kalan üyeler geçmişi kaybetmemeli.
  author_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  title        text NOT NULL,
  body         text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz,
  -- Kaç kişiye ULAŞTI. Üye sayısıyla aynı olmak zorunda değil: bildirim
  -- tercihini kapatmış üyeler get_member_emails tarafından süzülüyor.
  sent_count   integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS community_announcements_community_created_idx
  ON public.community_announcements (community_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 3. RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.community_announcements ENABLE ROW LEVEL SECURITY;

-- Duyuru üye iletişimidir ("salon değişti", "kapı kodu 1234"). Postayı zaten
-- yalnızca üyeler alıyor; sayfa da aynı kitleyi görmeli.
CREATE POLICY "Duyurulari onayli uye okur" ON public.community_announcements
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM community_members cm
    WHERE cm.community_id = community_announcements.community_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
  ));

CREATE POLICY "Duyuruyu yonetici yazar" ON public.community_announcements
  FOR INSERT WITH CHECK (
    public.topluluk_yoneticisi_mi(community_id) AND author_id = auth.uid()
  );

CREATE POLICY "Duyuruyu yonetici gunceller" ON public.community_announcements
  FOR UPDATE USING (public.topluluk_yoneticisi_mi(community_id));

CREATE POLICY "Duyuruyu yonetici siler" ON public.community_announcements
  FOR DELETE USING (public.topluluk_yoneticisi_mi(community_id));

-- -----------------------------------------------------------------------------
-- 4. Yetkiler
-- -----------------------------------------------------------------------------
-- ÖLÇÜLDÜ: migration rolü (postgres) ile oluşturulan tabloda authenticated
-- yalnızca Dxtm (TRUNCATE/REFERENCES/TRIGGER/MAINTAIN) alıyor; SELECT/INSERT/
-- UPDATE/DELETE gelmiyor. Yani aşağıdakiler tek kaynak.
--
-- DİKKAT: bu tablo panelden (supabase_admin olarak) oluşturulsaydı varsayılan
-- yetki arwdDxtm olurdu ve aşağıdaki kolon kısıtları SESSİZCE anlamsızlaşırdı
-- -- kolon bazlı yetki, tablo bazlı GRANT'i ezmez. Tabloyu her zaman
-- migration ile oluştur.
GRANT SELECT ON public.community_announcements TO authenticated;
GRANT DELETE ON public.community_announcements TO authenticated;

-- created_at ve id istemciden yazılamaz: created_at sıralamayı belirliyor,
-- uydurulabilseydi bir duyuru akışın başına çivilenebilirdi.
GRANT INSERT (community_id, author_id, title, body)
  ON public.community_announcements TO authenticated;

-- community_id BİLİNÇLİ olarak yok: UPDATE politikasında yalnızca USING var,
-- WITH CHECK yok. Kolon güncellenebilseydi bir yönetici duyuruyu yönetmediği
-- bir topluluğa taşıyabilirdi. İki koruma birbirine bağlı.
GRANT UPDATE (title, body, updated_at, sent_count)
  ON public.community_announcements TO authenticated;
