import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: events } = await supabase
    .from('events')
    .select(`
      id,
      title,
      description,
      location,
      event_date,
      organizer:profiles!organizer_id(name)
    `)
    .order('event_date', { ascending: true })

  return (
    <main className="container">
      <section style={{ padding: '3rem 0 2rem', textAlign: 'center' }}>
        <p className="catalog-number" style={{ marginBottom: '1rem' }}>No. 0001</p>
        <h1 className="serif" style={{
          fontSize: '2.5rem',
          fontWeight: 500,
          color: 'var(--ink)',
          marginBottom: '1rem',
          lineHeight: 1.2,
        }}>
          İnsanların kendi topluluklarını kurduğu bir yer
        </h1>
        <p style={{
          color: 'var(--night)',
          opacity: 0.75,
          fontSize: '1.1rem',
          maxWidth: '480px',
          margin: '0 auto',
        }}>
          Kitap kulübü, yürüyüş, dil pratiği. Bir araya gelmek için bir bahane yeter.
        </p>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2 className="serif" style={{
          fontSize: '1.5rem',
          color: 'var(--ink)',
          marginBottom: '1.5rem',
          fontWeight: 500,
        }}>
          Yaklaşan etkinlikler
        </h2>

        {!events || events.length === 0 ? (
          <div style={{
            background: 'white',
            padding: '3rem 2rem',
            borderRadius: '8px',
            textAlign: 'center',
            border: '1px solid var(--border)',
          }}>
            <p style={{ color: 'var(--night)', opacity: 0.6, marginBottom: '1rem' }}>
              Henüz hiç etkinlik yok.
            </p>
            <Link href="/event/new" className="btn-primary">
              İlk etkinliği sen oluştur
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {events.map((event: any, i: number) => {
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
              const num = String(i + 1).padStart(4, '0')

              return (
                <Link key={event.id} href={`/event/${event.id}`} style={{
                  display: 'block',
                  background: 'white',
                  padding: '1.5rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  transition: 'border-color 0.2s',
                }}>
                  <p className="catalog-number" style={{ marginBottom: '0.5rem' }}>
                    No. {num}
                  </p>
                  <h3 className="serif" style={{
                    fontSize: '1.4rem',
                    color: 'var(--ink)',
                    marginBottom: '0.5rem',
                    fontWeight: 500,
                  }}>
                    {event.title}
                  </h3>
                  <p style={{ color: 'var(--night)', opacity: 0.75, fontSize: '0.95rem' }}>
                    {dateStr} · {timeStr} · {event.location}
                  </p>
                  {event.organizer?.name && (
                    <p style={{
                      fontFamily: 'Newsreader, serif',
                      fontStyle: 'italic',
                      color: 'var(--night)',
                      opacity: 0.6,
                      fontSize: '0.9rem',
                      marginTop: '0.5rem',
                    }}>
                      {event.organizer.name} düzenliyor
                    </p>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
