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

  const tabBase =
    'rounded-full px-5 py-[9px] text-[14.5px] transition-colors duration-150'

  return (
    <div className="flex gap-2">
      <Link
        href={buildHref('etkinlikler')}
        className={`${tabBase} ${
          activeTab === 'etkinlikler'
            ? 'bg-ink font-semibold text-white'
            : 'font-medium text-ink hover:bg-warm'
        }`}
      >
        Etkinlikler
      </Link>
      <Link
        href={buildHref('topluluklar')}
        className={`${tabBase} ${
          activeTab === 'topluluklar'
            ? 'bg-ink font-semibold text-white'
            : 'font-medium text-ink hover:bg-warm'
        }`}
      >
        Topluluklar
      </Link>
    </div>
  )
}
