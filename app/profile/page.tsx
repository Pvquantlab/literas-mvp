import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import LogoutButton from './logout-button'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: myEvents } = await supabase
    .from('events')
    .select('id, title, event_date, location')
    .eq('organizer_id', user.id)
    .order('event_date', { ascending: true })

  const { data: myRsvps } = await supabase
    .from('rsvps')
    .select(`
      event:events(id, title, event_date, location)
    `)
    .eq('user_id', user.id)

  return (
    <main className="container">
      <section style={{ padding: '2.5rem 0 1.5rem' }}>
        <p className="catalog-number" style={{ marginBottom: '0.5rem' }}>Profil</p>
        <h1 className="serif" style={{
          fontSize: '2rem',
          color: 'var(--ink)',
          fontWeight: 500,
        }}>
          {profile?.name || 'Profilim'}
        </h1>
        <p style={{ opacity: 0.7, marginTop: '0.25rem' }}>{profile?.email}</p>
        <div style={{ marginTop: '1rem' }}>
          <LogoutButton />
        </div>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2 className="serif" style={{
          fontSize: '1.4rem',
          color: 'var(--ink)',
          marginBottom: '1rem',
          fontWeight: 500,
        }}>
          Düzenlediğin etkinlikler
        </h2>

        {!myEvents || myEvents.length === 0 ? (
          <p style={{ opacity: 0.6 }}>
            Henüz hiç etkinlik oluşturmadın.{' '}
            <Link href="/event/new" style={{ fontWeight: 500 }}>
              İlk etkinliğini oluştur →
            </Link>
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {myEvents.map((event: any) => (
              <Link key={event.id} href={`/event/${event.id}`} style={{
                display: 'block',
                background: 'white',
                padding: '1rem 1.25rem',
                borderRadius: '6px',
                border: '1px solid var(--border)',
              }}>
                <h3 className="serif" style={{ fontSize: '1.1rem', color: 'var(--ink)', fontWeight: 500 }}>
                  {event.title}
                </h3>
                <p style={{ opacity: 0.7, fontSize: '0.9rem', marginTop: '0.25rem' }}>
                  {new Date(event.event_date).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'long',
                  })} · {event.location}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section style={{ marginTop: '2.5rem' }}>
        <h2 className="serif" style={{
          fontSize: '1.4rem',
          color: 'var(--ink)',
          marginBottom: '1rem',
          fontWeight: 500,
        }}>
          Katılacağın etkinlikler
        </h2>

        {!myRsvps || myRsvps.length === 0 ? (
          <p style={{ opacity: 0.6 }}>
            Henüz hiç etkinliğe katılım vermedin.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {myRsvps.map((r: any) => r.event && (
              <Link key={r.event.id} href={`/event/${r.event.id}`} style={{
                display: 'block',
                background: 'white',
                padding: '1rem 1.25rem',
                borderRadius: '6px',
                border: '1px solid var(--border)',
              }}>
                <h3 className="serif" style={{ fontSize: '1.1rem', color: 'var(--ink)', fontWeight: 500 }}>
                  {r.event.title}
                </h3>
                <p style={{ opacity: 0.7, fontSize: '0.9rem', marginTop: '0.25rem' }}>
                  {new Date(r.event.event_date).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'long',
                  })} · {r.event.location}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
