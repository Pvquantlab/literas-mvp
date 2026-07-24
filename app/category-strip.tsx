'use client'

import Link from 'next/link'
import { useRef } from 'react'
import CategoryDoodle from '@/components/category-doodle'

type Cat = {
  n: string
  slug: string
  bg: string
  ink: string
  pt: string
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
  const stripRef = useRef<HTMLDivElement>(null)

  const buildHref = (cat: string | null) => {
    const params = new URLSearchParams()
    if (cat) params.set('category', cat)
    if (activeCity) params.set('city', activeCity)
    if (activeQuery) params.set('q', activeQuery)
    const qs = params.toString()
    return qs ? `/?${qs}` : '/'
  }

  const scrollBack = () => {
    const el = stripRef.current
    if (el) el.scrollBy({ left: -el.clientWidth * 0.8, behavior: 'smooth' })
  }
  const scrollForward = () => {
    const el = stripRef.current
    if (el) el.scrollBy({ left: el.clientWidth * 0.8, behavior: 'smooth' })
  }

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={scrollBack} aria-label="Kategorileri geri kaydır" style={arrowBtnStyle('left')}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <button onClick={scrollForward} aria-label="Kategorileri kaydır" style={arrowBtnStyle('right')}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div
        ref={stripRef}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          marginTop: '22px',
          overflowX: 'auto',
          scrollSnapType: 'x proximity',
          padding: '12px 28px 16px',
          scrollbarWidth: 'none',
        }}
      >
        {cats.map((c) => {
          const isActive = activeCategory?.toLocaleLowerCase('tr') === c.slug
          return (
            <Link
              key={c.slug}
              href={buildHref(isActive ? null : c.slug)}
              className="doodle-item"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                width: '104px',
                flex: 'none',
                scrollSnapAlign: 'start',
                padding: '6px 0',
                textDecoration: 'none',
              }}
            >
              <CategoryDoodle slug={c.slug} size={68} active={isActive} />
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--ink)' : 'var(--muted)',
                  textAlign: 'center',
                  lineHeight: 1.3,
                }}
              >
                {c.n}
              </span>
            </Link>
          )
        })}
      </div>

      <style>{`
        .doodle-item:hover .doodle {
          transform: scale(1.08);
        }
      `}</style>
    </div>
  )
}

function arrowBtnStyle(side: 'left' | 'right'): React.CSSProperties {
  return {
    position: 'absolute',
    [side]: '18px',
    top: '42px',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: '#FFFFFF',
    border: '1.5px solid rgba(30,58,43,.35)',
    color: 'var(--ink)',
    cursor: 'pointer',
    display: 'grid',
    placeItems: 'center',
    boxShadow: '0 4px 12px rgba(30,58,43,.15)',
    zIndex: 2,
    transition: 'all .18s',
  }
}
