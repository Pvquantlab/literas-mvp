// literaslab logo — simge + yazı. Tek kaynak, her yerde aynı.

export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden="true" style={{ display: 'block', borderRadius: size * 0.3 }}>
      <rect width="34" height="34" rx="10" fill="#C2501F" />
      <rect x="11.5" y="7" width="6" height="19.5" rx="3" fill="#FFFFFF" />
      <circle cx="21.6" cy="23.3" r="3.4" fill="#E9B44C" />
    </svg>
  )
}

export default function Logo({
  markSize = 34,
  textColor = '#17202B',
  fontSize = 21,
}: {
  markSize?: number
  textColor?: string
  fontSize?: number
}) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
      <LogoMark size={markSize} />
      <span
        style={{
          fontWeight: 800,
          fontSize: `${fontSize}px`,
          letterSpacing: '-0.6px',
          color: textColor,
          lineHeight: 1,
        }}
      >
        literas<span style={{ color: '#C2501F' }}>lab</span>
      </span>
    </span>
  )
}
