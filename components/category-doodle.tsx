// Kategori "doodle" ikonu — pastel organik leke + koyu çizgi ikon.
// Ana sayfa ve keşfet kategori şeritleri bunu paylaşır (tek kaynak).

const DOODLE: Record<string, { blob: string; ink: string }> = {
  tumu:        { blob: '#E9F6AC', ink: '#4B6B00' },
  kitap:       { blob: '#FBE3D5', ink: '#BE5127' },
  'doğa':      { blob: '#DFF0E2', ink: '#2E6B45' },
  'müzik':     { blob: '#EFE4F6', ink: '#7B4B94' },
  lezzet:      { blob: '#FBEBD2', ink: '#B5641F' },
  dil:         { blob: '#DFEAF7', ink: '#2A5B8F' },
  spor:        { blob: '#DDF1E7', ink: '#1F6E52' },
  sanat:       { blob: '#F9E2EE', ink: '#A83A6E' },
  oyun:        { blob: '#FBE4DF', ink: '#B04330' },
  tech:        { blob: '#E2E8F3', ink: '#2B3A55' },
  sinema:      { blob: '#E9E5F5', ink: '#544A86' },
  'fotoğraf':  { blob: '#DFF0F4', ink: '#23697A' },
  'gönüllülük':{ blob: '#FBE7DC', ink: '#A34A22' },
  kariyer:     { blob: '#E8F0E1', ink: '#46603A' },
  sosyal:      { blob: '#F9E3E9', ink: '#A8354F' },
  default:     { blob: '#EFEEE9', ink: '#5A6B58' },
}

function DoodleIcon({ slug, size }: { slug: string; size: number }) {
  const paths: Record<string, React.ReactNode> = {
    tumu: <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />,
    kitap: <><path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z" /><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z" /></>,
    'doğa': <path d="m8 3 4 8 5-5 5 15H2L8 3z" />,
    'müzik': <><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><path d="M12 19v3" /></>,
    lezzet: <><path d="M17 8h1a4 4 0 1 1 0 8h-1" /><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z" /><path d="M7 2v2" /><path d="M11 2v2" /></>,
    dil: <><path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2z" /><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1" /><path d="M9.5 6.5h.01M12 6.5h.01M7 6.5h.01" /></>,
    spor: <><path d="M12 14.5c-1.5-1.3-2.3-2.9-2.3-4.7 0-1.9.8-3.8 2.3-5.6 1.5 1.8 2.3 3.7 2.3 5.6 0 1.8-.8 3.4-2.3 4.7z" /><path d="M9.5 13.2c-2.2-.2-4-1.2-5.5-3 .8-1 1.9-1.7 3.2-2.1" /><path d="M14.5 13.2c2.2-.2 4-1.2 5.5-3-.8-1-1.9-1.7-3.2-2.1" /><path d="M3.5 16c2.6 1.7 5.4 2.3 8.5 1.7 3.1.6 5.9 0 8.5-1.7" /></>,
    sanat: <><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.7 1.6-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.7 1.6-1.7h2c3.1 0 5.6-2.5 5.6-5.6C22 6 17.5 2 12 2z" /><circle cx="7" cy="10.5" r="1" /><circle cx="11" cy="6.8" r="1" /><circle cx="16" cy="8.5" r="1" /></>,
    oyun: <><path d="M6 11h4" /><path d="M8 9v4" /><path d="M15 12h.01" /><path d="M18 10h.01" /><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" /></>,
    tech: <><rect x="3" y="5" width="18" height="12" rx="2" /><path d="M2 20h20" /></>,
    sinema: <><path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3z" /><path d="m6.2 5.3 3.1 3.9" /><path d="m12.4 3.4 3.1 4" /><path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>,
    'fotoğraf': <><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></>,
    'gönüllülük': <><path d="M11 14h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 16" /><path d="m7 20 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9" /><path d="m2 15 6 6" /><path d="M19.5 8.5c.7-.7 1.5-1.6 1.5-2.7A2.73 2.73 0 0 0 16 4a2.78 2.78 0 0 0-5 1.8c0 1.2.8 2 1.5 2.8L16 12Z" /></>,
    kariyer: <><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></>,
    sosyal: <><g transform="rotate(-14 6.5 10)"><path d="M2.5 3.5h8l-4 6z" /><path d="M6.5 9.5V17" /><path d="M4 17.5h5" /></g><g transform="rotate(14 17.5 10)"><path d="M13.5 3.5h8l-4 6z" /><path d="M17.5 9.5V17" /><path d="M15 17.5h5" /></g></>,
    default: <><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></>,
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[slug] ?? paths.default}
    </svg>
  )
}

export default function CategoryDoodle({
  slug,
  size = 64,
  active = false,
}: {
  slug: string
  size?: number
  active?: boolean
}) {
  const c = DOODLE[slug] ?? DOODLE.default
  return (
    <span
      className="doodle"
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'inline-block',
        transition: 'transform .18s ease',
      }}
    >
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" style={{ display: 'block' }}>
        <path
          d="M32 3C46 3 61 13 61 33C61 50 47 61 31 61C16 61 3 51 3 33C3 14 18 3 32 3Z"
          fill={c.blob}
          stroke={active ? c.ink : 'none'}
          strokeWidth={active ? 2.5 : 0}
        />
      </svg>
      <span
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          color: c.ink,
        }}
      >
        <DoodleIcon slug={slug} size={Math.round(size * 0.42)} />
      </span>
    </span>
  )
}
