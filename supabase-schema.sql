-- Literas MVP — Veritabanı şeması
-- Bu SQL'i Supabase'in SQL Editor bölümünde çalıştır

-- Etkinlikler tablosu
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 20,
  organizer_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RSVP'ler tablosu
CREATE TABLE rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, email)
);

-- Etkinlik tarihi için indeks (sıralama hızlı olsun diye)
CREATE INDEX events_date_idx ON events(date);

-- RSVP'leri etkinliğe göre hızlı bulmak için indeks
CREATE INDEX rsvps_event_id_idx ON rsvps(event_id);

-- ÖNEMLİ: Row Level Security (RLS) ayarları
-- Bu MVP için herkesin okuyup yazabilmesini sağlıyoruz
-- Gerçek üretimde, kullanıcı kimlik doğrulamasıyla bunu kısıtlayacaksın

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;

-- Herkes etkinlikleri görebilir
CREATE POLICY "Etkinlikler herkese açık"
  ON events FOR SELECT
  USING (true);

-- Herkes etkinlik oluşturabilir (şimdilik — auth eklendiğinde değişir)
CREATE POLICY "Herkes etkinlik oluşturabilir"
  ON events FOR INSERT
  WITH CHECK (true);

-- Herkes RSVP'leri görebilir
CREATE POLICY "RSVP'ler herkese açık"
  ON rsvps FOR SELECT
  USING (true);

-- Herkes RSVP yapabilir
CREATE POLICY "Herkes RSVP yapabilir"
  ON rsvps FOR INSERT
  WITH CHECK (true);
