-- GÜVENLİK PAKETİ 1 — Topluluk ele geçirme ve onay-atlama açıklarının kapatılması
-- 2026-07-24'te SQL Editor üzerinden canlıya uygulandı.

-- 1) ÜYELİK İSTEĞİ: sadece "member + pending" olarak istek atılabilir.
--    Kurucu üyeliği yalnızca kendi, incelemedeki topluluğuna eklenebilir.
DROP POLICY IF EXISTS "Kullanici katilim istegi gonderir" ON public.community_members;
CREATE POLICY "Kullanici katilim istegi gonderir" ON public.community_members
  FOR INSERT TO public
  WITH CHECK (
    auth.uid() = user_id
    AND (
      (role = 'member' AND status = 'pending')
      OR (
        role = 'founder' AND status = 'approved'
        AND EXISTS (
          SELECT 1 FROM communities c
          WHERE c.id = community_id
            AND c.founder_id = auth.uid()
            AND c.status = 'pending_review'
        )
      )
    )
  );

-- 2) ÜYELİK GÜNCELLEME: sadece onaylı founder/admin yapabilir.
--    Kimse kendini onaylayamaz veya founder yapamaz (kurucu satırı dokunulmaz).
DROP POLICY IF EXISTS "Founder admin uyelik gunceller" ON public.community_members;
CREATE POLICY "Founder admin uyelik gunceller" ON public.community_members
  FOR UPDATE TO public
  USING (
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = community_members.community_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('founder', 'admin')
        AND cm.status = 'approved'
    )
  )
  WITH CHECK (role IN ('member', 'admin') AND status IN ('pending', 'approved'));

-- 3) ÜYE ÇIKARMA: kurucu üyeliği silinemez (topluluk sahipsiz kalmasın).
DROP POLICY IF EXISTS "Founder admin uye cikarir" ON public.community_members;
CREATE POLICY "Founder admin uye cikarir" ON public.community_members
  FOR DELETE TO public
  USING (
    role <> 'founder'
    AND (
      auth.uid() = user_id
      OR EXISTS (
        SELECT 1 FROM community_members cm
        WHERE cm.community_id = community_members.community_id
          AND cm.user_id = auth.uid()
          AND cm.role IN ('founder', 'admin')
          AND cm.status = 'approved'
      )
    )
  );

-- 4) TOPLULUK KORUMA TETİKLEYİCİSİ:
--    Admin olmayan hiç kimse status/founder/inceleme alanlarına dokunamaz.
--    Yeni topluluk her zaman 'pending_review' olarak doğar.
CREATE OR REPLACE FUNCTION public.communities_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    IF TG_OP = 'INSERT' THEN
      NEW.status := 'pending_review';
      NEW.reviewed_at := NULL;
      NEW.review_note := NULL;
    ELSE
      NEW.status := OLD.status;
      NEW.founder_id := OLD.founder_id;
      NEW.reviewed_at := OLD.reviewed_at;
      NEW.review_note := OLD.review_note;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS communities_guard ON public.communities;
CREATE TRIGGER communities_guard
  BEFORE INSERT OR UPDATE ON public.communities
  FOR EACH ROW EXECUTE FUNCTION public.communities_guard();

-- 5) TOPLULUK GÜNCELLEME: kurucu + admin yapabilir (admin onayı artık çalışır).
DROP POLICY IF EXISTS "Founder toplulugunu gunceller" ON public.communities;
CREATE POLICY "Founder toplulugunu gunceller" ON public.communities
  FOR UPDATE TO public
  USING ((auth.uid() = founder_id) OR public.is_admin())
  WITH CHECK ((auth.uid() = founder_id) OR public.is_admin());

-- 6) ETKİNLİK OLUŞTURMA: sadece o topluluğun onaylı founder/admin'i.
DROP POLICY IF EXISTS "Giriş yapmış kullanıcı etkinlik oluşturur" ON public.events;
CREATE POLICY "Giriş yapmış kullanıcı etkinlik oluşturur" ON public.events
  FOR INSERT TO public
  WITH CHECK (
    auth.uid() = organizer_id
    AND (
      community_id IS NULL
      OR EXISTS (
        SELECT 1 FROM community_members cm
        WHERE cm.community_id = events.community_id
          AND cm.user_id = auth.uid()
          AND cm.role IN ('founder', 'admin')
          AND cm.status = 'approved'
      )
    )
  );

-- 7) ETKİNLİK GÜNCELLEME: yazma koşulu da okuma koşuluyla aynı olsun.
DROP POLICY IF EXISTS "Yetkili kisi etkinligi gunceller" ON public.events;
CREATE POLICY "Yetkili kisi etkinligi gunceller" ON public.events
  FOR UPDATE TO public
  USING (
    (auth.uid() = organizer_id)
    OR EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = events.community_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('founder', 'admin')
        AND cm.status = 'approved'
    )
  )
  WITH CHECK (
    (auth.uid() = organizer_id)
    OR EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = events.community_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('founder', 'admin')
        AND cm.status = 'approved'
    )
  );
