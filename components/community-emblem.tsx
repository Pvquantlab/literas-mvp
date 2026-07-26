import { byValue } from '@/lib/categories'

/**
 * Topluluk amblemi — her topluluğun id'sinden türeyen benzersiz soyut form.
 *
 * Aynı id her zaman aynı ambleme çıkar (deterministik), iki topluluk aynı
 * görünmez. Beş kompozisyon × üç renk sırası × açı.
 *
 * ÖNEMLİ — prototipten iki fark:
 *
 * 1. ID'ler topluluk id'sinden türüyor, hash modundan değil. Prototipte
 *    'e' + (h % 100000) kullanılıyordu; iki topluluk aynı sayıya düşerse
 *    birbirinin gradyanını alırdı. Zemin ID'si ise renkten türüyordu —
 *    aynı kategorideki her topluluk aynı ID'yi üretiyordu (iki kitap
 *    kulübün var, bu kesin çakışırdı).
 *
 * 2. Şekillere koyu kontur eklendi. Prototipte amblem zeminle AYNI üç
 *    tondan boyanıyordu ve konturu yoktu; kapakta zar zor seçiliyordu.
 *    Etkinlik ikonunda stroke var, o yüzden okunuyor.
 */

function hashId(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  h ^= h >>> 15
  h = Math.imul(h, 2246822507)
  h ^= h >>> 13
  return h >>> 0
}

/** SVG id'sinde güvenli olmayan karakterleri temizler. */
function safeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'x'
}

const NEUTRAL: [string, string, string] = ['#7E9A85', '#3C5545', '#1E3A2B']

type Props = {
  /** Varyasyon bundan türetilir. */
  id: string
  category?: string | null
  className?: string
}

export default function CommunityEmblem({ id, category, className }: Props) {
  const pal = byValue(category)?.colors ?? NEUTRAL
  const h = hashId(id)
  const variant = h % 5
  const rot = ((h >>> 3) % 40) - 20
  const order = (h >>> 7) % 3
  const u = safeId(id)

  // Renk sırası topluluğa göre kayıyor — aynı kategorideki iki topluluk
  // aynı paletten farklı diziliş alıyor.
  const c = (i: number) => pal[(i + order) % 3]
  const [hi, , dk] = pal

  const gid = (n: number) => `em-${u}-g${n}`

  const shapes = (() => {
    switch (variant) {
      case 0:
        return (
          <>
            <circle cx="60" cy="60" r="40" fill="none" stroke={`url(#${gid(0)})`} strokeWidth="13" />
            <circle cx="60" cy="60" r="25" fill="none" stroke={`url(#${gid(1)})`} strokeWidth="11" />
            <circle cx="60" cy="60" r="10" fill={`url(#${gid(2)})`} />
          </>
        )
      case 1:
        return (
          <>
            <circle cx="60" cy="62" r="27" fill={`url(#${gid(0)})`} />
            <circle cx="94" cy="38" r="13" fill={`url(#${gid(1)})`} />
            <circle cx="26" cy="44" r="10" fill={`url(#${gid(2)})`} />
            <circle cx="46" cy="98" r="9" fill={`url(#${gid(1)})`} />
          </>
        )
      case 2:
        return (
          <>
            <rect x="20" y="52" width="80" height="46" rx="20" fill={`url(#${gid(2)})`} />
            <rect x="26" y="34" width="68" height="42" rx="18" fill={`url(#${gid(1)})`} />
            <rect x="32" y="16" width="56" height="38" rx="16" fill={`url(#${gid(0)})`} />
          </>
        )
      case 3:
        return (
          <>
            <circle cx="44" cy="58" r="28" fill="none" stroke={`url(#${gid(0)})`} strokeWidth="13" />
            <circle cx="78" cy="66" r="24" fill="none" stroke={`url(#${gid(1)})`} strokeWidth="12" />
          </>
        )
      default:
        return (
          <>
            <circle cx="44" cy="46" r="22" fill={`url(#${gid(0)})`} />
            <circle cx="78" cy="52" r="18" fill={`url(#${gid(1)})`} />
            <circle cx="56" cy="84" r="20" fill={`url(#${gid(2)})`} />
            <circle cx="88" cy="86" r="12" fill={`url(#${gid(0)})`} />
          </>
        )
    }
  })()

  return (
    <svg
      viewBox="-8 -8 136 136"
      className={className}
      role="img"
      aria-label="Topluluk amblemi"
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id={gid(0)} x1="16%" y1="4%" x2="84%" y2="96%">
          <stop offset="0%" stopColor={hi} />
          <stop offset="100%" stopColor={c(1)} />
        </linearGradient>
        <linearGradient id={gid(1)} x1="16%" y1="4%" x2="84%" y2="96%">
          <stop offset="0%" stopColor={c(0)} />
          <stop offset="100%" stopColor={c(2)} />
        </linearGradient>
        <linearGradient id={gid(2)} x1="16%" y1="4%" x2="84%" y2="96%">
          <stop offset="0%" stopColor={hi} />
          <stop offset="100%" stopColor={c(1)} />
        </linearGradient>
        <radialGradient id={`em-${u}-sheen`} cx="28%" cy="18%" r="55%">
          <stop offset="0%" stopColor="#fff" stopOpacity=".78" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <filter id={`em-${u}-blur`} x="-45%" y="-45%" width="190%" height="190%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <clipPath id={`em-${u}-clip`}>
          <g>{shapes}</g>
        </clipPath>
      </defs>

      <ellipse cx="60" cy="112" rx="34" ry="9" fill={dk} opacity=".42" filter={`url(#em-${u}-blur)`} />

      <g transform={`rotate(${rot} 60 60)`}>
        {/* Kontur zeminden ayırıyor — prototipte yoktu, amblem kayboluyordu. */}
        <g stroke={dk} strokeWidth="2.5">
          {shapes}
        </g>
        <g clipPath={`url(#em-${u}-clip)`}>
          <rect x="-8" y="-8" width="136" height="136" fill={`url(#em-${u}-sheen)`} />
        </g>
      </g>
    </svg>
  )
}
