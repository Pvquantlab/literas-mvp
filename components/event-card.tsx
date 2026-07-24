import Link from 'next/link'
import CategoryIcon, { categoryGradient } from './category-icon'

type Event = {
  id: string
  title: string
  location: string
  event_date: string
  cover_image_url: string | null
  max_attendees?: number | null
  community?: { name: string; category?: string | null } | null
  // Supabase embed: rsvps(count) → [{ count: n }]
  rsvps?: { count: number }[] | null
}

type Props = {
  event: Event
  showCommunityName?: boolean
}

const MONTHS_TR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

export default function EventCard({ event, showCommunityName = true }: Props) {
  const hasImage = !!event.cover_image_url
  const category = event.community?.category ?? 'default'

  const d = new Date(event.event_date)
  const dayNum = d.getDate()
  const monthShort = MONTHS_TR[d.getMonth()]

  // Katılımcı sayısı yalnızca sorguya rsvps(count) eklendiyse gösterilir
  const attendeeCount = event.rsvps ? event.rsvps[0]?.count ?? 0 : null
  const isFull =
    attendeeCount !== null && event.max_attendees != null
      ? attendeeCount >= event.max_attendees
      : false

  return (
    <Link
      href={`/event/${event.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white transition-all duration-200 hover:-translate-y-1 hover:border-transparent hover:shadow-[0_16px_40px_rgba(23,32,43,.12)]"
    >
      {/* Kapak — görsel veya kategori gradyanı */}
      <div
        className="relative h-[158px] overflow-hidden"
        style={{ background: hasImage ? undefined : categoryGradient(category) }}
      >
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.cover_image_url!}
            alt={event.title}
            loading="lazy"
            className="block h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <CategoryIcon slug={category} size={44} color="rgba(255,255,255,.92)" />
          </div>
        )}

        {/* Tarih rozeti */}
        <div className="absolute left-3 top-3 rounded-[10px] bg-white px-[11px] py-[7px] text-center leading-[1.1] shadow-md">
          <div className="text-base font-extrabold text-brand">{dayNum}</div>
          <div className="text-[10.5px] font-bold uppercase tracking-[0.4px] text-mute">{monthShort}</div>
        </div>
      </div>

      {/* Gövde */}
      <div className="flex flex-1 flex-col gap-[7px] p-[18px] pt-4">
        <h3 className="line-clamp-2 text-[16.5px] font-bold leading-[1.3] tracking-[-0.3px] text-ink">
          {event.title}
        </h3>

        {showCommunityName && event.community?.name && (
          <p className="truncate text-[13.5px] text-mute">
            {event.community.name}
          </p>
        )}
        <p className="truncate text-[13.5px] text-mute">
          {event.location}
        </p>

        <div className="mt-auto flex items-center justify-between pt-3">
          {attendeeCount !== null ? (
            <span className="text-[13px] font-medium text-body">
              {event.max_attendees != null
                ? `${attendeeCount}/${event.max_attendees} kişi`
                : `${attendeeCount} kişi`}
            </span>
          ) : (
            <span />
          )}
          {isFull ? (
            <span className="rounded-full bg-[#FDECEA] px-3 py-1.5 text-xs font-bold text-[#B3261E]">
              Doldu · liste
            </span>
          ) : (
            <span className="rounded-full bg-brand-tint px-4 py-2 text-[13px] font-bold text-brand transition group-hover:bg-brand group-hover:text-white">
              Katıl
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
