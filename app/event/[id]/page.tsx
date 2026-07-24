import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import CategoryIcon, { categoryGradient } from '@/components/category-icon'
import RsvpForm from './rsvp-form'
import AttendeeList from './attendee-list'
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

const MONTHS_TR_FULL = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
const MONTHS_TR_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
const DAYS_TR_LONG = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']

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

  const userHasRsvp = user
    ? rsvps?.some((r: any) => r.user?.id === user.id)
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

  const attendeeCount = rsvps?.length ?? 0
  const isFull = event.max_attendees ? attendeeCount >= event.max_attendees : false

  return (
    <div className="mx-auto max-w-[1120px] px-6 pb-20 pt-6">
      {/* Geri linki */}
      <Link
        href="/kesfet"
        className="mb-5 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-mute transition hover:text-brand"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M11 18l-6-6 6-6" />
        </svg>
        Tüm etkinlikler
      </Link>

      {/* HERO — büyük görsel veya kategori gradyanı */}
      <div
        className="relative mb-8 aspect-[21/9] w-full overflow-hidden rounded-[20px] max-[640px]:aspect-[16/9]"
        style={{ background: hasImage ? undefined : categoryGradient(category) }}
      >
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.cover_image_url}
            alt={event.title}
            className="block h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <CategoryIcon slug={category} size={96} color="rgba(255,255,255,.9)" />
          </div>
        )}
      </div>

      {/* 2 sütun grid */}
      <div className="grid items-start gap-10 min-[900px]:grid-cols-[1fr_340px]">
        {/* SOL — ana içerik */}
        <div className="min-w-0">
          {/* Topluluk chip'i */}
          {event.community && (
            <Link
              href={`/community/${event.community.id}`}
              className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-brand-tint px-3.5 py-[7px] text-[13px] font-bold text-brand transition hover:bg-[#F7DFCF]"
            >
              {event.community.name}
            </Link>
          )}

          {/* Başlık */}
          <h1 className="mb-3 text-[30px] font-extrabold leading-[1.15] tracking-[-0.8px] text-ink min-[640px]:text-[40px] min-[640px]:tracking-[-1px]">
            {event.title}
          </h1>

          {/* Düzenleyen */}
          {organizer?.name && (
            <p className="mb-7 text-[14.5px] text-mute">
              <Link href={`/profile/${organizer.id}`} className="font-semibold text-ink hover:text-brand">
                {organizer.name}
              </Link>
              {' tarafından düzenleniyor'}
            </p>
          )}

          {/* Açıklama */}
          {event.description && (
            <div className="mb-8 whitespace-pre-wrap text-base leading-[1.7] text-ink">
              {event.description}
            </div>
          )}

          {/* Harita */}
          {event.location && (
            <div className="mb-8">
              <h3 className="mb-3 text-lg font-bold text-ink">Konum</h3>
              <p className="mb-3 flex items-center gap-1.5 text-[14.5px] text-mute">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {event.location}
              </p>
              <EventMap
                location={event.location}
                city={(event.community as any)?.city}
              />
            </div>
          )}

          {/* Yönetici aksiyonları */}
          {canManage && (
            <div className="mb-8">
              <EventActions eventId={event.id} />
            </div>
          )}

          <AttendeeList
            eventId={event.id}
            initialAttendees={(rsvps as any) ?? []}
            maxAttendees={event.max_attendees ?? null}
          />
        </div>

        {/* SAĞ — sticky sidebar */}
        <aside>
          <div className="sticky top-6 flex flex-col gap-4">
            {/* Tarih kartı */}
            <div className="flex items-center gap-[18px] rounded-2xl border border-line bg-white p-5">
              <div className="flex min-w-[58px] flex-col items-center rounded-[10px] border border-line bg-warm px-2.5 py-2">
                <div className="text-[10.5px] font-bold uppercase tracking-[0.8px] text-mute">
                  {monthShort}
                </div>
                <div className="mt-[2px] text-[26px] font-extrabold leading-none text-brand">
                  {dayNum}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-[2px] text-sm font-bold text-ink">
                  {longDate}
                </div>
                <div className="text-[12.5px] text-mute">
                  {timeStr}'de başlar
                </div>
              </div>
            </div>

            {/* Ücretsiz + katılım */}
            <div className="flex flex-col gap-3.5 rounded-2xl border border-line bg-white p-5">
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-bold text-ink">Ücretsiz</span>
                <span className="text-xs text-mute">
                  {attendeeCount}{event.max_attendees ? `/${event.max_attendees}` : ''} katılımcı
                </span>
              </div>

              {/* RSVP alanı */}
              {!user ? (
                <Link
                  href="/login"
                  className="block w-full rounded-full bg-brand py-3 text-center text-[15px] font-bold text-white transition hover:bg-brand-dark"
                >
                  Katılmak için giriş yap
                </Link>
              ) : isOrganizer ? (
                <p className="py-1 text-center text-[13px] font-medium text-mute">
                  Bu etkinliği sen düzenliyorsun
                </p>
              ) : !isApprovedMember && event.community ? (
                <>
                  <p className="text-[13.5px] leading-[1.5] text-ink">
                    Katılmak için önce{' '}
                    <strong>{event.community.name}</strong>{' '}
                    topluluğunun üyesi olmalısın.
                  </p>
                  <Link
                    href={`/community/${event.community.id}`}
                    className="block w-full rounded-full bg-brand py-3 text-center text-[15px] font-bold text-white transition hover:bg-brand-dark"
                  >
                    Topluluğa git
                  </Link>
                </>
              ) : (
                <RsvpForm
                  eventId={event.id}
                  userId={user.id}
                  userHasRsvp={userHasRsvp || false}
                  userInWaitlist={userInWaitlist}
                  isFull={isFull}
                />
              )}
            </div>

            <div className="mt-1 flex flex-col gap-3">
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
              <div className="mt-1 text-center">
                <ReportButton targetType="event" targetId={event.id} />
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
