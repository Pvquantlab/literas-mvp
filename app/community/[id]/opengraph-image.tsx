import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

export const runtime = 'nodejs'
export const alt = 'literas topluluk'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const plexSansBold = readFileSync(
  join(process.cwd(), 'assets/fonts/IBMPlexSans-Bold.ttf')
)
const plexMono = readFileSync(
  join(process.cwd(), 'assets/fonts/IBMPlexMono-Regular.ttf')
)

const CAT_COLORS: Record<string, { bg: string; ink: string }> = {
  kitap: { bg: '#F5E9D0', ink: '#3E6B21' },
  doğa: { bg: '#DDE9D5', ink: '#A35A1E' },
  müzik: { bg: '#E7DBEB', ink: '#5B3EA6' },
  lezzet: { bg: '#F3D8CE', ink: '#8A6A00' },
  dil: { bg: '#DCE4EE', ink: '#2A5B8F' },
  spor: { bg: '#E5E0D2', ink: '#1F6E52' },
  sanat: { bg: '#EFD9DC', ink: '#A83A6E' },
  oyun: { bg: '#DFE8DE', ink: '#B04330' },
  tech: { bg: '#DAE0E6', ink: '#33566B' },
  sinema: { bg: '#E4DED4', ink: '#544A86' },
  fotoğraf: { bg: '#E0DEDC', ink: '#23697A' },
  gönüllülük: { bg: '#E1EBDA', ink: '#A34A22' },
  kariyer: { bg: '#E5DED0', ink: '#46603A' },
  sosyal: { bg: '#EBDFD3', ink: '#A8354F' },
}
const FALLBACK = { bg: '#E8E4D8', ink: '#1a1a1a' }

export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: community } = await supabase
    .from('communities')
    .select('name, description, city, category, status')
    .eq('id', id)
    .maybeSingle()

  const c = CAT_COLORS[(community?.category ?? '').toLowerCase()] ?? FALLBACK
  const name = community?.name ?? 'literas — topluluk'
  const desc = community?.description
    ? (community.description.length > 120 ? community.description.slice(0, 120) + '…' : community.description)
    : null
  const city = community?.city ?? null

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
          color: '#1a1a1a',
          padding: 64,
          fontFamily: 'IBM Plex Sans',
        }}
      >
        <div style={{ display: 'flex', fontSize: 26, fontFamily: 'IBM Plex Mono', letterSpacing: 2, textTransform: 'uppercase', color: c.ink }}>
          topluluk{city ? ` · ${city}` : ''}
        </div>

        <div style={{ display: 'flex', fontSize: 64, fontWeight: 700, lineHeight: 1.15, maxHeight: 160, overflow: 'hidden' }}>
          {name}
        </div>

        <div style={{ display: 'flex', fontSize: 30, fontFamily: 'IBM Plex Mono', color: c.ink, lineHeight: 1.4, maxHeight: 130, overflow: 'hidden' }}>
          {desc ?? ''}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', fontFamily: 'IBM Plex Mono', fontSize: 26 }}>
          <div style={{ display: 'flex', fontWeight: 700, color: '#1a1a1a' }}>literas</div>
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
