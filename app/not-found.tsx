import Link from 'next/link'

export default function NotFound() {
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
        No. 404
      </p>
      <h1 className="serif" style={{
        fontSize: 'clamp(32px, 5vw, 44px)',
        color: 'var(--ink)',
        margin: '0 0 16px',
      }}>
        Bu sayfa <span className="highlight-yellow">kayıp</span>.
      </h1>
      <p style={{
        color: 'var(--muted)',
        fontSize: '15.5px',
        lineHeight: 1.55,
        marginBottom: '28px',
      }}>
        Aradığın sayfa taşınmış olabilir ya da hiç var olmamış.
        Ana sayfadan yeniden başlayabilirsin.
      </p>
      <Link href="/" className="btn-primary" style={{ display: 'inline-block' }}>
        Ana sayfaya dön
      </Link>
    </main>
  )
}
