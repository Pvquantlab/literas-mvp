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

// Kategori ikonu — v2 line-art
function CatIcon({ slug, size = 34 }: { slug: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    kitap: <><path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z" /><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z" /></>,
    doğa: <path d="m8 3 4 8 5-5 5 15H2L8 3z" />,
    müzik: <><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><path d="M12 19v3" /></>,
    lezzet: <><path d="M17 8h1a4 4 0 1 1 0 8h-1" /><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z" /><path d="M7 2v2" /><path d="M11 2v2" /></>,
    dil: <><path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2z" /><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1" /><path d="M9.5 6.5h.01M12 6.5h.01M7 6.5h.01" /></>,
    spor: <><path d="M12 14.5c-1.5-1.3-2.3-2.9-2.3-4.7 0-1.9.8-3.8 2.3-5.6 1.5 1.8 2.3 3.7 2.3 5.6 0 1.8-.8 3.4-2.3 4.7z" /><path d="M9.5 13.2c-2.2-.2-4-1.2-5.5-3 .8-1 1.9-1.7 3.2-2.1" /><path d="M14.5 13.2c2.2-.2 4-1.2 5.5-3-.8-1-1.9-1.7-3.2-2.1" /><path d="M3.5 16c2.6 1.7 5.4 2.3 8.5 1.7 3.1.6 5.9 0 8.5-1.7" /></>,
    sanat: <><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.7 1.6-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.7 1.6-1.7h2c3.1 0 5.6-2.5 5.6-5.6C22 6 17.5 2 12 2z" /><circle cx="7" cy="10.5" r="1" /><circle cx="11" cy="6.8" r="1" /><circle cx="16" cy="8.5" r="1" /></>,
    oyun: <><path d="M6 11h4" /><path d="M8 9v4" /><path d="M15 12h.01" /><path d="M18 10h.01" /><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" /></>,
    tech: <><rect x="3" y="5" width="18" height="12" rx="2" /><path d="M2 20h20" /></>,
    sinema: <><path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3z" /><path d="m6.2 5.3 3.1 3.9" /><path d="m12.4 3.4 3.1 4" /><path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>,
    fotoğraf: <><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></>,
    gönüllülük: <><path d="M11 14h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 16" /><path d="m7 20 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9" /><path d="m2 15 6 6" /><path d="M19.5 8.5c.7-.7 1.5-1.6 1.5-2.7A2.73 2.73 0 0 0 16 4a2.78 2.78 0 0 0-5 1.8c0 1.2.8 2 1.5 2.8L16 12Z" /></>,
    kariyer: <><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></>,
    sosyal: <><g transform="rotate(-14 6.5 10)"><path d="M2.5 3.5h8l-4 6z" /><path d="M6.5 9.5V17" /><path d="M4 17.5h5" /></g><g transform="rotate(14 17.5 10)"><path d="M13.5 3.5h8l-4 6z" /><path d="M17.5 9.5V17" /><path d="M15 17.5h5" /></g></>,
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[slug] || null}
    </svg>
  )
}

export default function CategoryStrip({
  cats,
  activeCategory,
  buildHref,
}: {
  cats: Cat[]
  activeCategory?: string
  buildHref: (slug: string | null) => string
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
                <CatIcon slug={c.slug} size={34} />
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