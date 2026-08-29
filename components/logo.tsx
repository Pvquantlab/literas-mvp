type Tone = 'box' | 'plain'

export function LogoMark({ size = 28, tone = 'box' }: { size?: number; tone?: Tone }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={tone === 'box' ? '0 0 32 32' : '4 4 24 24'}
      aria-hidden="true"
      focusable="false"
      style={{ flex: '0 0 auto', display: 'block' }}
    >
      {tone === 'box' && <rect width="32" height="32" rx="9" fill="var(--ink)" />}
      <rect x="8.4" y="5.5" width="4" height="13.2" rx="2" fill="var(--lime)" />
      <rect x="8.4" y="18.5" width="15.2" height="3.8" rx="1.9" fill="var(--lime)" />
      <rect x="9.2" y="22.3" width="2.4" height="4" rx="1.2" fill="var(--lime)" />
      <rect x="19.6" y="22.3" width="2.4" height="4" rx="1.2" fill="var(--lime)" />
      <circle cx="18.4" cy="14.8" r="2.6" fill="var(--paper-cream)" />
    </svg>
  )
}

export default function Logo({
  size = 28,
  fontSize = 19,
  tone = 'box',
  color = 'var(--ink)',
}: { size?: number; fontSize?: number; tone?: Tone; color?: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '9px' }}>
      <LogoMark size={size} tone={tone} />
      <span style={{
        fontSize: `${fontSize}px`,
        // Marcellus TEK ağırlık taşıyor (400). 600 istenirse tarayıcı sahte
        // kalın üretiyor ve yazıt karakterini bozuyor. Marka ağırlıkla değil
        // harf aralığıyla duruyor.
        fontFamily: 'var(--font-serif), Georgia, serif',
        fontWeight: 400,
        letterSpacing: '0.045em',
        color,
        lineHeight: 1,
      }}>
        literaslab
      </span>
    </span>
  )
}
