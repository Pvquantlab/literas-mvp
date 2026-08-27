/**
 * Ayarlar sayfalarında kaydetme sonucunu gösteren şerit.
 * Server action `ayarlarSonucu()` ile ?durum=ok veya ?hata=... ekler.
 */
export default function AyarlarDurum({
  durum,
  hata,
}: {
  durum?: string
  hata?: string
}) {
  if (!hata && durum !== 'ok') return null

  const basarili = !hata

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        margin: '0 0 22px',
        padding: '12px 16px',
        border: '1.5px solid var(--ink)',
        borderRadius: 12,
        background: basarili ? 'var(--lime, #D7F06A)' : 'var(--paper-cream)',
        boxShadow: '3px 4px 0 var(--ink)',
        fontSize: 14.5,
        color: 'var(--ink)',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          font: "600 12px 'IBM Plex Mono', monospace",
          letterSpacing: '0.08em',
          textTransform: 'lowercase',
          opacity: 0.65,
        }}
      >
        {basarili ? 'kaydedildi' : 'hata'}
      </span>
      <span style={{ fontWeight: 600 }}>
        {basarili ? 'Değişiklikler kaydedildi.' : hata}
      </span>
    </div>
  )
}
