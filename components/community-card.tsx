import Link from 'next/link'
import Image from 'next/image'
import { byValue, categoryGradient } from '@/lib/categories'
import CategoryIcon from './category-icon'

export type CommunitySummary = {
  id: string
  name: string
  city: string | null
  category: string | null
  cover_image_url: string | null
  community_members?: { count: number }[] | null
}

/**
 * Bu bileşen page.tsx'te iki kez birebir kopyalanmıştı (giriş yapmış /
 * yapmamış dalları). Artık tek yerde — bir düzeltme her ikisini de kapsar.
 */
export default function CommunityCard({ community }: { community: CommunitySummary }) {
  const cat = byValue(community.category)
  const memberCount = community.community_members?.[0]?.count ?? 0

  return (
    <Link href={`/community/${community.id}`} className="cc-link">
      <article className="stack" style={{ gap: 'var(--s-3)', height: '100%' }}>
        <div
          style={{
            position: 'relative',
            aspectRatio: '16 / 9',
            overflow: 'hidden',
            borderRadius: 'var(--r-md)',
            background: community.cover_image_url
              ? 'var(--paper-soft)'
              : categoryGradient(community.category),
          }}
        >
          {community.cover_image_url ? (
            <Image
              src={community.cover_image_url}
              alt=""
              fill
              sizes="(max-width: 620px) 100vw, (max-width: 1000px) 50vw, 33vw"
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <span
              style={{
                position: 'absolute',
                inset: 0,
                display: 'grid',
                placeItems: 'center',
                color: 'rgba(255,255,255,.9)',
              }}
            >
              <CategoryIcon slug={cat?.slug} size={64} />
            </span>
          )}

          {cat && (
            <span className="badge-cat" style={{ position: 'absolute', left: 12, top: 12 }}>
              {cat.label}
            </span>
          )}
        </div>

        <div className="stack" style={{ gap: 'var(--s-1)' }}>
          <h3
            className="cc-title"
            style={{
              fontSize: 'var(--t-lg)',
              fontWeight: 600,
              lineHeight: 1.25,
              letterSpacing: '-0.01em',
              color: 'var(--ink)',
            }}
          >
            {community.name}
          </h3>

          <p style={{ fontSize: 'var(--t-sm)', color: 'var(--muted)' }}>
            {[cat?.label, community.city].filter(Boolean).join(' · ')}
          </p>

          <p
            className="row"
            style={{ gap: 6, fontSize: 'var(--t-sm)', color: 'var(--muted)', marginTop: 2 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            {memberCount} üye
          </p>
        </div>
      </article>
    </Link>
  )
}
