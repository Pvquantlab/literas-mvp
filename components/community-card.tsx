import Link from 'next/link'
import CategoryIcon, { categoryGradient, categoryLabel } from './category-icon'

type Community = {
  id: string
  name: string
  category: string | null
  city: string | null
  cover_image_url: string | null
  memberCount?: number | null
}

export default function CommunityCard({ community }: { community: Community }) {
  const hasImage = !!community.cover_image_url
  const category = community.category ?? 'default'
  const catLabel = categoryLabel(community.category)

  return (
    <Link
      href={`/community/${community.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(23,32,43,.12)]"
    >
      {/* Kapak — görsel veya kategori gradyanı */}
      <div
        className="relative h-[120px] overflow-hidden"
        style={{ background: hasImage ? undefined : categoryGradient(category) }}
      >
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={community.cover_image_url!}
            alt=""
            loading="lazy"
            className="block h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <CategoryIcon slug={category} size={36} color="rgba(255,255,255,.92)" />
          </div>
        )}
      </div>

      {/* Gövde */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-1 text-[15.5px] font-bold leading-[1.3] tracking-[-0.2px] text-ink">
          {community.name}
        </h3>

        <div className="mb-3 mt-2 flex flex-wrap items-center gap-1.5">
          {catLabel && (
            <span className="rounded-full border border-line bg-warm px-2.5 py-1 text-[11.5px] font-semibold text-body">
              {catLabel}
            </span>
          )}
          {community.city && (
            <span className="rounded-full border border-line bg-warm px-2.5 py-1 text-[11.5px] font-semibold text-body">
              {community.city}
            </span>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between">
          <span className="flex items-center gap-[7px] text-[12.5px] text-mute">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            {community.memberCount ?? 0} üye
          </span>
          <span className="text-[13px] font-bold text-brand transition group-hover:translate-x-0.5">
            Katıl →
          </span>
        </div>
      </div>
    </Link>
  )
}
