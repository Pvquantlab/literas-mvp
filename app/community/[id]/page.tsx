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
    <main style={{
      maxWidth: '900px',
      margin: '0 auto',
      padding: '32px 24px 64px',
    }}>
      <Link href="/" style={{
        color: 'var(--muted)',
        fontSize: '14px',
        fontWeight: 600,
        marginBottom: '20px',
        display: 'inline-block',
        textDecoration: 'none',
      }}>
        ← Tüm topluluklar
      </Link>

      {/* Kapak resmi */}
      {community.cover_image_url && (
        <div style={{
          width: '100%',
          aspectRatio: '16 / 9',
          overflow: 'hidden',
          borderRadius: '16px',
          border: '1px solid var(--border-soft)',
          background: 'var(--paper-soft)',
          marginBottom: '28px',
        }}>
          <img
            src={community.cover_image_url}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        </div>
      )}

      {/* Başlık */}
      <h1 style={{
        fontSize: '42px',
        fontWeight: 800,
        letterSpacing: '-1.2px',
        lineHeight: 1.1,
        color: 'var(--night)',
        margin: '0 0 10px',
      }}>
        {community.name}
      </h1>

      <p style={{
        color: 'var(--muted)',
        fontSize: '15px',
        fontWeight: 600,
        marginBottom: '20px',
      }}>
        {community.city} · {memberCount} üye · {founderName} kurdu
      </p>

      {community.description && (
        <p style={{
          color: 'var(--night)',
          fontSize: '16.5px',
          lineHeight: 1.6,
          marginBottom: '28px',
        }}>
          {community.description}
        </p>
      )}

      {/* Katıl butonu / bekleyen istek */}
      {user && !currentUserMembership && (
        <div style={{ marginBottom: '32px' }}>
          <JoinButton communityId={community.id} userId={user.id} />
        </div>
      )}
      {isPending && (
        <div style={{
          background: 'var(--seal-soft)',
          border: '1px solid rgba(196, 98, 45, 0.25)',
          borderRadius: '12px',
          padding: '14px 18px',
          color: 'var(--seal-deep)',
          fontSize: '14.5px',
          fontWeight: 600,
          marginBottom: '32px',
          display: 'inline-block',
        }}>
          İsteğin bekliyor — kurucu onaylayınca haberin olur.
        </div>
      )}

      {/* Bekleyen istekler (kurucu/admin görür) */}
      {canModerate && pendingMembers.length > 0 && (
        <section style={{ marginTop: '32px', marginBottom: '32px' }}>
          <h2 style={sectionTitleStyle}>Bekleyen istekler</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pendingMembers.map((m: any) => (
              <div key={m.id} style={memberRowStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                  {m.user?.avatar_url ? (
                    <img
                      src={m.user.avatar_url}
                      alt=""
                      style={avatarStyle}
                    />
                  ) : (
                    <div style={avatarPlaceholderStyle}>
                      {m.user?.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                  )}
                  <Link
                    href={`/profile/${m.user_id}`}
                    style={{ color: 'var(--night)', fontWeight: 700, textDecoration: 'none' }}
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
        <h2 style={sectionTitleStyle}>Üyeler</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {approvedMembers.map((m: any) => (
            <div key={m.id} style={memberRowStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                {m.user?.avatar_url ? (
                  <img
                    src={m.user.avatar_url}
                    alt=""
                    style={avatarStyle}
                  />
                ) : (
                  <div style={avatarPlaceholderStyle}>
                    {m.user?.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                )}
                <Link
                  href={`/profile/${m.user_id}`}
                  style={{ color: 'var(--night)', fontWeight: 700, textDecoration: 'none' }}
                >
                  {m.user?.name}
                </Link>
                {m.role === 'founder' && (
                  <span style={roleBadgeStyle}>kurucu</span>
                )}
                {m.role === 'admin' && (
                  <span style={roleBadgeStyle}>yönetici</span>
                )}
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
        <h2 style={sectionTitleStyle}>Yaklaşan etkinlikler</h2>
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
      <p style={{
        color: 'var(--muted)',
        fontSize: '15px',
        fontWeight: 500,
      }}>
        Henüz planlanmış bir buluşma yok.
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {events.map((event: any) => {
        const date = new Date(event.event_date)
        const dateStr = date.toLocaleDateString('tr-TR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
        const timeStr = date.toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit',
        })
        return (
          <Link
            key={event.id}
            href={`/event/${event.id}`}
            style={{
              display: 'flex',
              gap: '16px',
              background: '#ffffff',
              padding: '14px 18px',
              borderRadius: '12px',
              border: '1px solid var(--border-soft)',
              alignItems: 'center',
              textDecoration: 'none',
              transition: 'box-shadow 0.15s ease, transform 0.15s ease',
            }}
          >
            {event.cover_image_url ? (
              <div style={{
                flexShrink: 0,
                width: '72px',
                height: '72px',
                borderRadius: '10px',
                overflow: 'hidden',
                background: 'var(--paper-soft)',
              }}>
                <img
                  src={event.cover_image_url}
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
                flexShrink: 0,
                width: '72px',
                height: '72px',
                borderRadius: '10px',
                background: 'var(--paper-soft)',
              }} />
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <h3 style={{
                fontSize: '16.5px',
                fontWeight: 800,
                color: 'var(--night)',
                marginBottom: '4px',
                letterSpacing: '-0.3px',
              }}>
                {event.title}
              </h3>
              <p style={{
                color: 'var(--muted)',
                fontSize: '14px',
                fontWeight: 600,
              }}>
                {dateStr} · {timeStr} · {event.location}
              </p>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

const sectionTitleStyle = {
  fontSize: '22px',
  fontWeight: 800,
  letterSpacing: '-0.5px',
  color: 'var(--night)',
  marginBottom: '18px',
}

const memberRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '12px',
  padding: '12px 16px',
  background: '#ffffff',
  border: '1px solid var(--border-soft)',
  borderRadius: '12px',
  flexWrap: 'wrap' as const,
}

const avatarStyle = {
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  objectFit: 'cover' as const,
  border: '1px solid var(--border-soft)',
  flexShrink: 0,
}

const avatarPlaceholderStyle = {
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  background: 'var(--paper-soft)',
  color: 'var(--muted)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '14px',
  fontWeight: 800,
  flexShrink: 0,
}

const roleBadgeStyle = {
  background: 'var(--paper-soft)',
  color: 'var(--muted)',
  fontSize: '12px',
  fontWeight: 700,
  padding: '3px 10px',
  borderRadius: '999px',
  letterSpacing: '0.02em',
}