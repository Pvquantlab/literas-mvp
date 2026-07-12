import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import ReviewButtons from './review-buttons'

export const dynamic = 'force-dynamic'

export default async function AdminTopluluklarPage() {
  const supabase = await createClient()

  const { data: pending } = await supabase
    .from('communities')
    .select(`
      id, name, description, location_name, location_type, created_at, cover_image_url,
      founder:profiles!founder_id(name, email),
      community_topics(topic:topics(name))
    `)
    .eq('status', 'pending_review')
    .order('created_at', { ascending: true })

  const { data: recent } = await supabase
    .from('communities')
    .select('id, name, status, reviewed_at, location_name')
    .in('status', ['approved', 'rejected'])
    .order('reviewed_at', { ascending: false })
    .limit(10)

  return (
    <main style={{ maxWidth: '1080px', margin: '0 auto', padding: '32px 24px 80px' }}>
      <h1 className="serif" style={{
        fontSize: 'clamp(24px, 3vw, 32px)',
        color: 'var(--ink)',
        margin: '0 0 8px',
        fontWeight: 500,
      }}>
        Topluluk moderasyonu
      </h1>
      <p style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '12.5px',
        color: 'var(--muted)',
        marginBottom: '32px',
      }}>
        inceleme bekleyen: {pending?.length ?? 0}
      </p>

      {(!pending || pending.length === 0) && (
        <div style={{
          padding: '32px',
          textAlign: 'center',
          borderRadius: '14px',
          background: 'var(--paper-soft, rgba(30, 58, 43, 0.04))',
          color: 'var(--muted)',
          marginBottom: '40px',
        }}>
          İnceleme bekleyen topluluk yok. 🌱
        </div>
      )}

      {pending && pending.map((c: any) => (
        <article
          key={c.id}
          style={{
            padding: '24px',
            borderRadius: '14px',
            border: '1.5px solid rgba(30, 58, 43, 0.15)',
            marginBottom: '16px',
            background: 'var(--paper-cream, #FFFDF6)',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: c.cover_image_url ? '160px 1fr' : '1fr', gap: '20px' }}>
            {c.cover_image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.cover_image_url}
                alt=""
                style={{
                  width: '100%',
                  height: '100px',
                  objectFit: 'cover',
                  borderRadius: '10px',
                }}
              />
            )}
            <div>
              <h2 className="serif" style={{ fontSize: '20px', margin: '0 0 6px', color: 'var(--ink)' }}>
                {c.name}
              </h2>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '11.5px',
                color: 'var(--muted)',
                marginBottom: '12px',
              }}>
                📍 {c.location_name ?? '—'} ({c.location_type}) · kurucu: {(c.founder as any)?.name ?? '—'} ({(c.founder as any)?.email ?? '—'})
                {' · '}
                {new Date(c.created_at).toLocaleString('tr-TR')}
              </div>

              {c.community_topics?.length > 0 && (
                <div style={{ marginBottom: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {c.community_topics.slice(0, 12).map((ct: any, i: number) => (
                    <span
                      key={i}
                      style={{
                        padding: '3px 10px',
                        borderRadius: '999px',
                        background: 'rgba(30, 58, 43, 0.06)',
                        fontSize: '11.5px',
                        color: 'var(--ink)',
                      }}
                    >
                      {ct.topic?.name}
                    </span>
                  ))}
                </div>
              )}

              <p style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.55, margin: '0 0 16px' }}>
                {c.description}
              </p>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <Link
                  href={`/community/${c.id}`}
                  target="_blank"
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '12.5px',
                    color: 'var(--muted)',
                    textDecoration: 'underline',
                  }}
                >
                  taslak sayfayı gör →
                </Link>
                <ReviewButtons communityId={c.id} communityName={c.name} />
              </div>
            </div>
          </div>
        </article>
      ))}

      {/* Son işlemler */}
      {recent && recent.length > 0 && (
        <div style={{ marginTop: '48px' }}>
          <h3 className="serif" style={{ fontSize: '18px', color: 'var(--ink)', margin: '0 0 12px' }}>
            Son işlemler
          </h3>
          <div style={{
            borderRadius: '12px',
            border: '1.5px solid rgba(30, 58, 43, 0.1)',
            overflow: 'hidden',
          }}>
            {recent.map((c: any) => (
              <div
                key={c.id}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(30, 58, 43, 0.08)',
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto',
                  gap: '16px',
                  alignItems: 'center',
                  fontSize: '13.5px',
                }}
              >
                <Link href={`/community/${c.id}`} target="_blank" style={{ color: 'var(--ink)' }}>
                  {c.name}
                </Link>
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '11px',
                  padding: '2px 10px',
                  borderRadius: '999px',
                  background: c.status === 'approved' ? 'rgba(214, 255, 63, 0.3)' : 'rgba(176, 67, 48, 0.15)',
                  color: c.status === 'approved' ? 'var(--ink)' : 'var(--coral-deep, #b04330)',
                }}>
                  {c.status}
                </span>
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '11px',
                  color: 'var(--muted)',
                }}>
                  {c.reviewed_at ? new Date(c.reviewed_at).toLocaleString('tr-TR') : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
