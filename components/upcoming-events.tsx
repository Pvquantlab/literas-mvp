import Link from 'next/link'
import Image from 'next/image'
import { byValue, categoryGradient } from '@/lib/categories'
import CategoryIcon from './category-icon'

export type EventSummary = {
  id: string
  title: string
  event_date: string
  location: string | null
  cover_image_url: string | null
  price?: number | null
  community?: { name: string; category: string | null } | null
}

/**
 * Ana sayfada eksik olan bölüm.
 *
 * Meetup kart ızgarası kullanır, Luma tarih omurgası. Omurga burada daha
 * doğru: kullanıcı "ne zaman" sorusuyla geliyor, "hangi kategori" ile değil.
 * Aynı güne düşen etkinlikler tek tarih başlığı altında toplanır.
 */

function groupByDay(events: EventSummary[]) {
  const map = new Map<string, EventSummary[]>()
  for (const ev of events) {
    const key = new Date(ev.event_date).toISOString().slice(0, 10)
    const bucket = map.get(key)
    if (bucket) bucket.push(ev)
    else map.set(key, [ev])
  }
  return Array.from(map.entries())
}

function dayLabel(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const tomorrow = new Date()
  tomorrow.setDate(today.getDate() + 1)

  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  if (same(d, today)) return 'Bugün'
  if (same(d, tomorrow)) return 'Yarın'

  return d.toLocaleDateString('tr-TR', { weekday: 'long' })
}

export default function UpcomingEvents({ events }: { events: EventSummary[] }) {
  if (events.length === 0) {
    return (
      <div className="empty-state">
        <p>Bu bölgede yaklaşan etkinlik yok. İlkini sen planla.</p>
        <Link href="/event/new" className="btn-primary btn-sm">Etkinlik oluştur</Link>
      </div>
    )
  }

  return (
    <div className="stack" style={{ gap: 'var(--s-6)' }}>
      {groupByDay(events).map(([iso, dayEvents]) => {
        const d = new Date(iso)
        return (
          <section key={iso} className="ue-day">
            {/* Tarih omurgası */}
            <div className="ue-spine">
              <span className="mono" style={{ fontSize: 'var(--t-xs)', color: 'var(--coral)' }}>
                {d.toLocaleDateString('tr-TR', { month: 'short' }).toLowerCase()}
              </span>
              <span className="serif" style={{ fontSize: 'var(--t-xl)', color: 'var(--ink)' }}>
                {d.getDate()}
              </span>
              <span style={{ fontSize: 'var(--t-xs)', color: 'var(--muted)' }}>
                {dayLabel(iso)}
              </span>
            </div>

            <ul className="ue-list">
              {dayEvents.map((ev) => {
                const cat = byValue(ev.community?.category)
                const time = new Date(ev.event_date).toLocaleTimeString('tr-TR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
                return (
                  <li key={ev.id}>
                    <Link href={`/event/${ev.id}`} className="ue-row">
                      <div className="stack" style={{ gap: 'var(--s-1)', minWidth: 0 }}>
                        <span className="mono" style={{ fontSize: 'var(--t-xs)', color: 'var(--muted)' }}>
                          {time}
                        </span>
                        <h3
                          className="ue-title"
                          style={{
                            fontSize: 'var(--t-lg)',
                            fontWeight: 600,
                            lineHeight: 1.3,
                            color: 'var(--ink)',
                          }}
                        >
                          {ev.title}
                        </h3>
                        <p style={{ fontSize: 'var(--t-sm)', color: 'var(--muted)' }}>
                          {[ev.community?.name, ev.location].filter(Boolean).join(' · ')}
                        </p>
                        {(ev.price ?? 0) === 0 && (
                          <span className="badge-free" style={{ alignSelf: 'flex-start', marginTop: 2 }}>
                            Ücretsiz
                          </span>
                        )}
                      </div>

                      <div
                        className="ue-thumb"
                        style={{
                          background: ev.cover_image_url
                            ? 'var(--paper-soft)'
                            : categoryGradient(ev.community?.category),
                        }}
                      >
                        {ev.cover_image_url ? (
                          <Image
                            src={ev.cover_image_url}
                            alt=""
                            fill
                            sizes="120px"
                            style={{ objectFit: 'cover' }}
                          />
                        ) : (
                          <span style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'rgba(255,255,255,.9)' }}>
                            <CategoryIcon slug={cat?.slug} size={30} />
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
