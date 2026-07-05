import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import RsvpForm from './rsvp-form'
import EventActions from './event-actions'

export const dynamic = 'force-dynamic'

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: event } = await supabase
    .from('events')
    .select(`
      *,
      organizer:profiles!organizer_id(id, name),
      community:communities!community_id(id, name)
    `)
    .eq('id', id)
    .single()

  if (!event) {
    notFound()
  }

  const { data: rsvps } = await supabase
    .from('rsvps')
    .select(`
      id,
      user:profiles!user_id(id, name)
    `)
    .eq('event_id', id)
    .order('created_at', { ascending: true })

  let isApprovedMember = false
  let isCommunityModerator = false
  if (user && event.community_id) {
    const { data: membership } = await supabase
      .from('community_members')
      .select('role, status')
      .eq('community_id', event.community_id)
      .eq('user_id', user.id)
      .maybeSingle()
    isApprovedMember = membership?.status === 'approved'
    isCommunityModerator =
      membership?.status === 'approved' &&
      (membership.role === 'founder' || membership.role === 'admin')
  }

  const userHasRsvp = user
    ? rsvps?.some((r: any) => r.user?.id === user.id)
    : false

  const isOrganizer = user?.id === event.organizer_id
  const canManage = isOrganizer || isCommunityModerator

  const date = new Date(event.event_date)
  const dateStr = date.toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const timeStr = date.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <main style={{
      maxWidth: '760px',
      margin: '0 auto',
      padding: '32px 24px 64px',
    }}>
      <Link href="/" style={{
        color: 'var(--muted)',
        fontSize: '14px',
        fontWeight: 600,
        textDecoration: 'none',
        display: 'inline-block',
        marginBottom: '20px',
      }}>
        ← Tüm etkinlikler
      </Link>

      {event.cover_image_url && (
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
      )}

      {/* Başlık */}
      <h1 style={{
        fontSize: '38px',
        fontWeight: 800,
        letterSpacing: '-1px',
        lineHeight: 1.15,
        color: 'var(--night)',
        margin: '0 0 12px',
      }}>
        {event.title}
      </h1>

      {event.community && (
        <p style={{
          color: 'var(--muted)',
          fontSize: '15px',
          fontWeight: 600,
          marginBottom: '24px',
        }}>
          <Link href={`/community/${event.community.id}`} style={{
            color: 'var(--ink)',
            fontWeight: 700,
            textDecoration: 'none',
          }}>
            {event.community.name}
          </Link>
          <span> topluluğunun bir buluşması</span>
        </p>
      )}

      {/* Detay kutusu */}
      <div style={{
        background: 'var(--paper-soft)',
        padding: '20px 24px',
        borderRadius: '16px',
        marginBottom: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}>
        <DetailRow label="Tarih" value={dateStr} />
        <DetailRow label="Saat" value={timeStr} />
        <DetailRow label="Konum" value={event.location} />
        {event.organizer?.name && (
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--night)' }}>
            <span style={{ color: 'var(--muted)', marginRight: '6px' }}>Düzenleyen:</span>
            <Link href={`/profile/${event.organizer.id}`} style={{
              color: 'var(--ink)',
              fontWeight: 700,
              textDecoration: 'none',
            }}>
              {event.organizer.name}
            </Link>
          </p>
        )}
      </div>

      {event.description && (
        <div style={{
          fontSize: '16.5px',
          lineHeight: 1.65,
          color: 'var(--night)',
          whiteSpace: 'pre-wrap',
          marginBottom: '24px',
        }}>
          {event.description}
        </div>
      )}

      {canManage && <EventActions eventId={event.id} />}

      {/* Katılım */}
      <section style={{ marginTop: '40px' }}>
        <h2 style={{
          fontSize: '22px',
          fontWeight: 800,
          letterSpacing: '-0.5px',
          color: 'var(--night)',
          marginBottom: '18px',
        }}>
          Katılım
        </h2>

        {!user ? (
          <div style={joinBoxStyle}>
            <p style={{ marginBottom: '16px', color: 'var(--muted)', fontSize: '15px', fontWeight: 500 }}>
              Katılmak için önce giriş yapmalısın.
            </p>
            <Link href="/login" className="btn-primary">Giriş yap</Link>
          </div>
        ) : isOrganizer ? (
          <p style={{
            color: 'var(--muted)',
            fontSize: '15px',
            fontWeight: 600,
          }}>
            Bu etkinliği sen düzenliyorsun.
          </p>
        ) : !isApprovedMember && event.community ? (
          <div style={joinBoxStyle}>
            <p style={{ marginBottom: '16px', color: 'var(--night)', fontSize: '15px', lineHeight: 1.55 }}>
              Bu etkinliğe katılmak için önce{' '}
              <strong>{event.community.name}</strong>{' '}
              topluluğunun üyesi olmalısın.
            </p>
            <Link href={`/community/${event.community.id}`} className="btn-primary">
              Topluluğa git
            </Link>
          </div>
        ) : (
          <RsvpForm
            eventId={event.id}
            userId={user.id}
            userHasRsvp={userHasRsvp || false}
            isFull={event.max_attendees ? (rsvps?.length || 0) >= event.max_attendees : false}
          />
        )}

        <div style={{ marginTop: '24px' }}>
          <p style={{
            fontSize: '14.5px',
            fontWeight: 600,
            color: 'var(--muted)',
            marginBottom: '12px',
          }}>
            {rsvps?.length || 0} kişi katılıyor
            {event.max_attendees && ` / ${event.max_attendees} kişilik`}
          </p>
          {rsvps && rsvps.length > 0 && (
            <ul style={{
              listStyle: 'none',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              padding: 0,
            }}>
              {rsvps.map((r: any) => (
                <li key={r.id}>
                  {r.user?.id ? (
                    <Link href={`/profile/${r.user.id}`} style={rsvpChipStyle}>
                      {r.user.name}
                    </Link>
                  ) : (
                    <span style={rsvpChipStyle}>Anonim</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--night)' }}>
      <span style={{ color: 'var(--muted)', marginRight: '6px' }}>{label}:</span>
      {value}
    </p>
  )
}

const joinBoxStyle = {
  background: '#ffffff',
  padding: '24px',
  borderRadius: '16px',
  border: '1px solid var(--border-soft)',
  textAlign: 'center' as const,
}

const rsvpChipStyle = {
  display: 'inline-block',
  background: '#ffffff',
  padding: '8px 16px',
  borderRadius: '999px',
  border: '1px solid var(--border-soft)',
  fontSize: '14px',
  fontWeight: 700,
  color: 'var(--night)',
  textDecoration: 'none',
}