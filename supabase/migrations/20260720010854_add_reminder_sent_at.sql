-- events tablosuna hatırlatma takip kolonu
-- Cron her saat çalışıp 24 saat içindeki + henüz hatırlatılmamış etkinliklere e-posta yollar.
ALTER TABLE events ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;

-- "Yaklaşan + hatırlatılmamış" sorgusunu hızlandıran kısmi index
CREATE INDEX IF NOT EXISTS idx_events_reminder
  ON events (event_date)
  WHERE reminder_sent_at IS NULL;