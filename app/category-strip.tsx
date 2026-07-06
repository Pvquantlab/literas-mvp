'use client'

import Link from 'next/link'
import { useRef } from 'react'

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
  buildHref,
  renderIcon,
}: {
  cats: Cat[]
  activeCategory?: string
  buildHref: (slug: string | null) => string
  renderIcon: (slug: string) => React.ReactNode
}) {
  const stripRef = useRef<HTMLDivElement>(null)

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
      {/* Sol ok */}
      <button
        onClick={scrollBack}
        aria-label="Kategorileri geri kaydır"
        style={arrowBtnStyle('left')}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Sağ ok */}
      <button
        onClick={scrollForward}
        aria-label="Kategorileri kaydır"
        style={arrowBtnStyle('right')}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Kategori strip */}
      <div
        ref={stripRef}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '18px',
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
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                width: '128px',
                flex: 'none',
                scrollSnapAlign: 'start',
                padding: '6px 0',
                textDecoration: 'none',
              }}
            >
              <span
                className={`cat-circle${isActive ? ' active' : ''}`}
                style={{
                  background: isActive ? undefined : '#FFFFFF',
                  borderColor: isActive ? undefined : c.ink + '40',
                  color: isActive ? undefined : c.ink,
                }}
              >
                {renderIcon(c.slug)}
              </span>
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--ink)',
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
    </div>
  )
}

function arrowBtnStyle(side: 'left' | 'right'): React.CSSProperties {
  return {
    position: 'absolute',
    [side]: '18px',
    top: '80px',
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