'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { CATEGORIES } from '@/lib/categories'
import CategoryIcon from '@/components/category-icon'

type Props = {
  activeSlug: string | null
  activeCity?: string | null
  query?: string | null
}

export default function CategoryStrip({ activeSlug, activeCity, query }: Props) {
  const ref = useRef<HTMLElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      setCanLeft(el.scrollLeft > 4)
      setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  function scroll(dir: 'left' | 'right') {
    ref.current?.scrollBy({ left: dir === 'left' ? -320 : 320, behavior: 'smooth' })
  }

  const buildHref = (slug: string | null) => {
    const p = new URLSearchParams()
    if (slug) p.set('category', slug)
    if (activeCity) p.set('city', activeCity)
    if (query) p.set('q', query)
    const s = p.toString()
    return s ? `/?${s}` : '/'
  }

  const btnStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
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
    boxShadow: '0 2px 8px rgba(30,58,43,.10)',
    zIndex: 2,
  }

  return (
    <div style={{ position: 'relative' }}>
      <nav ref={ref} className="cat-strip" aria-label="Kategoriler">
        <Link href={buildHref(null)} className="cat-chip" aria-current={!activeSlug}>
          Tümü
        </Link>
        {CATEGORIES.map((c) => (
          <Link
            key={c.slug}
            href={buildHref(c.slug)}
            className="cat-chip"
            aria-current={activeSlug === c.slug}
          >
            <CategoryIcon slug={c.slug} size={21} />
            {c.label}
          </Link>
        ))}
      </nav>

      {canLeft && (
        <button
          onClick={() => scroll('left')}
          aria-label="Kategorileri sola kaydır"
          className="strip-nav-btn"
          style={{ ...btnStyle, left: 0 }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 6l-6 6 6 6" />
          </svg>
        </button>
      )}

      {canRight && (
        <button
          onClick={() => scroll('right')}
          aria-label="Kategorileri sağa kaydır"
          className="strip-nav-btn"
          style={{ ...btnStyle, right: 0 }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 6l6 6-6 6" />
          </svg>
        </button>
      )}

      <style>{`
        .cat-strip::-webkit-scrollbar { display: none; }
        .strip-nav-btn:hover { background: var(--paper-soft); }
      `}</style>
    </div>
  )
}
