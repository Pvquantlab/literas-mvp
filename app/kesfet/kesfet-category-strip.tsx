'use client'

import Link from 'next/link'
import { useRef } from 'react'
import { CategoryTile, TUMU_SLUG } from '@/components/category-art'

/** `soft` ve `ink` artık kullanılmıyor — karo rengini lib/categories.ts veriyor.
 *  Prop tipi korundu ki page.tsx değişmesin. */
type Cat = { n: string; slug: string; soft: string; ink: string }

type Props = {
  cats: Cat[]
  activeTab: 'etkinlikler' | 'topluluklar'
  activeCategory: string | null
}

export default function KesfetCategoryStrip({ cats, activeTab, activeCategory }: Props) {
  const stripRef = useRef<HTMLDivElement>(null)

  const buildHref = (slug: string | null) => {
    const p = new URLSearchParams()
    p.set('tab', activeTab)
    if (slug) p.set('kategori', slug)
    return `/kesfet?${p.toString()}`
  }

  function scroll(dir: 'left' | 'right') {
    stripRef.current?.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' })
  }

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={stripRef}
        className="ct-strip kesfet-strip"
        style={{ paddingRight: '48px', borderBottom: '1px solid var(--border)' }}
      >
        <Link href={buildHref(null)} className="ct-item" aria-current={!activeCategory}>
          <CategoryTile value={TUMU_SLUG} label="Tümü" active={!activeCategory} />
          <span className={!activeCategory ? 'ct-bar on' : 'ct-bar'} />
        </Link>

        {cats.map((cat) => {
          const isActive = activeCategory === cat.slug
          return (
            <Link
              key={cat.slug}
              href={buildHref(cat.slug)}
              className="ct-item"
              aria-current={isActive}
            >
              <CategoryTile value={cat.slug} label={cat.n} active={isActive} />
              <span className={isActive ? 'ct-bar on' : 'ct-bar'} />
            </Link>
          )
        })}
      </div>

      <button
        onClick={() => scroll('right')}
        aria-label="Kategorileri sağa kaydır"
        className="strip-scroll-btn"
        style={{
          position: 'absolute',
          right: 0,
          top: '22px',
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          border: '1px solid var(--border-mid)',
          background: 'var(--paper-cream)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--ink)',
          boxShadow: '0 2px 8px rgba(30,58,43,.08)',
          zIndex: 2,
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 6l6 6-6 6" />
        </svg>
      </button>

      <style>{`
        .kesfet-strip::-webkit-scrollbar { display: none; }
        .strip-scroll-btn:hover { background: var(--paper-soft); }
      `}</style>
    </div>
  )
}
