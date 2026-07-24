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
    .select('id, name, bio, avatar_url, location, created_at')
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

  const stats = [
    { value: memberships?.length ?? 0, label: 'Topluluk' },
    { value: organizedEvents?.length ?? 0, label: 'Düzenlediği' },
    { value: rsvps?.length ?? 0, label: 'Katıldığı' },
  ]

  return (
    <main style={{ maxWidth: '1080px', margin: '0 auto', padding: '40px 24px 64px', display: 'flex', gap: '36px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
      {/* ===== SOL: PROFİL KARTI — içeriği kadar yükseklikte, kompakt ===== */}
      <aside className="profile-aside" style={{
        flex: '0 1 300px',
        minWidth: '260px',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--paper-cream)',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        boxShadow: '0 8px 28px rgba(30,58,43,0.08)',
        padding: '28px 24px 22px',
      }}>
        {/* Avatar — referanstaki gibi kartın yıldızı */}
        <div style={{ display: 'grid', placeItems: 'center', marginBottom: '20px' }}>
          {profile.avatar_url ? (
            <div style={{
              width: '184px',
              height: '184px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '1.5px solid var(--border)',
            }}>
              <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
          ) : (
            <div style={{
              width: '184px',
              height: '184px',
              borderRadius: '50%',
              background: 'var(--paper-soft)',
              border: '1.5px solid var(--border)',
              display: 'grid',
              placeItems: 'center',
              fontSize: '72px',
              fontWeight: 800,
              color: 'var(--ink)',
            }}>
              {profile.name?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}
        </div>

        {/* İsim + düzenle */}
        <h1 style={{
          fontSize: '23px',
          fontWeight: 800,
          color: 'var(--ink)',
          margin: '0 0 4px',
          letterSpacing: '-0.3px',
          lineHeight: 1.25,
        }}>
          {profile.name}
        </h1>
        {isOwnProfile && (
          <Link
            href={`/profile/${profile.id}/edit`}
            style={{
              display: 'inline-block',
              fontSize: '13.5px',
              fontWeight: 600,
              color: 'var(--coral)',
              marginBottom: '12px',
              textDecoration: 'none',
            }}
          >
            Profili düzenle
          </Link>
        )}

        {/* Konum + katılım */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginTop: isOwnProfile ? '2px' : '10px' }}>
          {profile.location && (
            <p style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', color: 'var(--muted)', margin: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {profile.location}
            </p>
          )}
          <p style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', color: 'var(--muted)', margin: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" x2="16" y1="2" y2="6" />
              <line x1="8" x2="8" y1="2" y2="6" />
              <line x1="3" x2="21" y1="10" y2="10" />
            </svg>
            {membershipText}
          </p>
        </div>

        {/* Ayraç + istatistikler — içeriğin hemen ardından gelir */}
        <div>
          <div style={{ height: '1px', background: 'var(--border)', margin: '22px 0 14px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {stats.map((s) => (
              <div key={s.label} style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink)', lineHeight: 1.2 }}>{s.value}</div>
                <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '2px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* ===== SAĞ: İÇERİK ===== */}
      <div style={{ flex: '1 1 480px', minWidth: 0 }}>
        {/* Hakkında */}
        {(profile.bio || isOwnProfile) && (
          <section style={{ marginBottom: '40px' }}>
            <h2 className="serif" style={sectionTitleStyle}>Hakkında</h2>
            {profile.bio ? (
              <p style={{
                color: 'var(--ink)',
                fontSize: '16px',
                lineHeight: 1.65,
                margin: 0,
              }}>
                {profile.bio}
              </p>
            ) : (
              <p style={emptyLineStyle}>
                <Link
                  href={`/profile/${profile.id}/edit`}
                  style={{ color: 'var(--ink)', textDecoration: 'underline', fontWeight: 600 }}
                >
                  Kendinden bahset
                </Link> — birkaç cümle profile bir yüz katar.
              </p>
            )}
          </section>
        )}

      {/* Topluluklar */}
      <section style={{ marginBottom: '48px' }}>
        <h2 className="serif" style={sectionTitleStyle}>Toplulukları</h2>
        {memberships && memberships.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
            gap: '14px',
          }}>
            {memberships.map((m: any) => (
              <Link
                key={m.community.id}
                href={`/community/${m.community.id}`}
                className="member-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '12px',
                  background: 'var(--paper-cream)',
                  border: '1.5px solid var(--border)',
                  borderRadius: '14px',
                  textDecoration: 'none',
                  transition: 'all 0.18s ease',
                }}
              >
                {/* Kare kapak görseli */}
                <div style={{
                  width: '96px',
                  height: '96px',
                  flex: 'none',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  background: 'var(--paper-soft)',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--muted)',
                  fontSize: '26px',
                }}>
                  {m.community.cover_image_url ? (
                    <img src={m.community.cover_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  ) : (
                    '✿'
                  )}
                </div>
                {/* İsim + bilgi */}
                <div style={{ minWidth: 0 }}>
                  <h3 style={{
                    fontSize: '15px',
                    fontWeight: 700,
                    color: 'var(--ink)',
                    margin: 0,
                    lineHeight: 1.3,
                  }}>
                    {m.community.name}
                  </h3>
                  <p style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '11.5px',
                    color: 'var(--muted)',
                    margin: '5px 0 0',
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
      </div>
      <style>{`
        .member-card:hover {
          border-color: var(--ink) !important;
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(30,58,43,.10);
        }
        @media (max-width: 860px) {
          .profile-aside { position: static !important; flex: 1 1 100% !important; }
        }
      `}</style>
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
