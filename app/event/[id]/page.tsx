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
    .select(`id, user:profiles!user_id(id, name)`)
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
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const timeStr = date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })

  return (
    <main style={{ maxWidth: '760px', margin: '0 auto', padding: '32px 24px 64px' }}>
      <Link
        href="/"
        style={{
          color: 'var(--muted)',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '13px',
          fontWeight: 500,
          textDecoration: 'none',
          display: 'inline-block',
          marginBottom: '20px',
        }}
      >
        ← tüm etkinlikler
      </Link>

      {event.cover_image_url && (
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
            src={event.cover_image_url}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
      )}

      {/* Başlık — Playfair + sarı highlight */}
      <h1 className="serif" style={{
        fontSize: 'clamp(30px, 4vw, 42px)',
        lineHeight: 1.15,
        color: 'var(--ink)',
        margin: '0 0 14px',
      }}>
        <span className="highlight-yellow">{event.title}</span>
      </h1>

      {event.community && (
        <p style={{
          fontFamily: "'IBM Plex Mono', monospace",
          color: 'var(--muted)',
          fontSize: '13px',
          marginBottom: '24px',
        }}>
          <Link href={`/community/${event.community.id}`} style={{
            color: 'var(--ink)',
            fontWeight: 700,
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
          }}>
            {event.community.name}
          </Link>
          <span> topluluğunun bir buluşması</span>
        </p>
      )}

      {/* Detay kutusu */}
      <div style={{
        background: 'var(--paper-cream)',
        border: '1.5px solid var(--border)',
        padding: '20px 24px',
        borderRadius: '18px',
        marginBottom: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}>
        <DetailRow icon="📅" label="Tarih" value={dateStr} />
        <DetailRow icon="🕒" label="Saat" value={timeStr} />
        <DetailRow icon="📍" label="Konum" value={event.location} />
        {event.organizer?.name && (
          <p style={detailRowStyle}>
            <span style={{ marginRight: '6px' }}>👤</span>
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
          color: 'var(--ink)',
          whiteSpace: 'pre-wrap',
          marginBottom: '24px',
        }}>
          {event.description}
        </div>
      )}

      {canManage && <EventActions eventId={event.id} />}

      {/* Katılım */}
      <section style={{ marginTop: '40px' }}>
        <h2 className="serif" style={{
          fontSize: 'clamp(22px, 2.8vw, 28px)',
          color: 'var(--ink)',
          marginBottom: '18px',
        }}>
          Katılım
        </h2>

        {!user ? (
          <div style={joinBoxStyle}>
            <p style={{ marginBottom: '16px', color: 'var(--muted)', fontSize: '15px', fontFamily: "'IBM Plex Mono', monospace" }}>
              katılmak için önce giriş yapmalısın
            </p>
            <Link href="/login" className="btn-primary">Giriş yap</Link>
          </div>
        ) : isOrganizer ? (
          <p style={{
            fontFamily: "'IBM Plex Mono', monospace",
            color: 'var(--muted)',
            fontSize: '13.5px',
          }}>
            ✿ bu etkinliği sen düzenliyorsun
          </p>
        ) : !isApprovedMember && event.community ? (
          <div style={joinBoxStyle}>
            <p style={{ marginBottom: '16px', color: 'var(--ink)', fontSize: '15px', lineHeight: 1.55 }}>
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
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '13px',
            color: 'var(--muted)',
            marginBottom: '12px',
          }}>
            👥 {rsvps?.length || 0} kişi katılıyor
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

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <p style={detailRowStyle}>
      <span style={{ marginRight: '6px' }}>{icon}</span>
      <span style={{ color: 'var(--muted)', marginRight: '6px' }}>{label}:</span>
      {value}
    </p>
  )
}

const detailRowStyle: React.CSSProperties = {
  fontSize: '15px',
  fontWeight: 600,
  color: 'var(--ink)',
}

const joinBoxStyle: React.CSSProperties = {
  background: 'var(--paper-cream)',
  padding: '24px',
  borderRadius: '18px',
  border: '1.5px solid var(--border)',
  textAlign: 'center',
}

const rsvpChipStyle: React.CSSProperties = {
  display: 'inline-block',
  background: 'var(--paper-cream)',
  padding: '6px 14px',
  borderRadius: '999px',
  border: '1.5px solid var(--border-mid)',
  fontSize: '13.5px',
  fontWeight: 700,
  color: 'var(--ink)',
  textDecoration: 'none',
}