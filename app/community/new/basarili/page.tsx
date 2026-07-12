import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Topluluk gönderildi — literaslab',
}

export default async function BasariliPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  const params = await searchParams
  const id = params.id
  if (!id) redirect('/')

  const supabase = await createClient()
  const { data: community } = await supabase
    .from('communities')
    .select('id, name, status, location_name')
    .eq('id', id)
    .maybeSingle()

  if (!community) redirect('/')

  return (
    <main style={{
      maxWidth: '560px',
      margin: '0 auto',
      padding: '80px 24px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌱</div>
      <h1 className="serif" style={{
        fontSize: 'clamp(28px, 4vw, 40px)',
        color: 'var(--ink)',
        margin: '0 0 16px',
        fontWeight: 500,
      }}>
        Topluluğun <span className="highlight-yellow">yolda</span>.
      </h1>
      <p style={{
        fontSize: '15px',
        color: 'var(--muted)',
        lineHeight: 1.6,
        maxWidth: '440px',
        margin: '0 auto 24px',
      }}>
        <strong style={{ color: 'var(--ink)' }}>{community.name}</strong>{' '}
        incelemeye gönderildi. Onaylandığında {community.location_name ?? 'bölgendeki'} insanlara duyuracağız — genelde birkaç saat sürer.
      </p>

      <div style={{
        display: 'inline-block',
        padding: '8px 16px',
        borderRadius: '999px',
        background: 'rgba(214, 255, 63, 0.2)',
        border: '1.5px solid rgba(214, 255, 63, 0.5)',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '12.5px',
        color: 'var(--ink)',
        marginBottom: '40px',
      }}>
        durum: inceleme bekliyor
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '320px', margin: '0 auto' }}>
        <Link
          href={`/community/${community.id}`}
          className="btn-primary"
          style={{ textAlign: 'center', textDecoration: 'none' }}
        >
          Taslak sayfamı gör
        </Link>
        <Link
          href="/"
          style={{
            padding: '10px 16px',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '13px',
            color: 'var(--muted)',
            textDecoration: 'none',
          }}
        >
          ← ana sayfaya dön
        </Link>
      </div>
    </main>
  )
}
