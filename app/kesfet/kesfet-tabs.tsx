'use client'

import Link from 'next/link'

type Props = {
  activeTab: 'etkinlikler' | 'topluluklar'
  activeCategory: string | null
}

export default function KesfetTabs({ activeTab, activeCategory }: Props) {
  const buildHref = (tab: string) => {
    const p = new URLSearchParams()
    p.set('tab', tab)
    if (activeCategory) p.set('kategori', activeCategory)
    return `/kesfet?${p.toString()}`
  }

  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <Link
        href={buildHref('etkinlikler')}
        style={{
          border: 'none',
          cursor: 'pointer',
          fontSize: '14.5px',
          fontWeight: activeTab === 'etkinlikler' ? 600 : 500,
          padding: '9px 20px',
          borderRadius: '999px',
          background: activeTab === 'etkinlikler' ? 'var(--ink)' : 'transparent',
          color: activeTab === 'etkinlikler' ? 'var(--paper-cream)' : 'var(--ink)',
          textDecoration: 'none',
          transition: 'background .15s ease',
        }}
      >
        Etkinlikler
      </Link>
      <Link
        href={buildHref('topluluklar')}
        className="tab-inactive"
        style={{
          border: '1px solid transparent',
          cursor: 'pointer',
          fontSize: '14.5px',
          fontWeight: activeTab === 'topluluklar' ? 600 : 500,
          padding: '9px 20px',
          borderRadius: '999px',
          background: activeTab === 'topluluklar' ? 'var(--ink)' : 'transparent',
          color: activeTab === 'topluluklar' ? 'var(--paper-cream)' : 'var(--ink)',
          textDecoration: 'none',
          transition: 'background .15s ease',
        }}
      >
        Topluluklar
      </Link>

      <style>{`
        .tab-inactive:hover {
          background: var(--paper-soft) !important;
        }
      `}</style>
    </div>
  )
}
