import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { byValue } from '@/lib/categories'
import { GlossyIcon } from '@/components/category-art'
import { RolyefMasa, RolyefKahve, RolyefKitap, RolyefSandalye, RolyefSehir, RolyefKap } from '@/components/rolyef'
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

/**
 * Kategori -> rölyef. ANAHTAR: kanonik ASCII slug.
 *
 * DİKKAT: ham `category` değerini indeksleme. Veritabanı TÜRKÇE AKSANLI
 * değer tutuyor ('fotoğraf', 'yürüyüş'), bu tablonun anahtarları ise ASCII.
 * Ham değerle indeksleyince neredeyse her kategori masaya düşüyordu --
 * canlıda "Fotoğraf" ve "Doğa" kartları aynı rölyefi gösteriyordu.
 * byValue() eşlemeyi zaten doğru yapıyor (değer, slug, Türkçe küçültme ve
 * takma ad sırasıyla); slug'ı ondan al.
 *
 * Önceki hâli degradeli sahte 3B altıgendi (#3A4050->#22262F): parlaklık
 * dili sitenin geri kalanından kaldırılmıştı, burada kalmıştı.
 */
const ROLYEF: Record<string, (p: { className?: string; style?: React.CSSProperties }) => React.JSX.Element> = {
  kitap: RolyefKitap, dil: RolyefKitap, sinema: RolyefKitap,
  lezzet: RolyefKahve, sosyal: RolyefKahve, kariyer: RolyefKahve,
  doga: RolyefSehir, fotograf: RolyefSehir, gonulluluk: RolyefSehir,
  muzik: RolyefSandalye, sanat: RolyefSandalye, oyun: RolyefSandalye, spor: RolyefSandalye,
}

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
  // Vitrin seri başına tek satır verdiği için bulunduğumuz serinin temsilcisi
  // de en fazla bir satır olarak gelebilir; onu aşağıda ayrıca eleriz.
  const { data: otherEventsData } = event.community_id
    ? await supabase
        .from('etkinlik_vitrin')
        .select('id, title, event_date, series_id')
        .eq('community_id', event.community_id)
        .neq('id', id)
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true })
        .limit(4)
    : { data: [] as any[] }

  const otherEvents = (otherEventsData ?? []).filter(
    (e) => !event.series_id || e.series_id !== event.series_id
  )

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
  const monthFull = MONTHS_TR_FULL[monthIdx]
  const year = Number(_p('year'))
  const dayName = new Date(event.event_date).toLocaleDateString('tr-TR', {
    weekday: 'long',
    timeZone: 'Europe/Istanbul',
  })
  const timeStr = `${_p('hour')}:${_p('minute')}`
  const longDate = `${dayName}, ${dayNum} ${monthFull} ${year}`

  const hasImage = !!event.cover_image_url

  // Sayi rsvps dizisinden degil events.attendee_count sutunundan gelir.
  // rsvps anonim kullaniciya kapali oldugu icin dizi bos donuyor ve
  // sayac 0 gosteriyordu. Sutun trigger ile guncel tutuluyor.
  const attendeeCount = (event as any).attendee_count ?? 0
  const isFull = event.max_attendees ? attendeeCount >= event.max_attendees : false
  const spotsLeft = event.max_attendees ? Math.max(event.max_attendees - attendeeCount, 0) : null

  return (
    <main id="content">
      {/* ============ KÜNYE IZGARASI ============
          Ana sayfayla aynı dil: tam genişlik 3 sütun, kağıt hücreler, sıkı
          dolgu, 4px köşe, gölge ve çerçeve YOK.
          Önceki hâli koyu bir #14171F banttı — 12 sabit hex taşıyordu ve
          paletin tamamen dışındaydı. Ölçüm referansta ne koyu bant, ne gölge,
          ne çerçeve buldu; bant o yüzden kaldırıldı, koyu tonlar değişkene
          bağlandı. */}
      <section className="ed-hero">
        {/* --- künye: kimlik + başlık --- */}
        <div className="ed-cell ed-kunye">
          <div className="ed-eyebrow ed-crumb">
            <Link href="/kesfet">← Etkinlikler</Link>
            {event.community && (
              <>
                <span aria-hidden="true">/</span>
                <Link href={`/community/${event.community.id}`}>{event.community.name}</Link>
              </>
            )}
          </div>
          <div>
            {/* Başlık ana sayfanın 24px h1'inden büyük: burada sayfanın ÖZNESİ.
                Referansın dev "WILD WEEK"i de 24px değil — o ölçüme takılmayan
                bir SVG'ydi. Ağırlık ve harf aralığı yine DNA'dan: 400, pozitif. */}
            <h1 className="ed-title">{event.title}</h1>
            {organizer?.name && (
              <p className="ed-org">
                <Link href={`/profile/${organizer.id}`}>{organizer.name}</Link> düzenliyor
              </p>
            )}
          </div>
          <RolyefKap cizim={RolyefSandalye} konum="sol-alt" olcek={0.9} opaklik={0.1} />
        </div>

        {/* --- gerçekler: ana sayfadaki "GERÇEKLER" bloğunun aynısı --- */}
        <div className="ed-cell ed-facts">
          <div className="ed-panel">
          <div className="ed-eyebrow" style={{ marginBottom: 18 }}>Gerçekler</div>
          <dl className="ed-dl">
            <div><dt>T.</dt><dd>Tarih</dd><dd>{dayNum} {monthFull} {year}</dd></div>
            <div><dt>G.</dt><dd>Gün</dd><dd>{dayName}</dd></div>
            <div><dt>S.</dt><dd>Saat</dd><dd>{timeStr}</dd></div>
            {event.location && (
              <div><dt>Y.</dt><dd>Yer</dd><dd>{event.location}</dd></div>
            )}
            {(event.community as any)?.city && (
              <div><dt>Ş.</dt><dd>Şehir</dd><dd>{(event.community as any).city}</dd></div>
            )}
            <div>
              <dt>K.</dt><dd>Katılım</dd>
              <dd>
                {attendeeCount}
                {event.max_attendees ? ` / ${event.max_attendees}` : ''}
                {isFull ? ' · doldu' : ''}
              </dd>
            </div>
          </dl>
          </div>
          <RolyefKap cizim={RolyefSehir} konum="sag-alt" olcek={0.95} opaklik={0.09} />
        </div>

        {/* --- kapak: görsel varsa görsel, yoksa rölyef --- */}
        <div className="ed-cell ed-cover">
          {hasImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.cover_image_url} alt={event.title} />
          ) : (
            <RolyefKap
              cizim={ROLYEF[byValue((event.community as any)?.category)?.slug ?? ''] ?? RolyefMasa}
              konum="orta"
              olcek={1.05}
              opaklik={0.2}
            />
          )}
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
                <EventActions eventId={event.id} seriesId={event.series_id} />
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
        /* ---------- Künye ızgarası ----------
           Ana sayfayla birebir aynı yapı: tam genişlik 3 sütun, gap ve dolgu
           8px, hücre köşesi 4px. Ortalanmış kap yok — DNA'nın yapısı bu. */
        .ed-hero {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          padding: 8px;
          font-weight: 400;
        }
        .ed-cell {
          position: relative;
          overflow: hidden;
          background: var(--paper-cream);
          border-radius: var(--r-md);
          padding: 18px 20px;
          min-height: 320px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: var(--s-5);
        }

        /* Minik mono etiket — referansın kendi etiket rolü, gövde metni değil. */
        .ed-eyebrow {
          position: relative;
          z-index: 1;
          font-family: var(--font-mono), monospace;
          font-size: 10px;
          font-weight: 400;
          letter-spacing: .16em;
          text-transform: uppercase;
          color: var(--ink);
        }
        .ed-crumb { display: flex; flex-wrap: wrap; gap: 8px; }
        .ed-crumb a { color: var(--ink); }
        .ed-crumb a:hover { color: var(--ink-deep); }
        .ed-crumb span { color: var(--muted-light); }

        .ed-kunye > div, .ed-facts > * { position: relative; z-index: 1; }

        .ed-title {
          font-family: var(--font-serif), Georgia, serif;
          font-weight: 400;
          font-size: clamp(26px, 3.2vw, 40px);
          line-height: 1.16;
          letter-spacing: .02em;
          color: var(--ink);
          margin: 0;
          text-wrap: balance;
        }
        .ed-org { margin-top: var(--s-3); font-size: 16px; color: var(--ink); }
        .ed-org a { color: var(--ink); }
        .ed-org a:hover { text-decoration: underline; }

        /* Gerçekler listesi: tek harfli alan etiketi, ad, değer. */
        /* İÇ PANEL — referansın "The Facts" kutusunun karşılığı.
           Kartın içinde ikinci yüzey: #E8E8E8, 4px köşe, 24px dolgu. */
        .ed-panel {
          position: relative;
          background: var(--panel);
          border-radius: var(--r-md);
          padding: 24px;
        }
        .ed-dl { margin: 0; display: grid; gap: 10px; align-content: start; }
        .ed-dl > div {
          display: grid;
          grid-template-columns: 20px minmax(0, auto) minmax(0, 1fr);
          gap: 10px;
          align-items: baseline;
        }
        .ed-dl dt {
          font-family: var(--font-mono), monospace;
          font-size: 10px; letter-spacing: .16em; text-transform: uppercase;
          color: var(--muted-light);
        }
        .ed-dl dd { margin: 0; font-size: 16px; color: var(--ink); }
        .ed-dl dd:last-child { color: var(--ink); text-align: right; }

        .ed-cover { padding: 0; }
        .ed-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }

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

        /* Bölüm başlığı = .h-section: 400 ağırlık, POZİTİF harf aralığı.
           Önceki hâli 700 / -.02em idi, yani DNA'nın tam tersi. */
        .ed-h2 {
          font-family: var(--font-serif), Georgia, serif;
          font-size: 18px;
          font-weight: 400;
          letter-spacing: .04em;
          line-height: 1.2;
          text-transform: uppercase;   /* ölçüldü: referansta bölüm başlıkları büyük harf */
          color: var(--ink);
          padding-bottom: var(--s-3);
          margin-bottom: var(--s-4);
        }

        /* ---------- Kayıt kartı ---------- */
        .ed-reg {
          border-radius: var(--r-md);
          overflow: hidden;
          background: var(--paper-cream);
        }
        .ed-reg-head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: var(--s-3);
          padding: var(--s-3) var(--s-5);
          background: var(--paper-soft);
          font-family: var(--font-mono), monospace;
          font-size: 10px;
          letter-spacing: .16em;
          text-transform: uppercase;
          color: var(--ink);
        }
        .ed-reg-count {
          font-family: var(--font-mono), monospace;
          font-size: 10px;
          letter-spacing: .1em;
          color: var(--muted);
          text-align: right;
          text-transform: none;
        }
        .ed-reg-body {
          padding: var(--s-5);
          display: flex;
          flex-direction: column;
          gap: var(--s-4);
        }
        .ed-reg-msg {
          font-size: 16px;
          color: var(--ink);
          line-height: 1.55;
          margin: 0;
        }
        .ed-desc {
          font-size: 16px;
          line-height: 1.7;
          color: var(--ink);
          white-space: pre-wrap;
        }
        .ed-loc { font-size: 16px; color: var(--ink); margin-bottom: var(--s-3); }

        /* ---------- Kenar ---------- */
        .ed-sticky {
          position: sticky; top: var(--s-5);
          display: flex; flex-direction: column; gap: var(--s-4);
        }
        .ed-card {
          background: var(--paper-cream);
          border-radius: var(--r-md);
          padding: var(--s-5);
          display: flex; flex-direction: column; gap: var(--s-4);
        }
        .ed-cta { text-align: center; width: 100%; }
        .ed-note {
          font-family: var(--font-mono), monospace;
          font-size: 10px; letter-spacing: .16em; text-transform: uppercase;
          color: var(--muted); text-align: center; margin: 0;
        }

        .ed-comm { flex-direction: row; align-items: center; gap: var(--s-3); text-decoration: none; }
        .ed-comm:hover { background: var(--paper-soft); }
        .ed-comm-icon { flex: none; }
        .ed-comm-txt { display: flex; flex-direction: column; min-width: 0; }
        .ed-comm-txt b { font-size: 16px; font-weight: 400; letter-spacing: .02em; color: var(--ink); }
        .ed-comm-txt i {
          font-style: normal; font-family: var(--font-mono), monospace;
          font-size: 10px; letter-spacing: .16em; text-transform: uppercase; color: var(--muted);
        }

        .ed-tools { display: flex; flex-direction: column; gap: var(--s-3); }

        /* ---------- Diğer etkinlikler ---------- */
        .ed-up { gap: var(--s-3); }
        .ed-up-h {
          font-family: var(--font-mono), monospace;
          font-size: 10px; letter-spacing: .16em; text-transform: uppercase;
          font-weight: 400;
          color: var(--ink);
          padding-bottom: var(--s-2);
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
          width: 40px; padding: 4px 0; border-radius: var(--r-sm);
          background: var(--paper-soft);
          line-height: 1.1;
        }
        .ed-up-cal b {
          font-family: var(--font-mono), monospace; font-size: 9px;
          letter-spacing: .16em; color: var(--muted); text-transform: uppercase;
        }
        .ed-up-cal i { font-style: normal; font-size: 15px; font-weight: 400; color: var(--ink); }
        .ed-up-title {
          font-size: 16px; font-weight: 400; letter-spacing: .02em; color: var(--ink);
          overflow: hidden; text-overflow: ellipsis;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
        }
        .ed-report { text-align: center; }

        /* ---------- Mobil ---------- */
        @media (max-width: 900px) {
          .ed-hero { grid-template-columns: 1fr; }
          .ed-cell { min-height: 0; }
          .ed-cover { min-height: 220px; aspect-ratio: 16 / 9; }
          .ed-title { font-size: clamp(24px, 6.5vw, 34px); }
          .ed-body { padding-top: var(--s-6); }
        }
      `}</style>
    </main>
  )
}
