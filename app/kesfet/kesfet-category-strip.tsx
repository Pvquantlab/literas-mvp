'use client'

import Link from 'next/link'
import CategoryIcon from '@/components/category-icon'

type Cat = { n: string; slug: string }

type Props = {
  cats: Cat[]
  activeTab: 'etkinlikler' | 'topluluklar'
  activeCategory: string | null
}

export default function KesfetCategoryStrip({ cats, activeTab, activeCategory }: Props) {
  const buildHref = (slug: string | null) => {
    const p = new URLSearchParams()
    p.set('tab', activeTab)
    if (slug) p.set('kategori', slug)
    return `/kesfet?${p.toString()}`
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

      {cats.map((cat) => {
        const isActive = activeCategory === cat.slug
        return (
          <Link
            key={cat.slug}
            href={buildHref(cat.slug)}
            className={`${chipBase} ${
              isActive
                ? 'border-ink bg-ink text-white'
                : 'border-line bg-white text-ink hover:border-brand hover:text-brand'
            }`}
          >
            <CategoryIcon slug={cat.slug} size={17} />
            {cat.n}
          </Link>
        )
      })}
    </div>
  )
}
