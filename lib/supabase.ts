import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Veritabanı tipleri — Supabase'deki tabloların TypeScript karşılığı
export type Event = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string;
  location: string;
  date: string; // ISO tarih formatında
  capacity: number;
  organizer_name: string;
  created_at: string;
};

export type RSVP = {
  id: string;
  event_id: string;
  name: string;
  email: string;
  created_at: string;
};
