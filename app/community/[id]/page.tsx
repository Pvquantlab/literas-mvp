import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import MemberActions from './member-actions'
import JoinButton from './join-button'

export const dynamic = 'force-dynamic'

export default async function CommunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: community } = await supabase
    .from('communities')
    .select(`
      id,
      name,
      description,
      city,
      cover_image_url,
      created_at,
      founder:profiles!founder_id(name)
    `)
    .eq('id', id)
    .single()

  if (!community) {
    notFound()
  }

  const { data: { user } } = await supabase.auth.getUser()

  const { data: allMemberships } = await supabase
    .from('community_members')
    .select('id, role, status, user_id, user:profiles!user_id(name, avatar_url)')
    .eq('community_id', id)

  const approvedMembers = (allMemberships ?? []).filter((m: any) => m.status === 'approved')
  const pendingMembers = (allMemberships ?? []).filter((m: any) => m.status === 'pending')

  const memberCount = approvedMembers.length
  const founderName = (community.founder as any)?.name ?? 'biri'

  const currentUserMembership = (allMemberships ?? []).find((m: any) => m.user_id === user?.id)
  const isFounder = currentUserMembership?.role === 'founder' && currentUserMembership?.status === 'approved'
  const isAdmin = currentUserMembership?.role === 'admin' && currentUserMembership?.status === 'approved'
  const isPending = currentUserMembership?.status === 'pending'
  const canModerate = isFounder || isAdmin

  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px 64px' }}>
      <Link
        href="/"
        style={{
          color: 'var(--muted)',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '13px',
          fontWeight: 500,
          marginBottom: '20px',
          display: 'inline-block',
          textDecoration: 'none',
        }}
      >
        ← tüm topluluklar
      </Link>

      {/* Kapak resmi */}
      {community.cover_image_url && (
        <div style={{
          width: '100%',
          aspectRatio: '16 / 9',
          overflow: 'hidden',
          borderRadius: '18px',
          border: '1.5px solid var(--border)',
          background: 'var(--paper-cream)',
          marginBottom: '28px',
        }}>
          <img
            src={community.cover_image_url}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
      )}

      {/* Başlık — Playfair + sarı highlight */}
      <h1 className="serif" style={{
        fontSize: 'clamp(32px, 4.4vw, 46px)',
        lineHeight: 1.1,
        color: 'var(--ink)',
        margin: '0 0 12px',
      }}>
        <span className="highlight-yellow">{community.name}</span>
      </h1>

      <p style={{
        fontFamily: "'IBM Plex Mono', monospace",
        color: 'var(--muted)',
        fontSize: '13.5px',
        marginBottom: '20px',
      }}>
        📍 {community.city} · 👥 {memberCount} üye · {founderName} kurdu
      </p>

      {community.description && (
        <p style={{
          color: 'var(--ink)',
          fontSize: '16.5px',
          lineHeight: 1.65,
          marginBottom: '28px',
        }}>
          {community.description}
        </p>
      )}

      {/* Katıl butonu */}
      {user && !currentUserMembership && (
        <div style={{ marginBottom: '32px' }}>
          <JoinButton communityId={community.id} userId={user.id} />
        </div>
      )}

      {/* Bekleyen istek göstergesi — coral */}
      {isPending && (
        <div style={{
          background: 'rgba(255, 216, 77, .2)',
          border: '1.5px solid rgba(176, 67, 48, .35)',
          borderRadius: '999px',
          padding: '10px 18px',
          color: 'var(--coral-deep)',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '13px',
          marginBottom: '32px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--coral)' }} />
          isteğin bekliyor · kurucu onaylayınca haberin olur
        </div>
      )}

      {/* Bekleyen istekler (moderatör) */}
      {canModerate && pendingMembers.length > 0 && (
        <section style={{ marginTop: '32px', marginBottom: '32px' }}>
          <h2 style={sectionTitleStyle} className="serif">Bekleyen istekler</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pendingMembers.map((m: any) => (
              <div key={m.id} style={memberRowStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                  {m.user?.avatar_url ? (
                    <img src={m.user.avatar_url} alt="" style={avatarStyle} />
                  ) : (
                    <div style={avatarPlaceholderStyle}>
                      {m.user?.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                  )}
                  <Link
                    href={`/profile/${m.user_id}`}
                    style={{ color: 'var(--ink)', fontWeight: 700, textDecoration: 'none' }}
                  >
                    {m.user?.name}
                  </Link>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <MemberActions memberId={m.id} action="approve" />
                  <MemberActions memberId={m.id} action="reject" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Üyeler */}
      <section style={{ marginTop: '40px' }}>
        <h2 style={sectionTitleStyle} className="serif">Üyeler</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {approvedMembers.map((m: any) => (
            <div key={m.id} style={memberRowStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                {m.user?.avatar_url ? (
                  <img src={m.user.avatar_url} alt="" style={avatarStyle} />
                ) : (
                  <div style={avatarPlaceholderStyle}>
                    {m.user?.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                )}
                <Link
                  href={`/profile/${m.user_id}`}
                  style={{ color: 'var(--ink)', fontWeight: 700, textDecoration: 'none' }}
                >
                  {m.user?.name}
                </Link>
                {m.role === 'founder' && <span style={roleBadgeStyle}>kurucu</span>}
                {m.role === 'admin' && <span style={roleBadgeStyle}>yönetici</span>}
              </div>
              {isFounder && m.role !== 'founder' && (
                <MemberActions
                  memberId={m.id}
                  action="toggle-admin"
                  currentRole={m.role as 'member' | 'admin'}
                />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Yaklaşan etkinlikler */}
      <section style={{ marginTop: '40px' }}>
        <h2 style={sectionTitleStyle} className="serif">Yaklaşan etkinlikler</h2>
        <EventsList communityId={id} />
      </section>
    </main>
  )
}

async function EventsList({ communityId }: { communityId: string }) {
  const supabase = await createClient()
  const { data: events } = await supabase
    .from('events')
    .select('id, title, location, event_date, cover_image_url')
    .eq('community_id', communityId)
    .order('event_date', { ascending: true })

  if (!events || events.length === 0) {
    return (
      <div style={{
        fontFamily: "'IBM Plex Mono', monospace",
        color: 'var(--muted)',
        fontSize: '13.5px',
        padding: '14px 0',
      }}>
        henüz planlanmış bir buluşma yok
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {events.map((event: any) => {
        const date = new Date(event.event_date)
        const dateStr = date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
        const timeStr = date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
        return (
          <Link
            key={event.id}
            href={`/event/${event.id}`}
            style={{
              display: 'flex',
              gap: '16px',
              background: 'var(--paper-cream)',
              padding: '14px 18px',
              borderRadius: '16px',
              border: '1.5px solid var(--border)',
              alignItems: 'center',
              textDecoration: 'none',
              transition: 'all 0.18s ease',
            }}
          >
            {event.cover_image_url ? (
              <div style={{
                flexShrink: 0,
                width: '72px',
                height: '72px',
                borderRadius: '12px',
                overflow: 'hidden',
                background: 'var(--paper-soft)',
              }}>
                <img
                  src={event.cover_image_url}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
            ) : (
              <div style={{
                flexShrink: 0,
                width: '72px',
                height: '72px',
                borderRadius: '12px',
                background: 'var(--paper-soft)',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--muted)',
                fontSize: '22px',
              }}>
                📅
              </div>
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <h3 style={{
                fontSize: '17px',
                fontWeight: 800,
                color: 'var(--ink)',
                marginBottom: '4px',
                letterSpacing: '-0.01em',
              }}>
                {event.title}
              </h3>
              <p style={{
                fontFamily: "'IBM Plex Mono', monospace",
                color: 'var(--muted)',
                fontSize: '12.5px',
              }}>
                {dateStr} · {timeStr} · 📍 {event.location}
              </p>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 'clamp(22px, 2.8vw, 28px)',
  color: 'var(--ink)',
  marginBottom: '18px',
}

const memberRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '12px',
  padding: '12px 16px',
  background: 'var(--paper-cream)',
  border: '1.5px solid var(--border)',
  borderRadius: '14px',
  flexWrap: 'wrap',
}

const avatarStyle: React.CSSProperties = {
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  objectFit: 'cover',
  border: '1.5px solid var(--border)',
  flexShrink: 0,
}

const avatarPlaceholderStyle: React.CSSProperties = {
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  background: 'var(--paper-soft)',
  color: 'var(--ink)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '14px',
  fontWeight: 800,
  flexShrink: 0,
}

const roleBadgeStyle: React.CSSProperties = {
  background: 'var(--lime-soft)',
  border: '1.5px solid var(--ink)',
  color: 'var(--ink)',
  fontSize: '11px',
  fontWeight: 700,
  padding: '2px 9px',
  borderRadius: '999px',
  letterSpacing: '0.02em',
}