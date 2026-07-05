import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const isOwnProfile = user?.id === id

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, email, bio, avatar_url, created_at')
    .eq('id', id)
    .single()

  if (!profile) {
    notFound()
  }

  const { data: memberships } = await supabase
    .from('community_members')
    .select('role, community:communities(id, name, city, category, cover_image_url)')
    .eq('user_id', id)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })

  const { data: organizedEvents } = await supabase
    .from('events')
    .select('id, title, event_date, location, cover_image_url')
    .eq('organizer_id', id)
    .order('event_date', { ascending: false })

  const { data: rsvps } = await supabase
    .from('rsvps')
    .select('event:events(id, title, event_date, location, cover_image_url)')
    .eq('user_id', id)
    .order('created_at', { ascending: false })

  // Üyelik süresi hesabı
  const joinedDate = new Date(profile.created_at)
  const now = new Date()
  const diffMs = now.getTime() - joinedDate.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  let membershipText = ''
  if (diffDays < 1) {
    membershipText = 'bugün katıldı'
  } else if (diffDays < 30) {
    membershipText = `${diffDays} gündür Literas'ta`
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30)
    membershipText = `${months} aydır Literas'ta`
  } else {
    const years = Math.floor(diffDays / 365)
    membershipText = `${years} yıldır Literas'ta`
  }

  const roleLabel = (role: string) => {
    if (role === 'founder') return 'kurucu'
    if (role === 'admin') return 'yönetici'
    return 'üye'
  }

  return (
    <main style={{
      maxWidth: '900px',
      margin: '0 auto',
      padding: '48px 24px',
    }}>
      {/* Başlık */}
      <section style={{
        marginBottom: '48px',
        paddingBottom: '32px',
        borderBottom: '1px solid var(--border-soft)',
      }}>
        <div style={{
          display: 'flex',
          gap: '24px',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
        }}>
          {profile.avatar_url ? (
            <div style={{
              width: '112px',
              height: '112px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '2px solid var(--border-soft)',
              flexShrink: 0,
            }}>
              <img
                src={profile.avatar_url}
                alt=""
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </div>
          ) : (
            <div style={{
              width: '112px',
              height: '112px',
              borderRadius: '50%',
              background: 'var(--paper-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '42px',
              fontWeight: 800,
              color: 'var(--muted)',
              flexShrink: 0,
            }}>
              {profile.name?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}

          <div style={{ flex: 1, minWidth: '240px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '14px',
              flexWrap: 'wrap',
              marginBottom: '6px',
            }}>
              <h1 style={{
                fontSize: '38px',
                fontWeight: 800,
                letterSpacing: '-1px',
                color: 'var(--night)',
                margin: 0,
              }}>
                {profile.name}
              </h1>
              {isOwnProfile && (
                <Link
                  href={`/profile/${profile.id}/edit`}
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--muted)',
                    textDecoration: 'underline',
                  }}
                >
                  düzenle
                </Link>
              )}
            </div>
            <p style={{
              color: 'var(--muted)',
              fontSize: '14.5px',
              fontWeight: 600,
              margin: 0,
            }}>
              {membershipText}
            </p>
            {profile.bio && (
              <p style={{
                marginTop: '16px',
                color: 'var(--night)',
                fontSize: '16px',
                lineHeight: 1.55,
              }}>
                {profile.bio}
              </p>
            )}
            {isOwnProfile && !profile.bio && (
              <p style={{
                marginTop: '16px',
                color: 'var(--muted)',
                fontSize: '15px',
                lineHeight: 1.55,
              }}>
                <Link
                  href={`/profile/${profile.id}/edit`}
                  style={{ color: 'var(--ink)', textDecoration: 'underline', fontWeight: 600 }}
                >
                  Kendinden bahset
                </Link> — birkaç cümle profile bir yüz katar.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Topluluklar */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={sectionTitleStyle}>Toplulukları</h2>
        {memberships && memberships.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px',
          }}>
            {memberships.map((m: any) => (
              <Link
                key={m.community.id}
                href={`/community/${m.community.id}`}
                className="card"
              >
                {m.community.cover_image_url ? (
                  <div style={{
                    width: '100%',
                    aspectRatio: '16 / 9',
                    overflow: 'hidden',
                    background: 'var(--paper-soft)',
                  }}>
                    <img
                      src={m.community.cover_image_url}
                      alt=""
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  </div>
                ) : (
                  <div style={{
                    width: '100%',
                    aspectRatio: '16 / 9',
                    background: 'var(--paper-soft)',
                  }} />
                )}
                <div style={{ padding: '16px 18px 18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {m.community.category && (
                    <span className="cat-badge" style={{ alignSelf: 'flex-start' }}>
                      {m.community.category}
                    </span>
                  )}
                  <h3 style={{
                    fontSize: '17px',
                    fontWeight: 800,
                    color: 'var(--night)',
                    margin: '2px 0 0',
                    lineHeight: 1.25,
                  }}>
                    {m.community.name}
                  </h3>
                  <p style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--muted)',
                    margin: 0,
                  }}>
                    {m.community.city} · {roleLabel(m.role)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : isOwnProfile ? (
          <div style={emptyBoxStyle}>
            <p style={{ color: 'var(--night)', fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>
              Düşündüklerini hayata geçirebileceğin ve büyüyebileceğin bir yerdesin.
            </p>
            <p style={{ color: 'var(--muted)', marginBottom: '20px' }}>
              Sana uyan topluluğu bul, ya da kendin başlat.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/" className="btn-primary">Toplulukları keşfet</Link>
              <Link href="/community/new" className="btn-secondary">Topluluk kur</Link>
            </div>
          </div>
        ) : (
          <p style={emptyLineStyle}>Henüz bir topluluğa katılmadı.</p>
        )}
      </section>

      {/* Düzenlediği etkinlikler */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={sectionTitleStyle}>Düzenlediği etkinlikler</h2>
        {organizedEvents && organizedEvents.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {organizedEvents.map((e: any) => (
              <li key={e.id}>
                <Link href={`/event/${e.id}`} style={eventRowStyle}>
                  <span style={{ fontWeight: 700, color: 'var(--night)' }}>{e.title}</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--muted)' }}>
                    {new Date(e.event_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    {e.location && ` · ${e.location}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : isOwnProfile ? (
          <p style={emptyLineStyle}>
            Henüz bir buluşma düzenlemedin. Kurduğun ya da yönettiğin bir topluluk varsa, oradan başlayabilirsin.
          </p>
        ) : (
          <p style={emptyLineStyle}>Henüz bir etkinlik düzenlemedi.</p>
        )}
      </section>

      {/* Katıldığı etkinlikler */}
      <section>
        <h2 style={sectionTitleStyle}>Katıldığı etkinlikler</h2>
        {rsvps && rsvps.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {rsvps.map((r: any) => (
              <li key={r.event.id}>
                <Link href={`/event/${r.event.id}`} style={eventRowStyle}>
                  <span style={{ fontWeight: 700, color: 'var(--night)' }}>{r.event.title}</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--muted)' }}>
                    {new Date(r.event.event_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    {r.event.location && ` · ${r.event.location}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : isOwnProfile ? (
          <p style={emptyLineStyle}>
            Henüz bir buluşmaya katılmadın. <Link href="/" style={{ color: 'var(--ink)', textDecoration: 'underline', fontWeight: 600 }}>Yaklaşan buluşmalara göz at.</Link>
          </p>
        ) : (
          <p style={emptyLineStyle}>Henüz bir etkinliğe katılmadı.</p>
        )}
      </section>
    </main>
  )
}

const sectionTitleStyle = {
  fontSize: '22px',
  fontWeight: 800,
  letterSpacing: '-0.5px',
  color: 'var(--night)',
  marginBottom: '20px',
}

const emptyBoxStyle = {
  background: '#ffffff',
  padding: '32px 24px',
  borderRadius: '16px',
  border: '1px solid var(--border-soft)',
  textAlign: 'center' as const,
}

const emptyLineStyle = {
  color: 'var(--muted)',
  fontSize: '15px',
  fontWeight: 500,
  lineHeight: 1.55,
}

const eventRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  gap: '12px',
  flexWrap: 'wrap' as const,
  padding: '16px 20px',
  background: '#ffffff',
  border: '1px solid var(--border-soft)',
  borderRadius: '12px',
  textDecoration: 'none',
  transition: 'border-color 0.15s ease',
}