-- Check-in sayfasının yetki kapısı.
--
-- NEDEN: rsvps SELECT politikası USING (true). Sayfanın kendisi yetki
-- kontrolü yapmazsa giriş yapmış herkes katılımcı listesini ve giriş
-- durumlarını görebiliyor.
--
-- Bu fonksiyonu vermek güvenli: içeride auth.uid() kullanıyor, yani çağıran
-- yalnızca KENDİ yetkisini sorabiliyor, başkasınınkini değil. Dönen bilgi
-- (kullanıcının o etkinliği yönetip yönetmediği) zaten kendisinin bildiği bir şey.
GRANT EXECUTE ON FUNCTION public.etkinlik_yoneticisi_mi(uuid) TO authenticated;
