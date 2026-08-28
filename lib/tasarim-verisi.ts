import { createClient } from '@/lib/supabase-server'

/**
 * Tasarım varyantları için paylaşılan veri.
 *
 * NEDEN AYRI: app/page.tsx'in veri katmanı kişiselleştirmeyle (üyelikler,
 * RSVP'ler, profil) iç içe. Varyantlar tasarım denemesi olduğu için o
 * karmaşıklığa ihtiyaçları yok; üçü de aynı sade veriyi paylaşıp yalnızca
 * KOMPOZİSYONDA farklılaşsın istiyoruz. Kazanan varyant seçilince
 * app/page.tsx onun yerine geçecek ve bu dosya silinecek.
 *
 * DİKKAT — tarih filtresi YOK: veritabanındaki 8 etkinliğin hepsi geçmişte.
 * `.gte('event_date', now)` konsaydı üç varyantta da etkinlik bölümü boş
 * çıkardı ve tasarımın kalbi görünmezdi. Mockup'ta gerçek içerik görmek
 * tarih doğruluğundan önemli. Gerçek ana sayfada filtre elbette duruyor.
 */

export type TasarimEtkinlik = {
  id: string
  title: string
  event_date: string
  location: string | null
  cover_image_url: string | null
  community: { name: string; category: string | null; city: string | null } | null
}

export type TasarimTopluluk = {
  id: string
  name: string
  city: string | null
  category: string | null
  cover_image_url: string | null
  member_count: number | null
}

export type TasarimVerisi = {
  etkinlikler: TasarimEtkinlik[]
  topluluklar: TasarimTopluluk[]
  sayilar: { etkinlik: number; topluluk: number; sehir: number }
}

export async function tasarimVerisi(): Promise<TasarimVerisi> {
  const supabase = await createClient()

  const [etkinlikRes, toplulukRes, sehirRes] = await Promise.all([
    supabase
      .from('events')
      .select(
        'id, title, event_date, location, cover_image_url, community:communities!inner(name, category, city)'
      )
      .order('event_date', { ascending: false })
      .limit(8),
    supabase
      .from('communities')
      .select('id, name, city, category, cover_image_url, member_count')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(12),
    supabase.from('communities').select('city').eq('status', 'approved').not('city', 'is', null),
  ])

  if (etkinlikRes.error) console.error('[tasarim] etkinlik sorgusu:', etkinlikRes.error)
  if (toplulukRes.error) console.error('[tasarim] topluluk sorgusu:', toplulukRes.error)

  const etkinlikler = (etkinlikRes.data ?? []) as unknown as TasarimEtkinlik[]
  const topluluklar = (toplulukRes.data ?? []) as TasarimTopluluk[]
  const sehirler = new Set(
    (sehirRes.data ?? []).map((s: { city: string | null }) => s.city).filter(Boolean)
  )

  return {
    etkinlikler,
    topluluklar,
    sayilar: {
      etkinlik: etkinlikler.length,
      topluluk: topluluklar.length,
      sehir: sehirler.size,
    },
  }
}
