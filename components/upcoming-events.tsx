import Link from 'next/link'
import Image from 'next/image'
import { CategoryCover } from '@/components/category-art'

export type EventSummary = {
  id: string
  title: string
  event_date: string
  location: string | null
  cover_image_url: string | null
  price?: number | null
  community?: { name: string; category: string | null } | null
  /** Serinin kalan gelecek buluşma sayısı. Sayfa hesaplayıp geçirir — bu
   *  bileşen veri çekmez. Yoksa (veya seriden kopmuşsa) rozet gizlenir. */
  seriKalan?: number | null
  /** 'haftalik' | 'iki_haftalik' | 'aylik' */
  frekans?: string | null
}

/**
 * Ana sayfada eksik olan bölüm.
 *
 * Meetup kart ızgarası kullanır, Luma tarih omurgası. Omurga burada daha
 * doğru: kullanıcı "ne zaman" sorusuyla geliyor, "hangi kategori" ile değil.
 * Aynı güne düşen etkinlikler tek tarih başlığı altında toplanır.
 */

const TZ = 'Europe/Istanbul'

/**
 * Gün anahtarı — İstanbul gününe göre.
 *
 * Eskiden toISOString().slice(0,10) kullanılıyordu, yani UTC günü. Vercel
 * UTC'de koştuğu için TR saatiyle gece yarısından sonraki etkinlikler bir
 * ÖNCEKİ günün altında listeleniyordu: 14 Ağustos 01:30 → 13 Ağustos.
 * en-CA locale'i YYYY-MM-DD veriyor, sıralama için de doğru format.
 */
function dayKey(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))
}

/** Anahtar üzerinde saf tarih matematiği — saat dilimi karışmıyor. */
function addDays(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

function fmt(iso: string, o: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('tr-TR', { timeZone: TZ, ...o }).format(new Date(iso))
}

function groupByDay(events: EventSummary[]) {
  const map = new Map<string, EventSummary[]>()
  for (const ev of events) {
    const key = dayKey(ev.event_date)
    const bucket = map.get(key)
    if (bucket) bucket.push(ev)
    else map.set(key, [ev])
  }
  return Array.from(map.entries())
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

  // "Bugün" / "Yarın" da İstanbul gününe göre — sunucu nerede koşarsa koşsun.
  const todayKey = dayKey(new Date().toISOString())
  const tomorrowKey = addDays(todayKey, 1)

  return (
    <div className="stack" style={{ gap: 'var(--s-6)' }}>
      {groupByDay(events).map(([key, dayEvents]) => {
        // Etiketler grubun ilk etkinliğinden türüyor. Anahtarı yeniden
        // Date'e çevirmek UTC gece yarısı olarak ayrıştırılıp günü tekrar
        // kaydırıyordu.
        const ref = dayEvents[0].event_date
        const label =
          key === todayKey ? 'Bugün' : key === tomorrowKey ? 'Yarın' : fmt(ref, { weekday: 'long' })

        return (
          <section key={key} className="ue-day">
            <div className="ue-spine">
              <span className="mono" style={{ fontSize: 'var(--t-xs)', color: 'var(--coral)' }}>
                {fmt(ref, { month: 'short' }).toLocaleLowerCase('tr')}
              </span>
              <span className="serif" style={{ fontSize: 'var(--t-xl)', color: 'var(--ink)' }}>
                {fmt(ref, { day: 'numeric' })}
              </span>
              <span style={{ fontSize: 'var(--t-xs)', color: 'var(--muted)' }}>{label}</span>
            </div>

            <ul className="ue-list">
              {dayEvents.map((ev) => (
                <li key={ev.id}>
                  <Link href={`/event/${ev.id}`} className="ue-row">
                    <div className="stack" style={{ gap: 'var(--s-1)', minWidth: 0 }}>
                      <span className="mono" style={{ fontSize: 'var(--t-xs)', color: 'var(--muted)' }}>
                        {fmt(ev.event_date, { hour: '2-digit', minute: '2-digit', hour12: false })}
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
                      {/* Seri ibaresi: EventCard'ın .ec-seri rozetiyle aynı
                          frekans eşlemesi, bu satırın kendi mono stiline
                          uyarlanmış. Katlanmış sayaç "24" derken liste 2
                          satır çizip kendi kendini yalanlamasın diye var. */}
                      {ev.seriKalan != null && ev.seriKalan > 0 && (
                        <span className="mono" style={{ fontSize: 'var(--t-xs)', color: 'var(--ink)' }}>
                          {ev.frekans === 'haftalik' ? 'haftalık'
                            : ev.frekans === 'iki_haftalik' ? 'iki haftada bir'
                            : 'aylık'} · {ev.seriKalan} buluşma
                        </span>
                      )}
                    </div>

                    <div className="ue-thumb">
                      {ev.cover_image_url ? (
                        <Image
                          src={ev.cover_image_url}
                          alt=""
                          fill
                          sizes="120px"
                          style={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <CategoryCover
                          value={ev.community?.category}
                          w={120}
                          h={90}
                          scale={0.66}
                        />
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
