import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import RsvpForm from './rsvp-form'

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
      organizer:profiles!organizer_id(id, name)
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

  const userHasRsvp = user
    ? rsvps?.some((r: any) => r.user?.id === user.id)
    : false

  const isOrganizer = user?.id === event.organizer_id

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
    <main className="container" style={{ maxWidth: '640px' }}>
      <Link href="/" style={{ fontSize: '0.9rem', opacity: 0.7 }}>
        ← Tüm etkinlikler
      </Link>

      <section style={{ padding: '1.5rem 0 2rem' }}>
        <p className="catalog-number" style={{ marginBottom: '0.5rem' }}>
          No. {String(event.id).slice(0, 4).toUpperCase()}
        </p>
        <h1 className="serif" style={{
          fontSize: '2.25rem',
          color: 'var(--ink)',
          fontWeight: 500,
          lineHeight: 1.2,
          marginBottom: '1rem',
        }}>
          {event.title}
        </h1>

        <div style={{
          background: 'var(--old-paper)',
          padding: '1.25rem 1.5rem',
          borderRadius: '8px',
          marginTop: '1rem',
        }}>
          <p style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>
            <strong>Tarih:</strong> {dateStr}
          </p>
          <p style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>
            <strong>Saat:</strong> {timeStr}
          </p>
          <p style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>
            <strong>Konum:</strong> {event.location}
          </p>
          {event.organizer?.name && (
            <p style={{ fontSize: '0.95rem' }}>
              <strong>Düzenleyen:</strong>{' '}
              <span style={{ fontFamily: 'Newsreader, serif', fontStyle: 'italic' }}>
                {event.organizer.name}
              </span>
            </p>
          )}
        </div>

        {event.description && (
          <div style={{
            marginTop: '1.5rem',
            fontFamily: 'Newsreader, serif',
            fontSize: '1.1rem',
            lineHeight: 1.7,
            color: 'var(--night)',
            whiteSpace: 'pre-wrap',
          }}>
            {event.description}
          </div>
        )}
      </section>

      <section style={{ marginTop: '1rem' }}>
        <h2 className="serif" style={{
          fontSize: '1.3rem',
          color: 'var(--ink)',
          marginBottom: '1rem',
          fontWeight: 500,
        }}>
          Katılım
        </h2>

        {!user ? (
          <div style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            textAlign: 'center',
          }}>
            <p style={{ marginBottom: '1rem', opacity: 0.75 }}>
              Katılmak için önce giriş yapmalısın.
            </p>
            <Link href="/login" className="btn-primary">
              Giriş yap
            </Link>
          </div>
        ) : isOrganizer ? (
          <p style={{
            fontFamily: 'Newsreader, serif',
            fontStyle: 'italic',
            opacity: 0.7,
          }}>
            Bu etkinliği sen düzenliyorsun.
          </p>
        ) : (
          <RsvpForm
            eventId={event.id}
            userId={user.id}
            userHasRsvp={userHasRsvp || false}
            isFull={event.max_attendees ? (rsvps?.length || 0) >= event.max_attendees : false}
          />
        )}

        <div style={{ marginTop: '1.5rem' }}>
          <p style={{ fontSize: '0.95rem', opacity: 0.7, marginBottom: '0.75rem' }}>
            {rsvps?.length || 0} kişi katılıyor
            {event.max_attendees && ` / ${event.max_attendees} kişilik`}
          </p>
          {rsvps && rsvps.length > 0 && (
            <ul style={{
              listStyle: 'none',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}>
              {rsvps.map((r: any) => (
                <li key={r.id} style={{
                  background: 'white',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '20px',
                  border: '1px solid var(--border)',
                  fontSize: '0.9rem',
                  fontFamily: 'Newsreader, serif',
                  fontStyle: 'italic',
                }}>
                  {r.user?.name || 'Anonim'}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  )
}
