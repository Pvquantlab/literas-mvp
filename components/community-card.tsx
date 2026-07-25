import Link from 'next/link'
import Image from 'next/image'
import { byValue } from '@/lib/categories'
import IsoCover from './iso-cover'
import Seats from './seats'

export type CommunitySummary = {
  id: string
  name: string
  city: string | null
  category: string | null
  cover_image_url: string | null
  member_count?: number | null
}

/**
 * Bu bileşen page.tsx'te iki kez birebir kopyalanmıştı (giriş yapmış /
 * yapmamış dalları). Artık tek yerde — bir düzeltme her ikisini de kapsar.
 */
export default function CommunityCard({ community }: { community: CommunitySummary }) {
  const cat = byValue(community.category)
  const memberCount = community.member_count ?? 0

  return (
    <Link href={`/community/${community.id}`} className="cc-link reveal">
      <article className="stack" style={{ gap: 'var(--s-3)', height: '100%' }}>
        <div
          style={{
            position: 'relative',
            aspectRatio: '16 / 9',
            overflow: 'hidden',
            borderRadius: 'var(--r-md)',
            background: 'var(--paper-soft)',
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
            <IsoCover category={community.category} id={community.id} />
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

          {/* Sayi yerine masa. "N uye" metni ve ikon kaldirildi. */}
          <div style={{ marginTop: 'var(--s-2)' }}>
            <Seats count={memberCount} id={community.id} />
          </div>
        </div>
      </article>
    </Link>
  )
}
