import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

export const runtime = 'nodejs'
export const alt = 'literaslab etkinlik'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const plexSansBold = readFileSync(
  join(process.cwd(), 'assets/fonts/IBMPlexSans-Bold.ttf')
)
const plexMono = readFileSync(
  join(process.cwd(), 'assets/fonts/IBMPlexMono-Regular.ttf')
)

/**
 * OG görselinin paleti sitenin paletiyle AYNI olmalı: WhatsApp'ta paylaşılan
 * kart, sitenin ilk izlenimi.
 *
 * Buradaki 28 renklik CAT_COLORS tablosu kesfet/page.tsx'teki CATS dizisinin
 * kopyasıydı. O dizi ölçülmüş DNA gereği silindi (tek vurgu rengi); kopyası
 * burada yaşamaya devam ediyordu. Artık tek ses: sıcak greige zemin,
 * mürekkep metin.
 */
const ZEMIN = '#DCDBD5'
const MUREKKEP = '#0755BB'

function trUpper(s: string) {
  return s.replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase()
}

function formatTr(d: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Istanbul',
  }).format(new Date(d))
}

export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: event } = await supabase
    .from('events')
    .select('title, event_date, location, community:communities!community_id(name, category)')
    .eq('id', id)
    .maybeSingle()

  const community = (event?.community as any) ?? {}
  const c = { bg: ZEMIN, ink: MUREKKEP }
  const title = event?.title ?? 'literaslab · etkinlik'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: c.bg,
          color: MUREKKEP,
          padding: 64,
          fontFamily: 'IBM Plex Sans',
        }}
      >
       <div style={{ display: 'flex', fontSize: 26, fontFamily: 'IBM Plex Mono', letterSpacing: 2, color: c.ink }}>
          ETKİNLİK
        </div>

        <div style={{ display: 'flex', fontSize: 64, fontWeight: 700, lineHeight: 1.15, maxHeight: 230, overflow: 'hidden' }}>
          {title}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontFamily: 'IBM Plex Mono', fontSize: 30, color: c.ink }}>
          {event?.event_date ? <div style={{ display: 'flex' }}>{formatTr(event.event_date)}</div> : null}
          {event?.location ? <div style={{ display: 'flex' }}>{event.location}</div> : null}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'IBM Plex Mono', fontSize: 26, color: '#555' }}>
          <div style={{ display: 'flex' }}>{community.name ?? ''}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg width="36" height="36" viewBox="0 0 32 32">
              <rect width="32" height="32" rx="9" fill="#0755BB" />
              <rect x="8.4" y="5.5" width="4" height="13.2" rx="2" fill="#FFFFFF" />
              <rect x="8.4" y="18.5" width="15.2" height="3.8" rx="1.9" fill="#FFFFFF" />
              <rect x="9.2" y="22.3" width="2.4" height="4" rx="1.2" fill="#FFFFFF" />
              <rect x="19.6" y="22.3" width="2.4" height="4" rx="1.2" fill="#FFFFFF" />
              <circle cx="18.4" cy="14.8" r="2.6" fill="#FFFFFF" />
            </svg>
            <div style={{ display: 'flex', fontWeight: 700, color: MUREKKEP }}>literaslab</div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'IBM Plex Sans', data: plexSansBold, weight: 700, style: 'normal' },
        { name: 'IBM Plex Mono', data: plexMono, weight: 400, style: 'normal' },
      ],
    }
  )
}
