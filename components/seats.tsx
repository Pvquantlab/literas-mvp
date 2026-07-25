/**
 * Masa şeridi — kartın altında "kim oturuyor" göstergesi.
 *
 * v5: sandalye YOK, sadece insanlar ve masa çizgisi.
 *
 * Neden: izometrik kapakta zaten sandalyeler var. Aynı motifi kartta iki
 * kez göstermek imzayı zayıflatıyordu. Ayrıca 200px'te güzel duran
 * izometrik sandalye 25px'te lekeye dönüşüyor — o boyut farkı kapanmıyor.
 *
 * İş bölümü: kapak MEKÂNI anlatır, şerit İNSANLARI.
 */

const SLOTS = 5
const STEP = 26
const R = 8
const cxOf = (i: number) => 10 + i * STEP
const W = cxOf(SLOTS - 1) + 10   // 124

const FALLBACK = ['#BE5127', '#2E6B45', '#7B4B94', '#B5641F', '#2A5B8F']

export type SeatMember = { avatar_url?: string | null; name?: string | null }

type Props = {
  count: number
  members?: SeatMember[]
  /** clipPath id'leri global — benzersiz olmalı. */
  id: string
  size?: 'sm' | 'lg'
  hideLabel?: boolean
}

export default function Seats({ count, members = [], id, size = 'sm', hideLabel = false }: Props) {
  const overflowing = count > SLOTS
  const filled = overflowing ? SLOTS - 1 : count
  const overflow = overflowing ? count - filled : 0

  const slots = Array.from({ length: SLOTS }, (_, i) => i)
  const photoSlots = slots.slice(0, filled).filter((i) => Boolean(members[i]?.avatar_url))

  const label =
    count === 0
      ? 'masa hazır — ilk sen otur'
      : `${count} kişi oturuyor${count < SLOTS ? ', yer var' : ''}`

  return (
    <div className={`seats seats-${size}`}>
      <svg viewBox={`0 0 ${W} 26`} role="img" aria-label={label} className="seats-svg">
        <defs>
          {photoSlots.map((i) => (
            <clipPath key={i} id={`seat-${id}-${i}`}>
              <circle cx={cxOf(i)} cy="9" r={R} />
            </clipPath>
          ))}
        </defs>

        {/* Boş yerler — kesikli halka, "buraya oturabilirsin" */}
        <g fill="none" stroke="var(--seat-empty)" strokeWidth="1.6" strokeDasharray="3.5 3" className="seat-empty">
          {slots.slice(filled).map((i) => (
            <circle key={i} cx={cxOf(i)} cy="9" r={R} />
          ))}
        </g>

        {/* Dolu yerler — fotoğraf varsa fotoğraf, yoksa düz renk */}
        {slots.slice(0, filled).map((i) => {
          const url = members[i]?.avatar_url
          return url ? (
            <image
              key={i}
              href={url}
              x={cxOf(i) - R}
              y={9 - R}
              width={R * 2}
              height={R * 2}
              preserveAspectRatio="xMidYMid slice"
              clipPath={`url(#seat-${id}-${i})`}
            />
          ) : (
            <circle key={i} cx={cxOf(i)} cy="9" r={R} fill={FALLBACK[i % FALLBACK.length]} />
          )
        })}

        {overflow > 0 && (
          <text
            x={cxOf(SLOTS - 1)}
            y="13"
            textAnchor="middle"
            fontSize="11"
            fill="var(--muted)"
            style={{ fontFamily: 'var(--font-mono), monospace' }}
          >
            +{overflow}
          </text>
        )}

        {/* Masa çizgisi. Kimse yoksa soluk. */}
        <rect
          x="0"
          y="21"
          width={W}
          height="2.4"
          rx="1.2"
          fill={count > 0 ? 'var(--ink)' : 'var(--seat-empty)'}
        />
      </svg>

      {!hideLabel && (
        <p className="seats-label">
          {count === 0 ? (
            <span className="seats-open">masa hazır — ilk sen otur</span>
          ) : (
            <>
              {count} kişi oturuyor
              {count < SLOTS && <span className="seats-open"> · yer var</span>}
            </>
          )}
        </p>
      )}
    </div>
  )
}
