'use client'

import Link from 'next/link'
import { useRef } from 'react'
import CategoryDoodle from '@/components/category-doodle'

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
    if (!stripRef.current) return
    const amount = 300
    stripRef.current.scrollBy({
      left: dir === 'left' ? -amount : amount,
      behavior: 'smooth',
    })
  }

  const itemStyle: React.CSSProperties = {
    flex: '0 0 auto',
    width: '92px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    textDecoration: 'none',
    padding: '8px 4px 0',
    borderRadius: '12px 12px 0 0',
  }

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={stripRef}
        className="kesfet-strip"
        style={{
          display: 'flex',
          gap: '4px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          padding: '4px 48px 2px 2px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {/* Tümü */}
        <Link href={buildHref(null)} className="cat-item doodle-item" style={itemStyle}>
          <CategoryDoodle slug="tumu" size={56} active={!activeCategory} />
          <span style={{
            fontSize: '12.5px',
            fontWeight: !activeCategory ? 700 : 500,
            color: !activeCategory ? 'var(--ink)' : 'var(--muted)',
            whiteSpace: 'nowrap',
          }}>
            Tümü
          </span>
          <span style={{
            height: '3px',
            width: '42px',
            borderRadius: '3px 3px 0 0',
            background: 'var(--ink)',
            opacity: !activeCategory ? 1 : 0,
          }} />
        </Link>

        {cats.map((cat) => {
          const isActive = activeCategory === cat.slug
          return (
            <Link
              key={cat.slug}
              href={buildHref(cat.slug)}
              className="cat-item doodle-item"
              style={itemStyle}
            >
              <CategoryDoodle slug={cat.slug} size={56} active={isActive} />
              <span style={{
                fontSize: '12.5px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--ink)' : 'var(--muted)',
                whiteSpace: 'nowrap',
              }}>
                {cat.n}
              </span>
              <span style={{
                height: '3px',
                width: '42px',
                borderRadius: '3px 3px 0 0',
                background: 'var(--ink)',
                opacity: isActive ? 1 : 0,
              }} />
            </Link>
          )
        })}
      </div>

      {/* Sağ kaydırma butonu */}
      <button
        onClick={() => scroll('right')}
        aria-label="Kategorileri sağa kaydır"
        className="strip-scroll-btn"
        style={{
          position: 'absolute',
          right: '0',
          top: '18px',
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
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 6l6 6-6 6" />
        </svg>
      </button>

      <style>{`
        .kesfet-strip::-webkit-scrollbar { display: none; }
        .cat-item:hover {
          background: var(--paper-soft);
        }
        .doodle-item:hover .doodle {
          transform: scale(1.08);
        }
        .strip-scroll-btn:hover {
          background: var(--paper-soft);
        }
      `}</style>
    </div>
  )
}
