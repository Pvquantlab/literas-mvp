import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import RsvpForm from './rsvp-form'
import EventActions from './event-actions'
import EventMap from './event-map'
import WhatsappShare from './whatsapp-share'
import CalendarButton from '@/components/calendar-button'
import ReportButton from '@/components/report-button'
import type { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()

  const { data: event } = await supabase
    .from('events')
    .select('title, description, location, event_date, cover_image_url, community:communities(name)')
    .eq('id', id)
    .single()

  if (!event) {
    return { title: 'Etkinlik bulunamadı' }
  }

  const communityName = (event.community as any)?.name ?? 'literaslab'
  const eventDateStr = new Date(event.event_date).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
  const desc = event.description
    ? event.description.slice(0, 160)
    : `${communityName} · ${eventDateStr}${event.location ? ' · ' + event.location : ''}`

  const images = event.cover_image_url ? [event.cover_image_url] : []

  return {
    title: event.title,
    description: desc,
    openGraph: {
      title: event.title,
      description: desc,
      type: 'article',
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title: event.title,
      description: desc,
      images,
    },
  }
}

export const dynamic = 'force-dynamic'

// Kategori → yumuşak fon rengi (EventCard ile aynı)
const CATEGORY_BG: Record<string, string> = {
  kitap:       '#F5E9D0',
  'doğa':      '#DDE9D5',
  'müzik':     '#E7DBEB',
  lezzet:      '#F3D8CE',
  dil:         '#DCE4EE',
  spor:        '#E5E0D2',
  sanat:       '#EFD9DC',
  oyun:        '#DFE8DE',
  tech:        '#DAE0E6',
  sinema:      '#E4DED4',
  'fotoğraf':  '#E0DEDC',
  'gönüllülük':'#E1EBDA',
  kariyer:     '#E5DED0',
  sosyal:      '#EBDFD3',
  default:     '#E8E4D8',
}

const MONTHS_TR_FULL = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
const MONTHS_TR_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
const DAYS_TR_LONG = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']

// Kategori ikonu (EventCard'daki ile aynı, sadece burada tek yerde kullanılıyor)
function CategoryIcon({ slug, size = 120 }: { slug: string; size?: number }) {
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
    case 'tech':
      return <svg {...common}><rect width="18" height="12" x="3" y="4" rx="2"/><line x1="2" x2="22" y1="20" y2="20"/></svg>
    case 'sinema':
      return <svg {...common}><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/></svg>
    case 'fotoğraf':
      return <svg {...common}><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
    case 'sosyal':
      return <svg {...common}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    default:
      return <svg {...common}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
  }
}

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
      organizer:profiles!organizer_id(id, name, avatar_url),
      community:communities!community_id(id, name, city, category)
    `)
    .eq('id', id)
    .single()

  if (!event) {
    notFound()
  }

  const { data: rsvps } = await supabase
    .from('rsvps')
    .select(`id, user:profiles!user_id(id, name, avatar_url)`)
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
  const dayNum = date.getDate()
  const monthShort = MONTHS_TR_SHORT[date.getMonth()]
  const monthFull = MONTHS_TR_FULL[date.getMonth()]
  const year = date.getFullYear()
  const dayName = DAYS_TR_LONG[date.getDay()]
  const hours = date.getHours().toString().padStart(2, '0')
  const mins = date.getMinutes().toString().padStart(2, '0')
  const timeStr = `${hours}:${mins}`
  const longDate = `${dayName}, ${dayNum} ${monthFull} ${year}`

  const hasImage = !!event.cover_image_url
  const category = (event.community as any)?.category ?? 'default'
  const bg = CATEGORY_BG[category] ?? CATEGORY_BG.default

  const attendeeCount = rsvps?.length ?? 0
  const isFull = event.max_attendees ? attendeeCount >= event.max_attendees : false

  return (
    <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '24px 24px 80px' }}>
      {/* Geri linki */}
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

      {/* HERO — büyük görsel veya kategori fallback */}
      <div style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '21 / 9',
        overflow: 'hidden',
        borderRadius: '20px',
        background: hasImage ? 'transparent' : bg,
        marginBottom: '32px',
      }}>
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.cover_image_url}
            alt={event.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
          }}>
            <CategoryIcon slug={category} size={140} />
          </div>
        )}
      </div>

      {/* 2 sütun grid */}
      <div className="event-detail-grid" style={{
        display: 'grid',
        gap: '40px',
        alignItems: 'start',
      }}>
        {/* SOL — ana içerik */}
        <div style={{ minWidth: 0 }}>
          {/* Topluluk chip'i */}
          {event.community && (
            <Link
              href={`/community/${event.community.id}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: '999px',
                background: 'rgba(30, 58, 43, 0.06)',
                color: 'var(--ink)',
                fontSize: '12.5px',
                fontWeight: 600,
                fontFamily: "'IBM Plex Mono', monospace",
                textDecoration: 'none',
                marginBottom: '16px',
              }}
            >
              {event.community.name}
            </Link>
          )}

          {/* Başlık — büyük ve sans, bold */}
          <h1 style={{
            fontFamily: "'Schibsted Grotesk', system-ui, -apple-system, sans-serif",
            fontSize: 'clamp(30px, 4vw, 44px)',
            fontWeight: 800,
            lineHeight: 1.15,
            color: 'var(--ink)',
            letterSpacing: '-0.02em',
            margin: '0 0 12px',
          }}>
            {event.title}
          </h1>

          {/* Düzenleyen */}
          {event.organizer?.name && (
            <p style={{
              fontSize: '14.5px',
              color: 'var(--muted)',
              marginBottom: '28px',
            }}>
              <Link href={`/profile/${event.organizer.id}`} style={{
                color: 'var(--ink)',
                fontWeight: 600,
                textDecoration: 'none',
              }}>
                {event.organizer.name}
              </Link>
              {' tarafından'}
            </p>
          )}

          {/* Açıklama */}
          {event.description && (
            <div style={{
              fontSize: '16px',
              lineHeight: 1.7,
              color: 'var(--ink)',
              whiteSpace: 'pre-wrap',
              marginBottom: '32px',
            }}>
              {event.description}
            </div>
          )}

          {/* Harita */}
          {event.location && (
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{
                fontFamily: "'Schibsted Grotesk', system-ui, sans-serif",
                fontSize: '18px',
                fontWeight: 700,
                color: 'var(--ink)',
                marginBottom: '12px',
              }}>
                Konum
              </h3>
              <p style={{
                fontSize: '14.5px',
                color: 'var(--muted)',
                marginBottom: '12px',
              }}>
                📍 {event.location}
              </p>
              <EventMap
                location={event.location}
                city={(event.community as any)?.city}
              />
            </div>
          )}

          {/* Yönetici aksiyonları */}
          {canManage && (
            <div style={{ marginBottom: '32px' }}>
              <EventActions eventId={event.id} />
            </div>
          )}

          {/* Katılımcılar (sol altta gösterelim) */}
          <div style={{ marginTop: '40px' }}>
            <h3 style={{
              fontFamily: "'Schibsted Grotesk', system-ui, sans-serif",
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--ink)',
              marginBottom: '16px',
            }}>
              Katılımcılar
              <span style={{
                marginLeft: '10px',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--muted)',
              }}>
                {attendeeCount}{event.max_attendees ? ` / ${event.max_attendees}` : ''}
              </span>
            </h3>
            {rsvps && rsvps.length > 0 ? (
              <ul style={{
                listStyle: 'none',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                padding: 0,
                margin: 0,
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
            ) : (
              <p style={{
                fontSize: '14px',
                color: 'var(--muted)',
                fontStyle: 'italic',
              }}>
                Henüz katılan yok — sen ilk ol.
              </p>
            )}
          </div>
        </div>

        {/* SAĞ — sticky sidebar */}
        <aside className="event-sidebar">
          <div style={{
            position: 'sticky',
            top: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            {/* Tarih kartı — büyük gün numarası */}
            <div style={{
              background: 'var(--paper-cream)',
              border: '1.5px solid var(--border)',
              borderRadius: '16px',
              padding: '20px',
              display: 'flex',
              gap: '18px',
              alignItems: 'center',
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minWidth: '58px',
                padding: '8px 10px',
                borderRadius: '10px',
                border: '1.5px solid var(--ink)',
                background: 'transparent',
              }}>
                <div style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '10.5px',
                  fontWeight: 700,
                  color: 'var(--moss, #3E6B54)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}>
                  {monthShort}
                </div>
                <div className="serif" style={{
                  fontSize: '26px',
                  fontWeight: 500,
                  color: 'var(--ink)',
                  lineHeight: 1,
                  marginTop: '2px',
                }}>
                  {dayNum}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: 'var(--ink)',
                  marginBottom: '2px',
                }}>
                  {longDate}
                </div>
                <div style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '12.5px',
                  color: 'var(--muted)',
                }}>
                  {timeStr}'de başlar
                </div>
              </div>
            </div>

            {/* Ücretsiz + katılım */}
            <div style={{
              background: 'var(--paper-cream)',
              border: '1.5px solid var(--border)',
              borderRadius: '16px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: 'var(--ink)',
                }}>
                  Ücretsiz
                </span>
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '12px',
                  color: 'var(--muted)',
                }}>
                  {attendeeCount} katılımcı
                </span>
              </div>

              {/* RSVP alanı */}
              {!user ? (
                <Link
                  href="/login"
                  className="btn-primary"
                  style={{ textAlign: 'center', textDecoration: 'none', width: '100%' }}
                >
                  Katılmak için giriş yap
                </Link>
              ) : isOrganizer ? (
                <p style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  color: 'var(--muted)',
                  fontSize: '13px',
                  textAlign: 'center',
                  margin: 0,
                }}>
                  ✿ bu etkinliği sen düzenliyorsun
                </p>
              ) : !isApprovedMember && event.community ? (
                <>
                  <p style={{
                    fontSize: '13.5px',
                    color: 'var(--ink)',
                    lineHeight: 1.5,
                    margin: 0,
                  }}>
                    Katılmak için önce{' '}
                    <strong>{event.community.name}</strong>{' '}
                    topluluğunun üyesi olmalısın.
                  </p>
                  <Link
                    href={`/community/${event.community.id}`}
                    className="btn-primary"
                    style={{ textAlign: 'center', textDecoration: 'none', width: '100%' }}
                  >
                    Topluluğa git
                  </Link>
                </>
              ) : (
                <RsvpForm
                  eventId={event.id}
                  userId={user.id}
                  userHasRsvp={userHasRsvp || false}
                  isFull={isFull}
                />
              )}
            </div>
          </div>
          <div style={{ marginTop: '20px' }}>
          <WhatsappShare
            title={event.title}
            eventDateStr={`${longDate}, ${timeStr}`}
            location={event.location}
          />
          <div style={{ marginTop: '12px' }}>
              <CalendarButton
                eventId={event.id}
                title={event.title}
                description={event.description || ''}
                location={event.location}
                eventDateIso={event.event_date}
              />
            </div>
        </div>
        {user && user.id !== event.organizer_id && (
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <ReportButton targetType="event" targetId={event.id} />
            </div>
          )}
        </aside>
      </div>

      <style>{`
        .event-detail-grid {
          grid-template-columns: 1fr;
        }
        @media (min-width: 900px) {
          .event-detail-grid {
            grid-template-columns: 1fr 340px;
          }
        }
      `}</style>
    </div>
  )
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
