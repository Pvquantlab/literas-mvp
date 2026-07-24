import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import EventCard from '@/components/event-card'

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const isOwnProfile = user?.id === id

  // Herkese açık profil vitrini (e-posta vb. özel alanlar bu görünümde yok)
  const { data: profile } = await supabase
    .from('public_profiles')
    .select('id, name, bio, avatar_url, created_at')
    .eq('id', id)
    .single()

  if (!profile) notFound()

  const { data: memberships } = await supabase
    .from('community_members')
    .select('role, community:communities(id, name, city, category, cover_image_url)')
    .eq('user_id', id)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })

  const { data: organizedEvents } = await supabase
    .from('events')
    .select('id, title, event_date, location, cover_image_url, community:communities(name, category)')
    .eq('organizer_id', id)
    .order('event_date', { ascending: false })

  const { data: rsvps } = await supabase
    .from('rsvps')
    .select('event:events(id, title, event_date, location, cover_image_url, community:communities(name, category))')
    .eq('user_id', id)
    .order('created_at', { ascending: false })

  const joinedDate = new Date(profile.created_at)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - joinedDate.getTime()) / (1000 * 60 * 60 * 24))
  let membershipText = ''
  if (diffDays < 1) membershipText = 'bugün katıldı'
  else if (diffDays < 30) membershipText = `${diffDays} gündür literaslab'da`
  else if (diffDays < 365) membershipText = `${Math.floor(diffDays / 30)} aydır literaslab'da`
  else membershipText = `${Math.floor(diffDays / 365)} yıldır literaslab'da`

  const roleLabel = (role: string) => role === 'founder' ? 'kurucu' : role === 'admin' ? 'yönetici' : 'üye'

  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '48px 24px' }}>
      {/* Başlık */}
      <section style={{
        marginBottom: '48px',
        paddingBottom: '32px',
        borderBottom: '1.5px solid var(--border)',
      }}>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {profile.avatar_url ? (
            <div style={{
              width: '112px',
              height: '112px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '2px solid var(--ink)',
              flexShrink: 0,
            }}>
              <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
          ) : (
            <div style={{
              width: '112px',
              height: '112px',
              borderRadius: '50%',
              background: 'var(--lime)',
              border: '2px solid var(--ink)',
              display: 'grid',
              placeItems: 'center',
              fontSize: '46px',
              fontWeight: 800,
              color: 'var(--ink)',
              fontFamily: "'Playfair Display', serif",
              flexShrink: 0,
            }}>
              {profile.name?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}

          <div style={{ flex: 1, minWidth: '240px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', flexWrap: 'wrap', marginBottom: '6px' }}>
              <h1 className="serif" style={{
                fontSize: 'clamp(32px, 4.4vw, 46px)',
                color: 'var(--ink)',
                margin: 0,
              }}>
                <span className="highlight-yellow">{profile.name}</span>
              </h1>
              {isOwnProfile && (
                <Link
                  href={`/profile/${profile.id}/edit`}
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '13px',
                    color: 'var(--muted)',
                    textDecoration: 'underline',
                    textUnderlineOffset: '3px',
                  }}
                >
                  düzenle
                </Link>
              )}
            </div>
            <p style={{
              fontFamily: "'IBM Plex Mono', monospace",
              color: 'var(--muted)',
              fontSize: '13px',
              margin: 0,
            }}>
              ✿ {membershipText}
            </p>
            {profile.bio && (
              <p style={{
                marginTop: '16px',
                color: 'var(--ink)',
                fontSize: '16.5px',
                lineHeight: 1.6,
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
        <h2 className="serif" style={sectionTitleStyle}>Toplulukları</h2>
        {memberships && memberships.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px',
          }}>
            {memberships.map((m: any) => (
              <Link key={m.community.id} href={`/community/${m.community.id}`} className="card">
                {m.community.cover_image_url ? (
                  <div style={{ width: '100%', aspectRatio: '16 / 9', overflow: 'hidden', background: 'var(--paper-soft)' }}>
                    <img src={m.community.cover_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </div>
                ) : (
                  <div style={{
                    width: '100%',
                    aspectRatio: '16 / 9',
                    background: 'var(--paper-soft)',
                    display: 'grid',
                    placeItems: 'center',
                    color: 'var(--muted)',
                    fontSize: '32px',
                  }}>
                    ✿
                  </div>
                )}
                <div style={{ padding: '14px 16px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {m.community.category && (
                    <span style={{
                      alignSelf: 'flex-start',
                      background: 'var(--lime-soft)',
                      border: '1.5px solid var(--ink)',
                      color: 'var(--ink)',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      padding: '2px 9px',
                      borderRadius: '999px',
                    }}>
                      {m.community.category}
                    </span>
                  )}
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: 800,
                    color: 'var(--ink)',
                    margin: '2px 0 0',
                    lineHeight: 1.25,
                  }}>
                    {m.community.name}
                  </h3>
                  <p style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '12.5px',
                    color: 'var(--muted)',
                    margin: 0,
                  }}>
                    📍 {m.community.city} · {roleLabel(m.role)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : isOwnProfile ? (
          <div className="empty-state">
            <div style={{ fontSize: '34px' }}>🌱</div>
            <div className="serif" style={{ fontSize: '22px', color: 'var(--ink)', marginTop: '10px' }}>
              Düşündüklerini hayata geçirebileceğin bir yerdesin.
            </div>
            <div style={{ fontSize: '15px', color: 'var(--muted)', marginTop: '6px' }}>
              Sana uyan topluluğu bul, ya da kendin başlat.
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '18px' }}>
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
        <h2 className="serif" style={sectionTitleStyle}>Düzenlediği etkinlikler</h2>
        {organizedEvents && organizedEvents.length > 0 ? (
          <div className="events-grid-org" style={{ display: 'grid', gap: '20px' }}>
            {organizedEvents.map((e: any) => (
              <EventCard key={e.id} event={e} showCommunityName={true} />
            ))}
            <style>{`
              .events-grid-org { grid-template-columns: 1fr; }
              @media (min-width: 640px) {
                .events-grid-org { grid-template-columns: repeat(2, 1fr); }
              }
            `}</style>
          </div>
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
        <h2 className="serif" style={sectionTitleStyle}>Katıldığı etkinlikler</h2>
        {rsvps && rsvps.length > 0 ? (
          <div className="events-grid-rsvp" style={{ display: 'grid', gap: '20px' }}>
            {rsvps.map((r: any) => (
              <EventCard key={r.event.id} event={r.event} showCommunityName={true} />
            ))}
            <style>{`
              .events-grid-rsvp { grid-template-columns: 1fr; }
              @media (min-width: 640px) {
                .events-grid-rsvp { grid-template-columns: repeat(2, 1fr); }
              }
            `}</style>
          </div>
        ) : isOwnProfile ? (
          <p style={emptyLineStyle}>
            Henüz bir buluşmaya katılmadın.{' '}
            <Link href="/" style={{ color: 'var(--ink)', textDecoration: 'underline', fontWeight: 600 }}>
              Yaklaşan buluşmalara göz at.
            </Link>
          </p>
        ) : (
          <p style={emptyLineStyle}>Henüz bir etkinliğe katılmadı.</p>
        )}
      </section>
    </main>
  )
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 'clamp(22px, 2.8vw, 28px)',
  color: 'var(--ink)',
  marginBottom: '20px',
}

const emptyLineStyle: React.CSSProperties = {
  color: 'var(--muted)',
  fontSize: '15px',
  lineHeight: 1.55,
}
