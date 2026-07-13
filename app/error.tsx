'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[app error]', error)
  }, [error])

  return (
    <main style={{
      maxWidth: '520px',
      margin: '0 auto',
      padding: '80px 24px 60px',
      textAlign: 'center',
    }}>
      <p style={{
        fontFamily: "'IBM Plex Mono', monospace",
        color: 'var(--coral-deep, #B84330)',
        fontSize: '13px',
        marginBottom: '12px',
        letterSpacing: '0.05em',
      }}>
        Bir şeyler ters gitti
      </p>
      <h1 className="serif" style={{
        fontSize: 'clamp(28px, 4.4vw, 38px)',
        color: 'var(--ink)',
        margin: '0 0 16px',
      }}>
        Beklenmedik bir hata oldu.
      </h1>
      <p style={{
        color: 'var(--muted)',
        fontSize: '15px',
        lineHeight: 1.55,
        marginBottom: '28px',
      }}>
        Tekrar denemeyi ya da ana sayfaya dönmeyi deneyebilirsin.
      </p>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button onClick={reset} className="btn-primary">
          Tekrar dene
        </button>
        <Link href="/" className="btn-secondary">
          Ana sayfa
        </Link>
      </div>
    </main>
  )
}
