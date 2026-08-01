import { byValue } from '@/lib/categories'
import { WireShape } from '@/components/category-art'

/**
 * Topluluk kapağı — mesh zemin + beyaz tel kafesler + 3D mavi amblem.
 *
 * NEDEN AMBLEM HEP MAVİ: önce kategorinin açık tonundan boyanıyordu ve
 * turkuaz/mavi ailelerde zemine karışıyordu. Şimdi nesne markanın kendi
 * objesi — her kartta aynı mavi aile. Kategori zeminden ve etiketten
 * okunuyor. Kontrast artık kategoriye bağlı değil.
 *
 * HACİM NASIL VERİLİYOR: her disk üç parçadan oluşuyor — alt elips (koyu
 * kenar), gövde dikdörtgeni (yan yüz degradesi), üst elips (açık yüz).
 * Yan yüz üstten alta koyulaşıyor, üst yüzün kenarında ince beyaz ışık var.
 * Perspektif kısaltma oranı sabit: ry = rx * 0.42.
 *
 * Aynı id her zaman aynı kapağı verir.
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

function safeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'x'
}

/**
 * Radix spektrumu. DİKKAT: bu bir ÇİZGİ, daire değil — turkuazın komşusu
 * mavidir, magenta değil. Sarmalamak (i+4)%5 turkuaz karta magenta leke
 * düşürüyordu; ikisi karışınca gri-kahve çamur oluyordu. Uçlarda içeri dön.
 */
const SPECTRUM = ['#4FC3B8', '#2B6FD4', '#5B35CE', '#9B2FD0', '#E040A0']
const NEUTRAL: [string, string, string] = ['#8A9BD8', '#2C3E8C', '#101B54']

/** Hex → HSL. Mesh renklerini kategoriden türetmek için. */
function toHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const mx = Math.max(r, g, b)
  const mn = Math.min(r, g, b)
  const l = (mx + mn) / 2
  if (mx === mn) return [0, 0, l]
  const d = mx - mn
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
  let h: number
  if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (mx === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return [h, s, l]
}

function toHex(h: number, s: number, l: number): string {
  h = ((h % 1) + 1) % 1
  s = Math.max(0, Math.min(1, s))
  l = Math.max(0, Math.min(1, l))
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1))
  const m = l - c / 2
  const seg = Math.floor(h * 6) % 6
  const rgb = [
    [c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x],
  ][seg]
  const v = rgb.map((u) => Math.round((u + m) * 255))
  return '#' + v.map((u) => u.toString(16).padStart(2, '0')).join('').toUpperCase()
}

const SPEC_H = SPECTRUM.map((c) => toHsl(c)[0])

/** Kategorinin spektrumdaki en yakın konumu. */
function specIndex(hex: string): number {
  const h = toHsl(hex)[0]
  let best = 0
  let bd = 1
  SPEC_H.forEach((sh, i) => {
    const d = Math.min(Math.abs(h - sh), 1 - Math.abs(h - sh))
    if (d < bd) { bd = d; best = i }
  })
  return best
}
const WIRES = ['kitap', 'doga', 'lezzet', 'spor']

/** Perspektif kısaltma — bütün diskler aynı açıdan görünsün. */
const FLAT = 0.42

type Props = {
  id: string
  category?: string | null
  className?: string
}

export default function CommunityEmblem({ id, category, className }: Props) {
  const pal = byValue(category)?.colors ?? NEUTRAL
  const base = pal[1]
  const h = hashId(id)
  const variant = h % 5
  const u = safeId(id)
  const g = (n: string) => `cw-${u}-${n}`

  // Mesh renkleri kategorinin spektrumdaki KOMŞULARINDAN — rastgele değil.
  // Uçlarda sarmalamak yerine içeri dönülüyor.
  const si = specIndex(base)
  const n1 = si < 4 ? si + 1 : si - 1
  const n2 = si < 3 ? si + 2 : si - 2

  const [bh, bs] = toHsl(base)
  const meshLight = toHex(bh, Math.min(1, bs * 1.2), 0.53)
  const [d1h, d1s] = toHsl(SPECTRUM[n1])
  const meshDark = toHex(d1h, Math.min(1, d1s * 1.12), 0.25)
  const [b2h, b2s] = toHsl(SPECTRUM[n2])
  const meshBlob = toHex(b2h, Math.min(1, b2s * 1.18), 0.5)

  // Leke konumu topluluğa göre kayıyor — aynı kategoride iki farklı kart.
  const bx = 70 + ((h >>> 17) % 5) * 62
  const by = 30 + ((h >>> 21) % 3) * 78

  /** Silindir disk: alt kenar + yan yüz + üst yüz. */
  const Disc = ({ cx, cy, rx, t }: { cx: number; cy: number; rx: number; t: number }) => {
    const ry = rx * FLAT
    return (
      <g>
        <ellipse cx={cx} cy={cy + t} rx={rx} ry={ry} fill={`url(#${g('edge')})`} />
        <rect x={cx - rx} y={cy} width={rx * 2} height={t} fill={`url(#${g('side')})`} />
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${g('top')})`} />
        <ellipse
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.4"
          opacity=".65"
        />
      </g>
    )
  }

  /** Küre: kenardan merkeze doğru ışık alan top. */
  const Orb = ({ cx, cy, r }: { cx: number; cy: number; r: number }) => (
    <g>
      <ellipse cx={cx + 2} cy={cy + r * 0.92} rx={r * 0.82} ry={r * 0.26} fill="#0B1470" opacity=".28" />
      <circle cx={cx} cy={cy} r={r} fill={`url(#${g('orb')})`} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#FFFFFF" strokeWidth="1.2" opacity=".5" />
    </g>
  )

  const emblem = (() => {
    switch (variant) {
      case 0: // üç kat yığın
        return (
          <>
            <Disc cx={200} cy={150} rx={62} t={13} />
            <Disc cx={200} cy={124} rx={56} t={13} />
            <Disc cx={200} cy={98} rx={48} t={13} />
          </>
        )
      case 1: // büyük disk + yörüngedeki küreler
        return (
          <>
            <Disc cx={196} cy={132} rx={64} t={15} />
            <Orb cx={264} cy={82} r={17} />
            <Orb cx={140} cy={92} r={12} />
          </>
        )
      case 2: // kaydırılmış iki kat
        return (
          <>
            <Disc cx={178} cy={148} rx={58} t={14} />
            <Disc cx={222} cy={112} rx={52} t={14} />
          </>
        )
      case 3: // tek küre + altında disk
        return (
          <>
            <Disc cx={200} cy={158} rx={66} t={12} />
            <Orb cx={200} cy={106} r={38} />
          </>
        )
      default: // dört kat, hafif kayan yığın
        return (
          <>
            <Disc cx={206} cy={162} rx={60} t={11} />
            <Disc cx={200} cy={140} rx={54} t={11} />
            <Disc cx={196} cy={118} rx={48} t={11} />
            <Disc cx={200} cy={96} rx={40} t={11} />
          </>
        )
    }
  })()

  return (
    <svg
      viewBox="0 0 400 240"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      role="img"
      aria-label="Topluluk kapak görseli"
      style={{ display: 'block', width: '100%', height: '100%' }}
    >
      <defs>
        <linearGradient id={g('bg')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={meshLight} />
          <stop offset="100%" stopColor={meshDark} />
        </linearGradient>

        {/* Üst yüz: sol üstten gelen ışık */}
        <linearGradient id={g('top')} x1="12%" y1="0%" x2="88%" y2="100%">
          <stop offset="0%" stopColor="#EDF3FF" />
          <stop offset="46%" stopColor="#93B4F7" />
          <stop offset="100%" stopColor="#2B6FD4" />
        </linearGradient>
        {/* Yan yüz: üstten alta koyulaşıyor */}
        <linearGradient id={g('side')} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2F5CD5" />
          <stop offset="100%" stopColor="#16257F" />
        </linearGradient>
        {/* Alt kenar: en koyu */}
        <linearGradient id={g('edge')} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#101B54" />
          <stop offset="100%" stopColor="#1D2F8E" />
        </linearGradient>
        {/* Küre: sol üstte parlama */}
        <radialGradient id={g('orb')} cx="32%" cy="26%" r="76%">
          <stop offset="0%" stopColor="#F2F6FF" />
          <stop offset="42%" stopColor="#8AACF5" />
          <stop offset="100%" stopColor="#1B2FA8" />
        </radialGradient>

        {/* Bulanıklık düşürüldü: 46'da her şey tek tona iniyordu. */}
        <filter id={g('mesh')} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="34" />
        </filter>
        <filter id={g('drop')} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#0B1470" floodOpacity="0.34" />
        </filter>
      </defs>

      {/* 1 — mesh zemin */}
      <rect width="400" height="240" fill={`url(#${g('bg')})`} />
      {/* Tek leke. Üç leke üst üste binince ortalama alınıp doygunluk
          kayboluyordu; açık ton yıkaması (hi) da rengi soluklaştırıyordu. */}
      <g filter={`url(#${g('mesh')})`}>
        <ellipse cx={bx} cy={by} rx="132" ry="98" fill={meshBlob} opacity=".72" />
      </g>

      {/* 2 — beyaz tel kafesler */}
      <g fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinejoin="round" opacity=".62">
        <g transform="translate(20 24) scale(0.42)"><WireShape slug={WIRES[h % 4]} /></g>
        <g transform="translate(318 20) scale(0.36)"><WireShape slug={WIRES[(h >>> 5) % 4]} /></g>
        <g transform="translate(326 152) scale(0.38)"><WireShape slug={WIRES[(h >>> 9) % 4]} /></g>
        <g transform="translate(26 150) scale(0.34)"><WireShape slug={WIRES[(h >>> 13) % 4]} /></g>
      </g>

      {/* 3 — 3D amblem */}
      <g filter={`url(#${g('drop')})`}>{emblem}</g>
    </svg>
  )
}
