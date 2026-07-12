'use server'

import { createClient } from '@/lib/supabase-server'

export type LocationSuggestion = {
  id: number
  name: string
  type: 'il' | 'ilce'
  display_name: string
  latitude: number | null
  longitude: number | null
}

/**
 * Konum arama: kullanıcı yazdıkça öneriler döner.
 * Türkçe karakter normalize edilmiş search_text üzerinden arar.
 */
export async function searchLocations(query: string): Promise<LocationSuggestion[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  const supabase = await createClient()

  // Türkçe karakter normalize
  const normalized = trimmed
    .toLowerCase()
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i')
    .replace(/i̇/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's')
    .replace(/ü/g, 'u').replace(/İ/g, 'i').replace(/I/g, 'i')

  const { data, error } = await supabase
    .from('locations')
    .select('id, name, type, display_name, latitude, longitude, search_text')
    .ilike('search_text', `%${normalized}%`)
    .order('type', { ascending: true }) // 'il' önce
    .order('name', { ascending: true })
    .limit(15)

  if (error) {
    console.error('searchLocations error:', error)
    return []
  }

  return (data ?? []) as LocationSuggestion[]
}

/**
 * Verilen koordinatlara en yakın konumu bul.
 * Basit Haversine hesabı — Postgres'te değil, kodda yapıyoruz (256 kayıt için sorun değil).
 */
export async function findNearestLocation(
  lat: number,
  lng: number
): Promise<LocationSuggestion | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('locations')
    .select('id, name, type, display_name, latitude, longitude, search_text')

  if (error || !data) {
    console.error('findNearestLocation error:', error)
    return null
  }

  // Haversine formula (km cinsinden mesafe)
  function distance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLng = ((lng2 - lng1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  let closest: LocationSuggestion | null = null
  let minDist = Infinity

  for (const loc of data) {
    if (loc.latitude == null || loc.longitude == null) continue
    const d = distance(lat, lng, loc.latitude, loc.longitude)
    // İlçe bulunursa ile tercih et (daha spesifik)
    if (d < minDist || (d === minDist && loc.type === 'ilce')) {
      minDist = d
      closest = loc as LocationSuggestion
    }
  }

  return closest
}
