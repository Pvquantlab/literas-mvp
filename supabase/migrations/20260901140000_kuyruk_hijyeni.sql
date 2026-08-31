-- Kuyruk hijyeni: silinen etkinliğin bekleyen postaları da gitsin.
--
-- KUSUR — bir etkinlik silindiğinde `email_outbox`'ta o etkinliğe ait
-- gönderilmemiş satırlar KALIYORDU. Cron sonradan onları gönderiyor:
-- kullanıcı iptal mailini aldıktan sonra "Yarın: X" hatırlatması alıyor ve
-- maildeki bağlantı silinmiş bir uuid'ye, yani 404'e gidiyor.
--
-- İKİ AYRI BOŞLUK VARDI:
--   1. `seri_sil` kuyruğu temizliyor ama YALNIZCA `template = 'reminder'`
--      için. `promotion` satırı da `payload->>'event_id'` taşıyor
--      (queue_promotion_emails) ve arkada kalıyordu.
--   2. TEKİL etkinlik silme yolu (app/api/event/[id]/route.ts DELETE,
--      kapsam='tek') kuyruğu HİÇ temizlemiyordu — belgelenmemiş, daha
--      büyük boşluk buydu.
--
-- NEDEN TRIGGER, RPC DEĞİL: `email_outbox` RLS açık, sıfır politikası ve
-- sıfır tablo GRANT'i var — yalnızca SECURITY DEFINER kod dokunabiliyor.
-- Bunu bir RPC'ye koysaydık "kimin hangi etkinliğin kuyruğunu silmeye
-- hakkı var" sorusunu elle çözmek gerekirdi; yanlış çözülürse biri
-- başkasının etkinliğinin hatırlatmalarını susturabilirdi. Trigger'da o
-- soru YOK: satır zaten silinebildiyse yetki RLS tarafından verilmiştir.
-- Ayrıca gelecekte açılacak her silme yolu kendiliğinden kapsanır.
--
-- NEDEN `payload->>'event_id'` GÜVENLİ BİR ÖLÇÜT: kuyruğa yazan beş yerin
-- şablonları tarandı — `event_id` anahtarını YALNIZCA `reminder` ve
-- `promotion` taşıyor. `event_cancel` (tur/title/adet/community_id),
-- `event_change` (series_id) ve `join_request` (community_id) taşımıyor.
-- Bu kritik: `seri_sil` iptal bildirimini silmeden ÖNCE kuyruğa yazıyor;
-- ölçüt `event_id` olmasaydı trigger az önce yazılan iptal maillerini
-- silerdi ve kimse haberdar olmazdı.

CREATE OR REPLACE FUNCTION public.etkinlik_silinince_kuyrugu_temizle()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
BEGIN
  DELETE FROM email_outbox o
   WHERE o.sent_at IS NULL
     -- Anahtar yoksa satır bu etkinliğe ait değildir; `?` kontrolü aynı
     -- zamanda ->> sonucunun uuid'ye çevrilmesini güvenceye alıyor.
     AND o.payload ? 'event_id'
     AND (o.payload->>'event_id')::uuid IN (SELECT s.id FROM silinen s);
  RETURN NULL;
END
$function$;

-- FOR EACH STATEMENT + geçiş tablosu: `seri_sil` 26 tekrarı tek DELETE ile
-- siliyor; satır bazlı trigger 26 kez koşardı.
DROP TRIGGER IF EXISTS events_kuyruk_temizligi ON public.events;
CREATE TRIGGER events_kuyruk_temizligi
  AFTER DELETE ON public.events
  REFERENCING OLD TABLE AS silinen
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.etkinlik_silinince_kuyrugu_temizle();

-- NOT: `seri_sil` içindeki satır içi `DELETE FROM email_outbox ... template =
-- 'reminder'` artık GEREKSİZ (trigger onu da kapsıyor) ama ZARARSIZ: aynı
-- satırları erken siliyor, trigger kalanı topluyor. O fonksiyona bir sonraki
-- dokunuşta düşürülmeli — tek başına 100 satırlık gövdeyi yeniden yazmak
-- bu turda taşınacak riskten büyük.
