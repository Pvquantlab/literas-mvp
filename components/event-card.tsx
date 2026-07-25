import Link from 'next/link'
import IsoCover from '@/components/iso-cover'

type Event = {
  id: string
  title: string
  location: string
  event_date: string
  cover_image_url: string | null
  community?: { name: string; category?: string | null } | null
}

type Props = {
  event: Event
  showCommunityName?: boolean
}

const MONTHS_TR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
const DAYS_TR_SHORT = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']

function formatEventDate(iso: string): string {
  const d = new Date(iso)
  const day = DAYS_TR_SHORT[d.getDay()]
  const dateNum = d.getDate()
  const month = MONTHS_TR[d.getMonth()]
  const hours = d.getHours().toString().padStart(2, '0')
  const mins = d.getMinutes().toString().padStart(2, '0')
  return `${day}, ${dateNum} ${month} · ${hours}:${mins}`
}

export default function EventCard({ event, showCommunityName = true }: Props) {
  const hasImage = !!event.cover_image_url
  const category = event.community?.category ?? null

  return (
    <Link
      href={`/event/${event.id}`}
      className="event-card-link"
      style={{
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <article
        className="event-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          cursor: 'pointer',
          height: '100%',
        }}
      >
        {/* Görsel — 16:9 */}
        <div
          style={{
            position: 'relative',
            aspectRatio: '16 / 9',
            overflow: 'hidden',
            borderRadius: '14px',
            background: '#16281D',
          }}
        >
          {hasImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.cover_image_url!}
              alt={event.title}
              loading="lazy"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          ) : (
            <IsoCover category={category} id={event.id} />
          )}
        </div>

        {/* Yazı bloğu */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          padding: '0 2px',
        }}>
          <h3
            className="event-title"
            style={{
              fontSize: '17px',
              fontWeight: 600,
              lineHeight: 1.25,
              color: 'var(--ink, #1E3A2B)',
              margin: 0,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              letterSpacing: '-0.01em',
            }}
          >
            {event.title}
          </h3>

          <p style={{
            fontSize: '13.5px',
            color: 'var(--muted, #7A776E)',
            margin: '4px 0 0',
            lineHeight: 1.4,
            fontWeight: 500,
          }}>
            {formatEventDate(event.event_date)}
          </p>

          <p style={{
            fontSize: '13.5px',
            color: 'var(--muted, #7A776E)',
            margin: 0,
            lineHeight: 1.4,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {showCommunityName && event.community?.name
              ? event.community.name
              : event.location}
          </p>

          <p style={{
            fontSize: '13.5px',
            color: 'var(--ink, #1E3A2B)',
            fontWeight: 600,
            margin: '6px 0 0',
          }}>
            Ücretsiz
          </p>
        </div>
      </article>

      <style>{`
        .event-card-link:hover .event-title {
          text-decoration: underline;
          text-decoration-thickness: 2px;
          text-underline-offset: 3px;
        }
      `}</style>
    </Link>
  )
}
