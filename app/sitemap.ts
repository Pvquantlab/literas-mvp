import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase-server'

const BASE_URL = 'https://www.literaslab.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()

  // Statik sayfalar
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/kesfet`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/hakkinda`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/iletisim`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE_URL}/gizlilik`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/kosullar`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/sss`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE_URL}/login`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/signup`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.5 },
  ]

  // Onaylanmış topluluklar
  const { data: communities } = await supabase
    .from('communities')
    .select('id, created_at')
    .eq('status', 'approved')

  const communityPages: MetadataRoute.Sitemap = (communities ?? []).map((c: any) => ({
    url: `${BASE_URL}/community/${c.id}`,
    lastModified: new Date(c.created_at),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  // Gelecekteki etkinlikler
  const { data: events } = await supabase
    .from('events')
    .select('id, event_date, created_at')
    .gte('event_date', new Date().toISOString())

  const eventPages: MetadataRoute.Sitemap = (events ?? []).map((e: any) => ({
    url: `${BASE_URL}/event/${e.id}`,
    lastModified: new Date(e.created_at),
    changeFrequency: 'daily',
    priority: 0.9,
  }))

  return [...staticPages, ...communityPages, ...eventPages]
}
