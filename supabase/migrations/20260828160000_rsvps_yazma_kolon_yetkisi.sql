-- Check-in kolonlarını yazmaya karşı kapatır.
--
-- NEDEN: 20260828120000 kolon bazlı korumayı yalnızca SELECT'e uyguladı.
-- Tablo bazlı INSERT yetkisi checked_in_at/checked_in_by/checkin_token'ı da
-- kapsıyordu ve INSERT politikasında kolon kısıtı yok — onaylı bir üye kendi
-- RSVP'sini silip "gelmiş" bir satır yazabiliyor, üstelik checked_in_by'a
-- organizatörün kimliğini koyabiliyordu.
--
-- DİKKAT — aynı Postgres tuzağı: kolon bazlı REVOKE, tablo bazlı GRANT'i
-- EZMEZ. Önce tablo yetkisi kaldırılır, sonra kolonlar tek tek verilir.
--
-- UPDATE hiç geri verilmiyor: rsvps'te UPDATE politikası yok ve uygulama
-- kodunda rsvps'e .update() çağrısı yok (doğrulandı). Giriş/geri alma
-- SECURITY DEFINER fonksiyonlardan geçiyor, bu yetkiden etkilenmiyor.
-- DELETE korunuyor: "Kendi RSVP'sini sil" politikası ona dayanıyor.
REVOKE INSERT, UPDATE ON public.rsvps FROM authenticated;
GRANT  INSERT (event_id, user_id) ON public.rsvps TO authenticated;
