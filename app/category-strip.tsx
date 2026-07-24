'use client'

import Link from 'next/link'
import CategoryIcon from '@/components/category-icon'

type Cat = {
  n: string
  slug: string
}

export default function CategoryStrip({
  cats,
  activeCategory,
  activeCity,
  activeQuery,
}: {
  cats: Cat[]
  activeCategory?: string
  activeCity?: string
  activeQuery?: string
}) {
  const buildHref = (cat: string | null) => {
    const params = new URLSearchParams()
    if (cat) params.set('category', cat)
    if (activeCity) params.set('city', activeCity)
    if (activeQuery) params.set('q', activeQuery)
    const qs = params.toString()
    return qs ? `/?${qs}` : '/'
  }

  const chipBase =
    'inline-flex items-center gap-[9px] rounded-full border-[1.5px] px-5 py-[11px] text-[14.5px] font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(23,32,43,.08)]'

  return (
    <div className="flex flex-wrap gap-3">
      {/* Tümü */}
      <Link
        href={buildHref(null)}
        className={`${chipBase} ${
          !activeCategory
            ? 'border-ink bg-ink text-white'
            : 'border-line bg-white text-ink hover:border-brand hover:text-brand'
        }`}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
        Tümü
      </Link>

      {cats.map((c) => {
        const isActive = activeCategory?.toLocaleLowerCase('tr') === c.slug
        return (
          <Link
            key={c.slug}
            href={buildHref(isActive ? null : c.slug)}
            className={`${chipBase} ${
              isActive
                ? 'border-ink bg-ink text-white'
                : 'border-line bg-white text-ink hover:border-brand hover:text-brand'
            }`}
          >
            <CategoryIcon slug={c.slug} size={17} />
            {c.n}
          </Link>
        )
      })}
    </div>
  )
}
