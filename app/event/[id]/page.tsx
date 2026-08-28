import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { byValue } from '@/lib/categories'
import { GlossyIcon } from '@/components/category-art'
import RsvpForm from './rsvp-form'
import CheckinQr from './checkin-qr'
import AttendeeList from './attendee-list'
import EventActions from './event-actions'
import EventMap from './event-map-client'
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
    timeZone: 'Europe/Istanbul',
  })
  const desc = event.description
    ? event.description.slice(0, 160)
    : `${communityName} · ${eventDateStr}${event.location ? ' · ' + event.location : ''}`

  // Bos dizi Next.js'e "gorsel istemiyorum" demek ve dosya tabanli
  // opengraph-image.tsx'in otomatik eklenmesini bastiriyordu. undefined
  // olunca Next kendi urettigi gorseli ekliyor.
  // openGraph nesnesini elle tanimlayinca Next.js dosya tabanli
  // opengraph-image.tsx'i otomatik EKLEMIYOR — images degeri ne olursa olsun.
  // Bu yuzden elle veriyoruz. metadataBase layout.tsx'te tanimli oldugu icin
  // goreli adres mutlak adrese cevriliyor; WhatsApp'in ihtiyaci olan da bu.
  const images = event.cover_image_url
    ? [event.cover_image_url]
    : [`/event/${id}/opengraph-image`]

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

const MONTHS_TR_FULL = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
const MONTHS_TR_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

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
      community:communities!community_id(id, name, city, category)
    `)
    .eq('id', id)
    .single()

  if (!event) {
    notFound()
  }

  // Organizatör bilgisi herkese açık vitrinden (e-posta vb. özel alanlar kapalı)
  const { data: organizer } = await supabase
    .from('public_profiles')
    .select('id, name, avatar_url')
    .eq('id', event.organizer_id)
    .maybeSingle()

  const { data: rsvpRows } = await supabase
    .from('rsvps')
    .select('id, user_id')
    .eq('event_id', id)
    .order('created_at', { ascending: true })

  // Katılımcı profilleri vitrinden toplu çekilip rsvp satırlarına bağlanır
  const attendeeIds = (rsvpRows ?? []).map((r: any) => r.user_id).filter(Boolean)
  const { data: attendeeProfiles } = attendeeIds.length > 0
    ? await supabase
        .from('public_profiles')
        .select('id, name, avatar_url')
        .in('id', attendeeIds)
    : { data: [] as any[] }
  const profileById = new Map((attendeeProfiles ?? []).map((p: any) => [p.id, p]))
  const rsvps = (rsvpRows ?? []).map((r: any) => ({
    id: r.id,
    user: profileById.get(r.user_id) ?? null,
  }))

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

  // Ham rsvp satirina bakiyoruz, birlestirilmis profile degil: profil
  // vitrinden gelmezse kullanici kendi katilimini goremiyordu.
  const userHasRsvp = user
    ? (rsvpRows ?? []).some((r: any) => r.user_id === user.id)
    : false
  // Kullanici waitlist'te mi?
  let userInWaitlist = false
  if (user) {
    const { data: myWaitlist } = await supabase
      .from('waitlist')
      .select('id')
      .eq('event_id', id)
      .eq('user_id', user.id)
      .is('promoted_at', null)
      .maybeSingle()
    userInWaitlist = !!myWaitlist
  }

  const isOrganizer = user?.id === event.organizer_id
  const canManage = isOrganizer || isCommunityModerator

  // Topluluğun diğer yaklaşan etkinlikleri — kenar kolonundaki liste için
  // (Luma'daki "Upcoming Events" karşılığı). Bu etkinlik hariç, en yakın 4.
  const { data: otherEvents } = event.community_id
    ? await supabase
        .from('events')
        .select('id, title, event_date')
        .eq('community_id', event.community_id)
        .neq('id', id)
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true })
        .limit(4)
    : { data: [] as any[] }

  // Sunucu UTC'de calisiyor. getDate/getHours sunucunun yerel saatini
  // kullaniyor ve canlida 3 saat kayma uretiyordu: WhatsApp metninde
  // 11:17, gorselde 14:17. Parcalari Istanbul saatinden aliyoruz.
  const _parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(event.event_date))
  const _p = (t: string) => _parts.find((x) => x.type === t)?.value ?? '0'

  const dayNum = Number(_p('day'))
  const monthIdx = Number(_p('month')) - 1
  const monthShort = MONTHS_TR_SHORT[monthIdx]
  const monthFull = MONTHS_TR_FULL[monthIdx]
  const year = Number(_p('year'))
  const dayName = new Date(event.event_date).toLocaleDateString('tr-TR', {
    weekday: 'long',
    timeZone: 'Europe/Istanbul',
  })
  const timeStr = `${_p('hour')}:${_p('minute')}`
  const longDate = `${dayName}, ${dayNum} ${monthFull} ${year}`

  const hasImage = !!event.cover_image_url
  const cat = byValue((event.community as any)?.category ?? null)
  const c2 = cat?.colors[1] ?? '#2B6FD4'

  // Sayi rsvps dizisinden degil events.attendee_count sutunundan gelir.
  // rsvps anonim kullaniciya kapali oldugu icin dizi bos donuyor ve
  // sayac 0 gosteriyordu. Sutun trigger ile guncel tutuluyor.
  const attendeeCount = (event as any).attendee_count ?? 0
  const isFull = event.max_attendees ? attendeeCount >= event.max_attendees : false
  const spotsLeft = event.max_attendees ? Math.max(event.max_attendees - attendeeCount, 0) : null

  return (
    <main id="content">
      {/* ============ ÜST ŞERİT ============
          Koyu zemin + ince ızgara. Solda kimlik + tarih/konum, sağda kapak.
          Kart diliyle aynı koyu tonlar (event-card.tsx). */}
      <section className="ed-hero">
        <div className="ed-hero-in">
          <div className="ed-head">
            <Link href="/" className="ed-back">← tüm etkinlikler</Link>

            {event.community && (
              <Link href={`/community/${event.community.id}`} className="ed-chip">
                {cat && <GlossyIcon value={cat.slug} size={16} />}
                {event.community.name}
              </Link>
            )}

            <h1 className="ed-title">{event.title}</h1>

            <div className="ed-meta">
              <span className="ed-cal" aria-hidden="true">
                <b>{monthShort}</b>
                <i>{dayNum}</i>
              </span>
              <span className="ed-meta-txt">
                <b>{longDate}</b>
                <i>{timeStr}&apos;de başlar · Europe/Istanbul</i>
              </span>
            </div>

            {event.location && (
              <div className="ed-meta">
                <span className="ed-pin" aria-hidden="true">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                </span>
                <span className="ed-meta-txt">
                  <b>{event.location}</b>
                  {(event.community as any)?.city && <i>{(event.community as any).city}</i>}
                </span>
              </div>
            )}

            {organizer?.name && (
              <p className="ed-org">
                <Link href={`/profile/${organizer.id}`}>{organizer.name}</Link> tarafından
              </p>
            )}
          </div>

          <div className="ed-cover">
            {hasImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={event.cover_image_url} alt={event.title} />
            ) : (
              <span className="ed-cover-art">
                <span className="ed-cover-glow" style={{ background: c2 }} />
                <svg viewBox="0 0 200 150" aria-hidden="true">
                  <defs>
                    <linearGradient id="ed-top" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#3A4050" />
                      <stop offset="100%" stopColor="#22262F" />
                    </linearGradient>
                    <linearGradient id="ed-side" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#272B35" />
                      <stop offset="100%" stopColor="#14161C" />
                    </linearGradient>
                  </defs>
                  <polygon points="100,58 168,90 168,104 100,136 32,104 32,90" fill="none" stroke={c2} strokeWidth="3" opacity=".5" />
                  <polygon points="46,96 100,124 100,138 46,110" fill="url(#ed-side)" />
                  <polygon points="154,96 100,124 100,138 154,110" fill="url(#ed-side)" opacity=".8" />
                  <polygon points="100,70 154,96 100,124 46,96" fill="url(#ed-top)" />
                </svg>
                <span className="ed-cover-icon">
                  <GlossyIcon value={(event.community as any)?.category ?? null} size={92} />
                </span>
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ============ GÖVDE: iki kolon ============ */}
      <div className="ed-body">
        <div className="ed-grid">
          {/* ---- SOL: içerik ---- */}
          <div className="ed-main">
            {/* Kayıt kartı — Luma düzeni: başlık çubuğu + mesaj + tam genişlik buton */}
            <section className="ed-reg">
              <div className="ed-reg-head">
                <span>Kayıt</span>
                <span className="ed-reg-count">
                  Ücretsiz · {attendeeCount} katılımcı
                  {spotsLeft !== null && !isFull && ` · ${spotsLeft} yer kaldı`}
                  {isFull && ' · doldu'}
                </span>
              </div>
              <div className="ed-reg-body">
                {!user ? (
                  <>
                    <p className="ed-reg-msg">
                      Hoş geldin! Etkinliğe katılmak için giriş yapman yeterli.
                    </p>
                    <Link href="/login" className="btn-primary ed-cta">
                      Katılmak için giriş yap
                    </Link>
                  </>
                ) : isOrganizer ? (
                  <p className="ed-note">bu etkinliği sen düzenliyorsun</p>
                ) : !isApprovedMember && event.community ? (
                  <>
                    <p className="ed-reg-msg">
                      Katılmak için önce <strong>{event.community.name}</strong> topluluğunun
                      üyesi olmalısın.
                    </p>
                    <Link href={`/community/${event.community.id}`} className="btn-primary ed-cta">
                      Topluluğa git
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="ed-reg-msg">
                      Hoş geldin! Aşağıdan katılımını işaretleyebilirsin.
                    </p>
                    <RsvpForm
                      eventId={event.id}
                      userHasRsvp={userHasRsvp || false}
                      userInWaitlist={userInWaitlist}
                      isFull={isFull}
                    />
                    {userHasRsvp && <CheckinQr eventId={event.id} />}
                  </>
                )}
              </div>
            </section>

            {event.description && (
              <section className="ed-block">
                <h2 className="ed-h2">Etkinlik hakkında</h2>
                <div className="ed-desc">{event.description}</div>
              </section>
            )}

            {event.location && (
              <section className="ed-block">
                <h2 className="ed-h2">Konum</h2>
                <p className="ed-loc">{event.location}</p>
                <EventMap
                  location={event.location}
                  city={(event.community as any)?.city}
                />
              </section>
            )}

            {canManage && (
              <section className="ed-block">
                <h2 className="ed-h2">Yönetim</h2>
                <EventActions eventId={event.id} />
                <Link href={`/event/${event.id}/checkin`} style={{ color: 'var(--ink)', fontWeight: 700 }}>
                  Girişleri yönet
                </Link>
              </section>
            )}

            <section className="ed-block">
              <AttendeeList
                eventId={event.id}
                initialAttendees={(rsvps as any) ?? []}
                initialCount={attendeeCount}
                canSeeNames={!!user}
                maxAttendees={event.max_attendees ?? null}
              />
            </section>
          </div>

          {/* ---- SAĞ: yapışkan kenar ---- */}
          <aside className="ed-side">
            <div className="ed-sticky">
              {/* Düzenleyen topluluk */}
              {event.community && (
                <Link href={`/community/${event.community.id}`} className="ed-card ed-comm">
                  <span className="ed-comm-icon">
                    <GlossyIcon value={(event.community as any)?.category ?? null} size={34} />
                  </span>
                  <span className="ed-comm-txt">
                    <b>{event.community.name}</b>
                    <i>Topluluğa git →</i>
                  </span>
                </Link>
              )}

              {/* Topluluğun diğer yaklaşan etkinlikleri */}
              {(otherEvents ?? []).length > 0 && (
                <div className="ed-card ed-up">
                  <h2 className="ed-up-h">Topluluğun diğer etkinlikleri</h2>
                  <ul className="ed-up-list">
                    {(otherEvents ?? []).map((oe: any) => {
                      const op = new Intl.DateTimeFormat('en-CA', {
                        timeZone: 'Europe/Istanbul', month: 'numeric', day: 'numeric',
                      }).formatToParts(new Date(oe.event_date))
                      const og = (t: string) => op.find((x) => x.type === t)?.value ?? '0'
                      const oMon = MONTHS_TR_SHORT[Number(og('month')) - 1]
                      return (
                        <li key={oe.id}>
                          <Link href={`/event/${oe.id}`} className="ed-up-row">
                            <span className="ed-up-cal" aria-hidden="true">
                              <b>{oMon}</b>
                              <i>{Number(og('day'))}</i>
                            </span>
                            <span className="ed-up-title">{oe.title}</span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

              {/* Paylaşım ve takvim */}
              <div className="ed-tools">
                <WhatsappShare
                  title={event.title}
                  eventDateStr={`${longDate}, ${timeStr}`}
                  location={event.location}
                />
                <CalendarButton
                  eventId={event.id}
                  title={event.title}
                  description={event.description || ''}
                  location={event.location}
                  eventDateIso={event.event_date}
                />
              </div>

              {user && user.id !== event.organizer_id && (
                <div className="ed-report">
                  <ReportButton targetType="event" targetId={event.id} />
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      <style>{`
        /* ---------- Üst şerit ---------- */
        .ed-hero {
          background-color: #14171F;
          background-image:
            linear-gradient(rgba(79, 195, 184, .07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(79, 195, 184, .07) 1px, transparent 1px);
          background-size: 24px 24px;
          border-bottom: 1.5px solid rgba(43, 111, 212, .5);
          color: #EDF1FA;
        }
        .ed-hero-in {
          max-width: var(--w-page);
          margin: 0 auto;
          padding: var(--s-6) var(--s-5) var(--s-7);
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(0, .85fr);
          gap: var(--s-7);
          align-items: center;
        }
        .ed-back {
          display: inline-block;
          font-family: var(--font-mono), monospace;
          font-size: var(--t-sm);
          color: #8B95AD;
          margin-bottom: var(--s-5);
        }
        .ed-back:hover { color: #C3CBDD; }
        .ed-chip {
          display: inline-flex; align-items: center; gap: 7px;
          font-size: var(--t-xs); font-weight: 600; color: #D6DDEC;
          background: rgba(255,255,255,.09);
          border: 1px solid rgba(255,255,255,.13);
          padding: 5px 12px 5px 6px; border-radius: var(--r-pill);
          max-width: 100%;
        }
        .ed-chip:hover { color: #fff; border-color: rgba(255,255,255,.3); }
        .ed-title {
          font-family: var(--font-sans), 'Segoe UI', system-ui, sans-serif;
          font-weight: 700;
          font-size: clamp(30px, 4.4vw, 52px);
          line-height: 1.06;
          letter-spacing: -.032em;
          color: #FFFFFF;
          margin: var(--s-4) 0 var(--s-5);
          text-wrap: balance;
        }
        .ed-meta {
          display: flex; align-items: center; gap: var(--s-3);
          margin-top: var(--s-3);
        }
        .ed-cal {
          flex: none; display: grid; place-items: center;
          width: 46px; padding: 6px 0; border-radius: 10px;
          background: #272C38; line-height: 1.1;
        }
        .ed-cal b { font-family: var(--font-mono), monospace; font-size: 9px; letter-spacing: .08em; color: #9AA5BE; text-transform: uppercase; }
        .ed-cal i { font-style: normal; font-size: 19px; font-weight: 700; color: #fff; }
        .ed-pin {
          flex: none; display: grid; place-items: center;
          width: 46px; height: 46px; border-radius: 10px;
          background: #272C38; color: #9AA5BE;
        }
        .ed-meta-txt { display: flex; flex-direction: column; min-width: 0; }
        .ed-meta-txt b { font-size: var(--t-md); font-weight: 600; color: #EDF1FA; }
        .ed-meta-txt i { font-style: normal; font-size: var(--t-xs); color: #8B95AD; }
        .ed-org { margin-top: var(--s-5); font-size: var(--t-sm); color: #8B95AD; }
        .ed-org a { color: #D6DDEC; font-weight: 600; }
        .ed-org a:hover { color: #fff; }

        .ed-cover {
          border-radius: var(--r-lg);
          overflow: hidden;
          aspect-ratio: 4 / 3;
          position: relative;
          background: #1B1F29;
          border: 1px solid #232733;
        }
        .ed-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .ed-cover-art { position: absolute; inset: 0; display: block; }
        .ed-cover-glow {
          position: absolute; right: -12%; top: -38%;
          width: 80%; aspect-ratio: 1; border-radius: 50%;
          filter: blur(52px); opacity: .4;
        }
        .ed-cover-art > svg { position: absolute; left: 50%; top: 56%; width: 78%; transform: translate(-50%, -50%); }
        .ed-cover-icon {
          position: absolute; left: 50%; top: 34%; transform: translate(-50%, -50%);
          filter: drop-shadow(0 14px 18px rgba(0,0,0,.55));
        }

        /* ---------- Gövde ---------- */
        .ed-body {
          max-width: var(--w-page);
          margin: 0 auto;
          padding: var(--s-7) var(--s-5) var(--s-9);
        }
        .ed-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: var(--s-7);
          align-items: start;
        }
        @media (min-width: 900px) {
          .ed-grid { grid-template-columns: minmax(0, 1fr) 340px; }
        }

        .ed-block { margin-top: var(--s-7); }
        .ed-main > .ed-block:first-child { margin-top: 0; }

        /* Luma'daki gibi: başlığın altında bölümü açan ince çizgi. */
        .ed-h2 {
          font-family: var(--font-sans), system-ui, sans-serif;
          font-size: var(--t-lg);
          font-weight: 700;
          letter-spacing: -.02em;
          color: var(--ink);
          padding-bottom: var(--s-3);
          border-bottom: 1px solid var(--border-mid);
          margin-bottom: var(--s-4);
        }

        /* ---------- Kayıt kartı (Luma düzeni) ---------- */
        .ed-reg {
          border: 1px solid var(--border);
          border-radius: var(--r-lg);
          overflow: hidden;
          background: var(--paper-cream);
          box-shadow: var(--shadow-lift);
        }
        .ed-reg-head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: var(--s-3);
          padding: var(--s-3) var(--s-5);
          background: var(--paper-soft);
          border-bottom: 1px solid var(--border);
          font-size: var(--t-sm);
          font-weight: 600;
          color: var(--ink);
        }
        .ed-reg-count {
          font-family: var(--font-mono), monospace;
          font-size: var(--t-xs);
          font-weight: 500;
          color: var(--muted);
          text-align: right;
        }
        .ed-reg-body {
          padding: var(--s-5);
          display: flex;
          flex-direction: column;
          gap: var(--s-4);
        }
        .ed-reg-msg {
          font-size: var(--t-md);
          color: var(--night);
          line-height: 1.55;
          margin: 0;
        }
        .ed-desc {
          font-size: 16px;
          line-height: 1.7;
          color: var(--night);
          white-space: pre-wrap;
        }
        .ed-loc { font-size: var(--t-sm); color: var(--muted); margin-bottom: var(--s-3); }

        /* ---------- Kenar ---------- */
        .ed-sticky {
          position: sticky; top: var(--s-5);
          display: flex; flex-direction: column; gap: var(--s-4);
        }
        .ed-card {
          background: var(--paper-cream);
          border: 1px solid var(--border);
          border-radius: var(--r-lg);
          padding: var(--s-5);
          display: flex; flex-direction: column; gap: var(--s-4);
        }
        .ed-cta { text-align: center; width: 100%; }
        .ed-note { font-family: var(--font-mono), monospace; font-size: var(--t-sm); color: var(--muted); text-align: center; margin: 0; }

        .ed-comm { flex-direction: row; align-items: center; gap: var(--s-3); text-decoration: none; }
        .ed-comm:hover { border-color: var(--border-mid); }
        .ed-comm-icon { flex: none; }
        .ed-comm-txt { display: flex; flex-direction: column; min-width: 0; }
        .ed-comm-txt b { font-size: var(--t-md); font-weight: 600; color: var(--ink); }
        .ed-comm-txt i { font-style: normal; font-size: var(--t-xs); color: var(--muted); }

        .ed-tools { display: flex; flex-direction: column; gap: var(--s-3); }

        /* ---------- Diğer etkinlikler ---------- */
        .ed-up { gap: var(--s-3); }
        .ed-up-h {
          font-size: var(--t-sm);
          font-weight: 600;
          color: var(--ink);
          padding-bottom: var(--s-2);
          border-bottom: 1px solid var(--border);
        }
        .ed-up-list { list-style: none; display: flex; flex-direction: column; gap: var(--s-2); }
        .ed-up-row {
          display: flex; align-items: center; gap: var(--s-3);
          padding: 6px 8px; margin: 0 -8px;
          border-radius: var(--r-md);
          text-decoration: none;
          transition: background .15s var(--ease);
        }
        .ed-up-row:hover { background: var(--paper-soft); }
        .ed-up-cal {
          flex: none; display: grid; place-items: center;
          width: 40px; padding: 4px 0; border-radius: 9px;
          background: var(--paper-soft); border: 1px solid var(--border);
          line-height: 1.1;
        }
        .ed-up-cal b { font-family: var(--font-mono), monospace; font-size: 8.5px; letter-spacing: .08em; color: var(--muted); text-transform: uppercase; }
        .ed-up-cal i { font-style: normal; font-size: 15px; font-weight: 700; color: var(--ink); }
        .ed-up-title {
          font-size: var(--t-sm); font-weight: 600; color: var(--ink);
          overflow: hidden; text-overflow: ellipsis;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
        }
        .ed-report { text-align: center; }

        /* ---------- Mobil ---------- */
        @media (max-width: 900px) {
          .ed-hero-in { grid-template-columns: 1fr; gap: var(--s-5); padding-bottom: var(--s-6); }
          .ed-cover { order: -1; aspect-ratio: 16 / 9; }
          .ed-back { margin-bottom: var(--s-4); }
          .ed-title { font-size: clamp(26px, 7.5vw, 38px); }
          .ed-body { padding-top: var(--s-6); }
        }
      `}</style>
    </main>
  )
}
