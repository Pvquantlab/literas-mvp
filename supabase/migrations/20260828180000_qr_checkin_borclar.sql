-- QR check-in: son incelemeden kalan iki veritabanı borcu.

-- -----------------------------------------------------------------------------
-- 1. checkin_yap: oku-sonra-yaz yarışı
-- -----------------------------------------------------------------------------
-- ÖNCEKİ HALİ önce checked_in_at'i okuyup sonra "boşsa yaz" diyordu. İki
-- yönetici aynı anda aynı QR'ı okutursa ikisi de boş görüp yazıyor, ikisi de
-- yeni_giris=true alıyor ve checked_in_by son yazanın oluyordu.
--
-- Koşul artık UPDATE'in İÇİNDE: satır kilidi tek yazana veriliyor, ilk yazan
-- kazanıyor, ikincinin UPDATE'i hiçbir satırı etkilemiyor ve FOUND false
-- dönüyor. Dışarıdan görünen sözleşme aynı — imza, idempotanlık ve dönen
-- alanlar değişmedi.
--
-- DİKKAT: WHERE içindeki kolonlar `rsvps.` ile nitelenmek ZORUNDA. Fonksiyonun
-- checked_in_at adında bir OUT parametresi var; çıplak `checked_in_at IS NULL`
-- yazılırsa plpgsql bunu değişkenle karıştırıp belirsizlik hatası veriyor.
CREATE OR REPLACE FUNCTION public.checkin_yap(p_token uuid)
RETURNS TABLE(katilimci_adi text, checked_in_at timestamptz, yeni_giris boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE v_event uuid; v_rsvp uuid; v_yeni boolean;
BEGIN
  SELECT r.event_id, r.id INTO v_event, v_rsvp
  FROM rsvps r WHERE r.checkin_token = p_token;
  IF v_rsvp IS NULL THEN RETURN; END IF;
  IF NOT public.etkinlik_yoneticisi_mi(v_event) THEN RAISE EXCEPTION 'yetkisiz'; END IF;

  UPDATE rsvps SET checked_in_at = now(), checked_in_by = auth.uid()
  WHERE rsvps.id = v_rsvp AND rsvps.checked_in_at IS NULL;

  v_yeni := FOUND;

  RETURN QUERY
    SELECT p.name, r.checked_in_at, v_yeni
    FROM rsvps r JOIN profiles p ON p.id = r.user_id
    WHERE r.id = v_rsvp;
END;
$function$;

-- -----------------------------------------------------------------------------
-- 2. Realtime yayınından rsvps çıkarılıyor
-- -----------------------------------------------------------------------------
-- supabase/schema.sql bu tablonun bilinçli olarak yayın dışı olduğunu söylüyor
-- ("kimin nereye kayıtlı olduğu yayınlanmasın diye") ama canlıda yayına dahildi.
-- Katılımcı listesi yalnızca events.attendee_count UPDATE'ini dinliyor
-- (app/event/[id]/attendee-list.tsx) — rsvps'e abone olan kod YOK.
--
-- Yayında kaldığı sürece giriş yapmış herhangi biri kimin hangi etkinliğe
-- kaydolduğunu anlık dinleyebiliyordu (RLS SELECT politikası USING (true)).
-- Token sızmıyordu, kolon filtresi onu zaten eliyor; kırılan şey gizlilik.
--
-- Guard var: sıfırdan kurulan bir veritabanında rsvps hiç yayına eklenmediği
-- için koşulsuz DROP hata verirdi.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'rsvps'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.rsvps;
  END IF;
END $$;
