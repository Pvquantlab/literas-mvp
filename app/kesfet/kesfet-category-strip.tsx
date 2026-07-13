'use client'

import Link from 'next/link'
import { useRef } from 'react'

type Cat = { n: string; slug: string; soft: string; ink: string }

type Props = {
  cats: Cat[]
  activeTab: 'etkinlikler' | 'topluluklar'
  activeCategory: string | null
}

function CatIcon({ slug, size = 22, color }: { slug: string; size?: number; color: string }) {
  const common = {
    width: size, height: size, viewBox: '0 0 24 24',
    fill: 'none', stroke: color, strokeWidth: 1.7,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  }
  switch (slug) {
    case 'kitap':      return <svg {...common}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
    case 'doğa':       return <svg {...common}><path d="M8 19v2"/><path d="M8 15v-3"/><path d="M12 21V11"/><path d="M16 21v-4"/><path d="M12 11 6 5l6-2 6 2z"/><path d="M18 12a3 3 0 1 0 3-3"/></svg>
    case 'müzik':      return <svg {...common}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
    case 'lezzet':     return <svg {...common}><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/></svg>
    case 'dil':        return <svg {...common}><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>
    case 'spor':       return <svg {...common}><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
    case 'sanat':      return <svg {...common}><circle cx="13.5" cy="6.5" r=".5" fill={color}/><circle cx="17.5" cy="10.5" r=".5" fill={color}/><circle cx="8.5" cy="7.5" r=".5" fill={color}/><circle cx="6.5" cy="12.5" r=".5" fill={color}/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
    case 'oyun':       return <svg {...common}><line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><line x1="15" x2="15.01" y1="12" y2="12"/><line x1="18" x2="18.01" y1="10" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/></svg>
    case 'tech':       return <svg {...common}><rect width="18" height="12" x="3" y="4" rx="2"/><line x1="2" x2="22" y1="20" y2="20"/></svg>
    case 'sinema':     return <svg {...common}><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/></svg>
    case 'fotoğraf':   return <svg {...common}><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
    case 'gönüllülük': return <svg {...common}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
    case 'kariyer':    return <svg {...common}><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
    case 'sosyal':     return <svg {...common}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    default:           return <svg {...common}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
  }
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
        <Link
          href={buildHref(null)}
          className="cat-item"
          style={{
            flex: '0 0 auto',
            width: '98px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
            padding: '8px 4px 0',
            borderRadius: '12px 12px 0 0',
          }}
        >
          <span style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            border: `1.5px solid ${!activeCategory ? 'var(--ink)' : 'var(--border-mid)'}`,
            background: 'var(--paper-cream)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </span>
          <span style={{
            fontSize: '12.5px',
            fontWeight: !activeCategory ? 600 : 500,
            color: 'var(--ink)',
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
              className="cat-item"
              style={{
                flex: '0 0 auto',
                width: '98px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                textDecoration: 'none',
                padding: '8px 4px 0',
                borderRadius: '12px 12px 0 0',
              }}
            >
              <span style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                border: `1.5px solid ${isActive ? 'var(--ink)' : 'var(--border-mid)'}`,
                background: 'var(--paper-cream)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <CatIcon slug={cat.slug} color={cat.ink} />
              </span>
              <span style={{
                fontSize: '12.5px',
                fontWeight: isActive ? 600 : 500,
                color: 'var(--ink)',
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
          top: '30px',
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
        .strip-scroll-btn:hover {
          background: var(--paper-soft);
        }
      `}</style>
    </div>
  )
}
