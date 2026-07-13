export default function Loading() {
  return (
    <main style={{
      minHeight: '60vh',
      display: 'grid',
      placeItems: 'center',
      padding: '48px 24px',
    }}>
      <p style={{
        fontFamily: "'IBM Plex Mono', monospace",
        color: 'var(--muted)',
        fontSize: '14px',
      }}>
        ✿ yükleniyor...
      </p>
    </main>
  )
}
