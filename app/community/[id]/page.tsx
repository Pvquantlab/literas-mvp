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
    .select('id, role, status, user_id, user:profiles!user_id(name)')
    .eq('community_id', id)

  const approvedMembers = (allMemberships ?? []).filter((m: any) => m.status === 'approved')
  const pendingMembers = (allMemberships ?? []).filter((m: any) => m.status === 'pending')

  const memberCount = approvedMembers.length
  const founderName = (community.founder as any)?.name ?? 'biri'
  const shortId = community.id.slice(0, 4).toUpperCase()

  const currentUserMembership = (allMemberships ?? []).find((m: any) => m.user_id === user?.id)
  const isFounder = currentUserMembership?.role === 'founder' && currentUserMembership?.status === 'approved'
  const isAdmin = currentUserMembership?.role === 'admin' && currentUserMembership?.status === 'approved'
  const isApprovedMember = currentUserMembership?.status === 'approved'
  const isPending = currentUserMembership?.status === 'pending'
  const canModerate = isFounder || isAdmin

  return (
    <main className="container">
      <div style={{ padding: '2rem 0' }}>
        <Link href="/" style={{
          color: 'var(--night)',
          opacity: 0.6,
          fontSize: '0.9rem',
          marginBottom: '1.5rem',
          display: 'inline-block',
        }}>
          ← Tüm topluluklar
        </Link>

        {community.cover_image_url && (
          <div style={{
            width: '100%',
            aspectRatio: '16 / 9',
            overflow: 'hidden',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: 'var(--old-paper)',
            marginBottom: '2rem',
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

        <p className="catalog-number" style={{ marginBottom: '0.5rem' }}>
          No. {shortId}
        </p>

        <h1 className="serif" style={{
          fontSize: '2.2rem',
          color: 'var(--ink)',
          marginBottom: '0.5rem',
          fontWeight: 500,
          lineHeight: 1.2,
        }}>
          {community.name}
        </h1>

        <p style={{
          color: 'var(--night)',
          opacity: 0.75,
          fontSize: '1rem',
          marginBottom: '1.5rem',
        }}>
          {community.city} · {memberCount} üye · <em>{founderName} kurdu</em>
        </p>

        {community.description && (
          <p style={{
            color: 'var(--night)',
            opacity: 0.85,
            fontSize: '1.05rem',
            marginBottom: '2rem',
            lineHeight: 1.6,
          }}>
            {community.description}
          </p>
        )}

        {user && !currentUserMembership && (
          <JoinButton communityId={community.id} userId={user.id} />
        )}
        {isPending && (
          <p style={{
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            padding: '0.75rem 1rem',
            fontFamily: 'Newsreader, serif',
            fontStyle: 'italic',
            color: 'var(--night)',
            opacity: 0.75,
            fontSize: '0.95rem',
            marginBottom: '1rem',
            display: 'inline-block',
          }}>
            İsteğin bekliyor — kurucu onaylayınca haberin olur.
          </p>
        )}

        {canModerate && pendingMembers.length > 0 && (
          <section style={{ marginTop: '2rem' }}>
            <h2 className="serif" style={{
              fontSize: '1.3rem',
              color: 'var(--ink)',
              marginBottom: '1rem',
              fontWeight: 500,
            }}>
              Bekleyen istekler
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {pendingMembers.map((m: any) => (
                <p key={m.id} style={{
                  color: 'var(--night)',
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}>
                  <Link href={`/profile/${m.user_id}`} style={{ color: 'var(--ink)', textDecoration: 'underline' }}>{m.user?.name}</Link>
                  <MemberActions memberId={m.id} action="approve" />
                  <MemberActions memberId={m.id} action="reject" />
                </p>
              ))}
            </div>
          </section>
        )}

        <section style={{ marginTop: '2.5rem' }}>
          <h2 className="serif" style={{
            fontSize: '1.3rem',
            color: 'var(--ink)',
            marginBottom: '1rem',
            fontWeight: 500,
          }}>
            Üyeler
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {approvedMembers.map((m: any) => (
              <p key={m.id} style={{
                color: 'var(--night)',
                fontSize: '0.95rem',
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
              }}>
                <Link href={`/profile/${m.user_id}`} style={{ color: 'var(--ink)', textDecoration: 'underline' }}>{m.user?.name}</Link>
                {m.role === 'founder' && (
                  <span style={{
                    fontFamily: 'Newsreader, serif',
                    fontStyle: 'italic',
                    opacity: 0.6,
                    marginLeft: '0.5rem',
                  }}>
                    · kurucu
                  </span>
                )}
                {m.role === 'admin' && (
                  <span style={{
                    fontFamily: 'Newsreader, serif',
                    fontStyle: 'italic',
                    opacity: 0.6,
                    marginLeft: '0.5rem',
                  }}>
                    · yönetici
                  </span>
                )}
                {isFounder && m.role !== 'founder' && (
                  <MemberActions
                    memberId={m.id}
                    action="toggle-admin"
                    currentRole={m.role as 'member' | 'admin'}
                  />
                )}
              </p>
            ))}
          </div>
        </section>

        <section style={{ marginTop: '2.5rem' }}>
          <h2 className="serif" style={{
            fontSize: '1.3rem',
            color: 'var(--ink)',
            marginBottom: '1rem',
            fontWeight: 500,
          }}>
            Yaklaşan etkinlikler
          </h2>
          <EventsList communityId={id} />
        </section>
      </div>
    </main>
  )
}

async function EventsList({ communityId }: { communityId: string }) {
  const supabase = await createClient()
  const { data: events } = await supabase
    .from('events')
    .select('id, title, location, event_date')
    .eq('community_id', communityId)
    .order('event_date', { ascending: true })

  if (!events || events.length === 0) {
    return (
      <p style={{
        color: 'var(--night)',
        opacity: 0.6,
        fontStyle: 'italic',
        fontFamily: 'Newsreader, serif',
      }}>
        Henüz planlanmış bir buluşma yok.
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
              display: 'block',
              background: 'white',
              padding: '1rem 1.25rem',
              borderRadius: '6px',
              border: '1px solid var(--border)',
            }}
          >
            <h3 className="serif" style={{
              fontSize: '1.1rem',
              color: 'var(--ink)',
              marginBottom: '0.25rem',
              fontWeight: 500,
            }}>
              {event.title}
            </h3>
            <p style={{
              color: 'var(--night)',
              opacity: 0.7,
              fontSize: '0.9rem',
            }}>
              {dateStr} · {timeStr} · {event.location}
            </p>
          </Link>
        )
      })}
    </div>
  )
}
