import { byValue } from '@/lib/categories'

/**
 * İzometrik kapak — kapak görseli olmayan kartlar için.
 *
 * Mimarî: masa, sandalyeler, gölge ve ışık her kategoride ORTAK.
 * Kategoriye özel olan sadece masadaki nesneler.
 *
 * VARYASYON: aynı kategorideki iki topluluk birebir aynı görünmesin diye
 * topluluğun id'sinden sabit bir sayı türetiliyor. Rastgele değil —
 * aynı topluluk her zaman aynı sahneyi alır. Üç eksende değişir:
 * sandalye açıklığı, gradyan yönü, nesne dizilimi.
 *
 * İzometrik kural: perspektif kısalması YOK. Tekrarlanan nesne <defs>
 * içinde bir kez tanımlanır, <use> ile konumlandırılır.
 * Eksenler: +X sağ-aşağı (0.866, 0.5), +Y sol-aşağı (-0.866, 0.5).
 * Masa köşeleri: N(160,38) E(246.6,88) S(160,138) W(73.4,88)
 */

/**
 * FNV-1a + karıştırıcı. Basit `h*31+c` UUID'lerde kümeleniyordu — iki
 * kitap kulübü aynı varyantı almıştı. Bu sürüm 36 kombinasyonun hepsini
 * neredeyse eşit dağıtıyor.
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

const CHAIR_SPREAD = [42, 48, 54]
const BG_DIR: [string, string, string, string][] = [
  ['0', '0', '1', '1'],
  ['0', '1', '1', '0'],
  ['1', '0', '0', '1'],
]

type Props = {
  category?: string | null
  /** Varyasyon bundan türetilir. Topluluk/etkinlik id'si ver. */
  id: string
  className?: string
}

export default function IsoCover({ category, id, className }: Props) {
  const slug = byValue(category)?.slug ?? 'default'

  // Üç eksen BAĞIMSIZ türetiliyor. Hepsi tek sayıdan gelseydi iki
  // topluluk aynı sayıyı aldığında kart birebir aynı olurdu.
  const h = hashId(id)
  const spread = CHAIR_SPREAD[h % 3]
  const [x1, y1, x2, y2] = BG_DIR[Math.floor(h / 3) % 3]
  const v = Math.floor(h / 9) % 4
  const uid = `iso-${slug}-${h % 3}-${Math.floor(h / 3) % 3}-${v}`

  const Steam = ({ tx, ty, s, o = 0.4 }: { tx: number; ty: number; s: number; o?: number }) => (
    <g
      fill="none"
      stroke="#FFFDF6"
      strokeWidth="2.4"
      strokeLinecap="round"
      opacity={o}
      transform={`translate(${tx} ${ty}) scale(${s})`}
    >
      <path d="M-6 -27 q-5 -8 0 -14 q5 -7 0 -13" />
      <path d="M6 -25 q-4 -7 0 -12 q4 -6 0 -11" />
    </g>
  )
  const Cup = ({ tx, ty, s }: { tx: number; ty: number; s: number }) => (
    <use href={`#${uid}-cup`} transform={`translate(${tx} ${ty}) scale(${s})`} />
  )
  const Book = ({ tx, ty, s }: { tx: number; ty: number; s: number }) => (
    <use href={`#${uid}-book`} transform={`translate(${tx} ${ty}) scale(${s})`} />
  )

  return (
    <svg
      viewBox="0 0 320 180"
      className={className}
      role="img"
      aria-label="İzometrik bir masa ve sandalyeler"
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      <defs>
        <linearGradient id={`${uid}-bg`} x1={x1} y1={y1} x2={x2} y2={y2}>
          <stop offset="0" stopColor="#16281D" />
          <stop offset="1" stopColor="#31573F" />
        </linearGradient>
        <filter id={`${uid}-blur`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <filter id={`${uid}-blur2`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" />
        </filter>

        <g id={`${uid}-chair`}>
          <polygon points="-22,0 -22,-26 0,-38.7 0,-12.7" fill="#CFC8B5" />
          <polygon points="-22,-26 0,-38.7 3,-37 -19,-24.3" fill="#EDE8DA" />
          <polygon points="0,-38.7 3,-37 3,-11 0,-12.7" fill="#AFA791" />
          <rect x="-22" y="5" width="3.4" height="16" fill="#AFA791" />
          <rect x="18.6" y="5" width="3.4" height="16" fill="#9E9682" />
          <polygon points="-22,0 0,-12.7 22,0 0,12.7" fill="#E6E1D2" />
          <polygon points="-22,0 0,12.7 0,17.7 -22,5" fill="#CFC8B5" />
          <polygon points="0,12.7 22,0 22,5 0,17.7" fill="#AFA791" />
        </g>

        <g id={`${uid}-cup`}>
          <ellipse cx="4" cy="3" rx="25" ry="12" fill="#7A6A4A" opacity=".32" filter={`url(#${uid}-blur2)`} />
          <ellipse cx="0" cy="2.5" rx="27" ry="13.5" fill="#E4DFD0" />
          <ellipse cx="0" cy="0" rx="27" ry="13.5" fill="#F6F3EA" />
          <path d="M21 -13.5 q13 2 11 9 q-2 7 -13 6" fill="none" stroke="#A8431F" strokeWidth="3.2" />
          <path d="M-17 -16.5 L-14 -4.5 a15 7.5 0 0 0 28 0 L17 -16.5 Z" fill="#BE5127" />
          <path d="M-17 -16.5 L-15 -8.5 a15 7.5 0 0 0 8 5 L-9 -11.5 Z" fill="#D06B3F" />
          <ellipse cx="0" cy="-16.5" rx="17" ry="8.5" fill="#8A3517" />
          <ellipse cx="0" cy="-17" rx="13" ry="6.3" fill="#4A3320" />
        </g>

        <g id={`${uid}-book`}>
          <ellipse cx="3" cy="7" rx="24" ry="11" fill="#7A6A4A" opacity=".3" filter={`url(#${uid}-blur2)`} />
          <polygon points="-4.3,-8.5 21.7,6.5 4.3,16.5 -21.7,1.5" fill="#8A3517" />
          <polygon points="-21.7,1.5 4.3,16.5 4.3,21 -21.7,6" fill="#6B2810" />
          <polygon points="4.3,16.5 21.7,6.5 21.7,11 4.3,21" fill="#5A2010" />
          <polygon points="-4.3,-12.5 21.7,2.5 4.3,12.5 -21.7,-2.5" fill="#BE5127" />
          <polygon points="-4.3,-12.5 21.7,2.5 20.4,3.3 -5.6,-11.7" fill="#D8703F" />
        </g>

        <g id={`${uid}-camera`}>
          <ellipse cx="4" cy="10" rx="26" ry="12" fill="#7A6A4A" opacity=".3" filter={`url(#${uid}-blur2)`} />
          <polygon points="-6,-31 2,-35 10,-31 2,-27" fill="#4A7A61" />
          <polygon points="-18,-14 2,-25 20,-16 0,-5" fill="#4A7A61" />
          <polygon points="-18,-14 0,-5 0,7 -18,-2" fill="#2A4A38" />
          <polygon points="0,-5 20,-16 20,-4 0,7" fill="#16281D" />
          <ellipse cx="10" cy="-4" rx="6" ry="7.5" fill="#0D1A11" />
          <ellipse cx="10" cy="-4" rx="3.6" ry="4.6" fill="#3E6B54" />
          <circle cx="8.6" cy="-6" r="1.3" fill="#C8EB4B" />
        </g>
      </defs>

      <rect width="320" height="180" fill={`url(#${uid}-bg)`} />
      <ellipse cx="160" cy="146" rx="94" ry="23" fill="#050C08" opacity=".5" filter={`url(#${uid}-blur)`} />

      <use href={`#${uid}-chair`} transform={`translate(${160 - spread} 60)`} />
      <use href={`#${uid}-chair`} transform={`translate(${160 + spread} 60)`} />

      <g>
        <rect x="83" y="94" width="6" height="31" fill="#CFC8B5" />
        <rect x="89" y="92" width="3.4" height="30" fill="#A39B85" />
        <rect x="228" y="92" width="3.4" height="30" fill="#CFC8B5" />
        <rect x="231.4" y="94" width="6" height="31" fill="#9E9682" />
        <rect x="156" y="144" width="6" height="31" fill="#CFC8B5" />
        <rect x="162" y="142" width="3.4" height="30" fill="#A39B85" />
      </g>

      <polygon points="73.4,88 160,138 160,144 73.4,94" fill="#CFC8B5" />
      <polygon points="160,138 246.6,88 246.6,94 160,144" fill="#A9A18B" />
      <polygon points="160,38 246.6,88 160,138 73.4,88" fill="#F6F3EA" />
      <line x1="73.4" y1="88" x2="160" y2="38" stroke="#FFFDF6" strokeWidth="1.6" />
      <line x1="160" y1="38" x2="246.6" y2="88" stroke="#FFFDF6" strokeWidth="1.6" opacity=".7" />

      {/* --- Kategoriye ve varyasyona göre nesneler --- */}

      {slug === 'kitap' && v === 0 && (
        <>
          <Book tx={140} ty={84} s={0.95} />
          <Book tx={148} ty={76} s={0.95} />
          <Cup tx={196} ty={100} s={0.7} />
          <Steam tx={196} ty={100} s={0.7} o={0.38} />
        </>
      )}
      {slug === 'kitap' && v === 1 && (
        <>
          <Cup tx={124} ty={90} s={0.72} />
          <Steam tx={124} ty={90} s={0.72} />
          <Book tx={186} ty={96} s={1} />
        </>
      )}
      {slug === 'kitap' && v === 3 && (
        <>
          <Book tx={158} ty={90} s={1} />
          <Cup tx={116} ty={84} s={0.66} />
          <Steam tx={116} ty={84} s={0.66} />
          <Cup tx={204} ty={106} s={0.66} />
        </>
      )}
      {slug === 'kitap' && v === 2 && (
        <>
          <Book tx={132} ty={90} s={0.88} />
          <Book tx={140} ty={82} s={0.88} />
          <Book tx={148} ty={74} s={0.88} />
          <Cup tx={202} ty={98} s={0.66} />
          <Steam tx={202} ty={98} s={0.66} o={0.36} />
        </>
      )}

      {slug === 'lezzet' && v === 0 && (
        <>
          <Cup tx={133} ty={84} s={0.78} />
          <Steam tx={133} ty={84} s={0.78} />
          <Cup tx={187} ty={92} s={0.78} />
          <Steam tx={187} ty={92} s={0.78} o={0.36} />
          <Book tx={150} ty={116} s={0.7} />
        </>
      )}
      {slug === 'lezzet' && v === 1 && (
        <>
          <Cup tx={140} ty={88} s={0.82} />
          <Steam tx={140} ty={88} s={0.82} />
          <Cup tx={194} ty={98} s={0.82} />
          <Steam tx={194} ty={98} s={0.82} o={0.36} />
        </>
      )}
      {slug === 'lezzet' && v === 3 && (
        <>
          <Cup tx={150} ty={82} s={0.8} />
          <Steam tx={150} ty={82} s={0.8} />
          <Book tx={124} ty={104} s={0.66} />
          <Cup tx={200} ty={102} s={0.8} />
        </>
      )}
      {slug === 'lezzet' && v === 2 && (
        <>
          <Cup tx={128} ty={86} s={0.74} />
          <Steam tx={128} ty={86} s={0.74} />
          <Cup tx={182} ty={94} s={0.74} />
          <Cup tx={158} ty={112} s={0.74} />
          <Steam tx={158} ty={112} s={0.74} o={0.34} />
        </>
      )}

      {slug === 'fotograf' && v === 0 && <use href={`#${uid}-camera`} transform="translate(152 92) scale(1)" />}
      {slug === 'fotograf' && v === 1 && (
        <>
          <use href={`#${uid}-camera`} transform="translate(140 86) scale(0.95)" />
          <Book tx={196} ty={104} s={0.62} />
        </>
      )}
      {slug === 'fotograf' && v === 3 && (
        <>
          <use href={`#${uid}-camera`} transform="translate(146 90) scale(1)" />
          <Cup tx={204} ty={104} s={0.62} />
          <Steam tx={204} ty={104} s={0.62} o={0.34} />
        </>
      )}
      {slug === 'fotograf' && v === 2 && (
        <>
          <use href={`#${uid}-camera`} transform="translate(164 96) scale(1.06)" />
          <Cup tx={116} ty={88} s={0.62} />
          <Steam tx={116} ty={88} s={0.62} o={0.34} />
        </>
      )}

      {/* Diğer kategoriler: boş masa. Bilinçli — "bir masa aç". */}
    </svg>
  )
}
