'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { CATEGORIES } from '@/lib/categories'
import { CategoryTile, TUMU_SLUG } from '@/components/category-art'

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
    top: '36px',
    width: '36px',
    height: '36px',
    // kesfet/kesfet-category-strip.tsx'teki eşi bir tur önce düzeltilmişti
    // ama ana sayfanınki AYRI bir dosya ve gözden kaçmıştı: daire köşe +
    // çerçeve. DNA'da çerçeve taşıyan sıfır eleman var, baskın köşe 4px.
    borderRadius: 'var(--r-md)',
    background: 'var(--paper-cream)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--ink)',
    boxShadow: "none",
    zIndex: 2,
  }

  return (
    <div style={{ position: 'relative' }}>
      <nav ref={ref} className="cat-strip ct-strip" aria-label="Kategoriler">
        <Link href={buildHref(null)} className="ct-item" aria-current={!activeSlug}>
          <CategoryTile value={TUMU_SLUG} label="Tümü" active={!activeSlug} />
        </Link>
        {CATEGORIES.map((c) => (
          <Link
            key={c.slug}
            href={buildHref(c.slug)}
            className="ct-item"
            aria-current={activeSlug === c.slug}
          >
            <CategoryTile value={c.slug} label={c.label} active={activeSlug === c.slug} />
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
