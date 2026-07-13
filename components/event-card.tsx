import Link from 'next/link'

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

/** Kategori → yumuşak fon rengi (paper-cream tonlarında) */
const CATEGORY_BG: Record<string, string> = {
  kitap:       '#F5E9D0',  // soluk sarı
  'doğa':      '#DDE9D5',  // soluk yeşil
  'müzik':     '#E7DBEB',  // soluk mor
  lezzet:      '#F3D8CE',  // soluk somon
  dil:         '#DCE4EE',  // soluk mavi-gri
  spor:        '#E5E0D2',  // soluk zeytin
  sanat:       '#EFD9DC',  // soluk pembe
  oyun:        '#DFE8DE',  // yumuşak yeşil
  tech:        '#DAE0E6',  // soluk çelik mavi
  sinema:      '#E4DED4',  // soluk kum
  'fotoğraf':  '#E0DEDC',  // soluk gri
  'gönüllülük':'#E1EBDA',  // soluk yeşil
  kariyer:     '#E5DED0',  // soluk kremit
  sosyal:      '#EBDFD3',  // soluk kavun
  default:     '#E8E4D8',  // nötr krem
}

/** Kategori → SVG ikonu (Lucide-style stroke) */
function CategoryIcon({ slug, size = 72 }: { slug: string; size?: number }) {
  const color = 'var(--ink, #1E3A2B)'
  const common = {
    width: size, height: size, viewBox: '0 0 24 24',
    fill: 'none', stroke: color, strokeWidth: 1.6,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
    opacity: 0.85,
  }
  switch (slug) {
    case 'kitap':
      return <svg {...common}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
    case 'doğa':
      return <svg {...common}><path d="M8 19v2"/><path d="M8 15v-3"/><path d="M12 21V11"/><path d="M16 21v-4"/><path d="M12 11 6 5l6-2 6 2z"/><path d="M18 12a3 3 0 1 0 3-3"/></svg>
    case 'müzik':
      return <svg {...common}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
    case 'lezzet':
      return <svg {...common}><path d="M15 11h.01"/><path d="M11 15h.01"/><path d="M16 16h.01"/><path d="m2 16 20 6-6-20A20 20 0 0 0 2 16"/><path d="M5.71 17.11a17.04 17.04 0 0 1 11.4-11.4"/></svg>
    case 'dil':
      return <svg {...common}><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>
    case 'spor':
      return <svg {...common}><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
    case 'sanat':
      return <svg {...common}><circle cx="13.5" cy="6.5" r=".5" fill={color}/><circle cx="17.5" cy="10.5" r=".5" fill={color}/><circle cx="8.5" cy="7.5" r=".5" fill={color}/><circle cx="6.5" cy="12.5" r=".5" fill={color}/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
    case 'oyun':
      return <svg {...common}><line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><line x1="15" x2="15.01" y1="12" y2="12"/><line x1="18" x2="18.01" y1="10" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/></svg>
    case 'tech':
      return <svg {...common}><rect width="18" height="12" x="3" y="4" rx="2"/><line x1="2" x2="22" y1="20" y2="20"/></svg>
    case 'sinema':
      return <svg {...common}><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/></svg>
    case 'fotoğraf':
      return <svg {...common}><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
    case 'gönüllülük':
      return <svg {...common}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
    case 'kariyer':
      return <svg {...common}><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
    case 'sosyal':
      return <svg {...common}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    default:
      return <svg {...common}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
  }
}

export default function EventCard({ event, showCommunityName = true }: Props) {
  const hasImage = !!event.cover_image_url
  const category = event.community?.category ?? 'default'
  const bg = CATEGORY_BG[category] ?? CATEGORY_BG.default

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
            background: hasImage ? 'transparent' : bg,
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
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
            }}>
              <CategoryIcon slug={category} size={80} />
            </div>
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
              fontFamily: "'Schibsted Grotesk', system-ui, -apple-system, sans-serif",
              fontSize: '17px',
              fontWeight: 800,
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
            fontWeight: 700,
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
