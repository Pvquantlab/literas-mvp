import Link from 'next/link'
import { notFound } from 'next/navigation'

/**
 * Tasarım denemeleri — YALNIZCA GELİŞTİRMEDE.
 *
 * Üretimde bu rotalar 404 döner: karar aracı, ürün yüzeyi değil. Kazanan
 * varyant seçilince app/page.tsx onun yerine geçecek ve app/tasarim/ silinecek.
 */

const VARYANTLAR = [
  { yol: '/tasarim/1', ad: '1 · Dergi', not: 'illüstrasyon yok · saf tipografi' },
  { yol: '/tasarim/2', ad: '2 · Ürün', not: 'arama önce · yoğun ızgara' },
  { yol: '/tasarim/3', ad: '3 · Vitrin', not: 'parlak 3B · disiplinli' },
  { yol: '/tasarim/4', ad: '4 · Sadık', not: 'DNA ölçüldü · 3 sütun ızgara' },
]

export default function TasarimLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV !== 'development') notFound()

  return (
    <>
      <nav
        aria-label="Tasarım varyantları"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          padding: '10px 16px',
          background: 'var(--paper-cream)',
          borderBottom: '1.5px solid var(--border-mid)',
        }}
      >
        <span
          style={{
            font: "600 10px 'IBM Plex Mono', monospace",
            letterSpacing: '.09em',
            textTransform: 'lowercase',
            color: 'var(--muted)',
            marginRight: 4,
          }}
        >
          tasarım denemesi
        </span>

        {VARYANTLAR.map((v) => (
          <Link
            key={v.yol}
            href={v.yol}
            style={{
              padding: '6px 12px',
              borderRadius: 9,
              border: '1.5px solid var(--border)',
              fontSize: 12.5,
              fontWeight: 700,
              color: 'var(--ink)',
              lineHeight: 1.2,
            }}
          >
            {v.ad}
            <span
              style={{
                display: 'block',
                fontSize: 10,
                fontWeight: 400,
                fontFamily: "'IBM Plex Mono', monospace",
                color: 'var(--muted)',
              }}
            >
              {v.not}
            </span>
          </Link>
        ))}

        <Link
          href="/"
          style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)' }}
        >
          ← gerçek ana sayfa
        </Link>
      </nav>

      {children}
    </>
  )
}
