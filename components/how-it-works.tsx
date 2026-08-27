/**
 * "Nasıl çalışır" — kenarlıklı kutu, ikon sırası, aralarında oklar.
 *
 * Çerçevedeki sert ofset gölge sitenin eski imzasıydı; palet değişiminde
 * butonlardan kaldırılmıştı. Burada bölüm çerçevesi olarak geri geliyor.
 *
 * İkonlar sprite'tan gelmiyor: sprite KATEGORİ nesneleri taşıyor, buradaki
 * üçü EYLEM anlatıyor (masa aç / planla / tanış). Aynı 3D dille — üst yüz
 * açık, yan yüz koyu, altta gölge — ama ayrı çizildiler.
 *
 * Renkler spektrumu takip ediyor: turkuaz → mavi → magenta.
 */

type Step = { title: string; body: string; icon: React.ReactNode }

/** Takvim kartındaki gün noktaları. */
const deepDots = 'rgba(20, 48, 107, .42)'

/** Ortak: disk gövdesi (üst elips + yan bant + alt kenar). */
function Disc({ cx, cy, rx, t, id }: { cx: number; cy: number; rx: number; t: number; id: string }) {
  const ry = rx * 0.4
  return (
    <>
      <ellipse cx={cx} cy={cy + t} rx={rx} ry={ry} fill={`url(#${id}-edge)`} />
      <rect x={cx - rx} y={cy} width={rx * 2} height={t} fill={`url(#${id}-side)`} />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${id}-top)`} />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke="#fff" strokeWidth="1.3" opacity=".6" />
    </>
  )
}

function Defs({ id, light, mid, deep }: { id: string; light: string; mid: string; deep: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-top`} x1="12%" y1="0%" x2="88%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="48%" stopColor={light} />
        <stop offset="100%" stopColor={mid} />
      </linearGradient>
      <linearGradient id={`${id}-side`} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor={mid} />
        <stop offset="100%" stopColor={deep} />
      </linearGradient>
      <linearGradient id={`${id}-edge`} x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor={deep} />
        <stop offset="100%" stopColor={mid} />
      </linearGradient>
      <radialGradient id={`${id}-orb`} cx="32%" cy="26%" r="76%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="44%" stopColor={light} />
        <stop offset="100%" stopColor={deep} />
      </radialGradient>
      <filter id={`${id}-sh`} x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="7" stdDeviation="6" floodColor="#0B1470" floodOpacity=".26" />
      </filter>
    </defs>
  )
}

/** 1 — İzometrik yuvarlak masa. Sitenin kendi metaforu. */
function IconMasa() {
  const id = 'hw-masa'
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <Defs id={id} light="#7FEDE0" mid="#2FA9A2" deep="#0E5F6B" />
      <g filter={`url(#${id}-sh)`}>
        <rect x="46" y="58" width="8" height="24" rx="3" fill={`url(#${id}-side)`} />
        <rect x="26" y="54" width="7" height="22" rx="3" fill={`url(#${id}-edge)`} />
        <rect x="67" y="54" width="7" height="22" rx="3" fill={`url(#${id}-edge)`} />
        <Disc cx={50} cy={46} rx={36} t={9} id={id} />
      </g>
    </svg>
  )
}

/** 2 — Takvim kartı. */
function IconPlan() {
  const id = 'hw-plan'
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <Defs id={id} light="#A9C4EE" mid="#2B6FD4" deep="#14306B" />
      <g filter={`url(#${id}-sh)`}>
        <rect x="18" y="30" width="64" height="54" rx="11" fill={`url(#${id}-side)`} />
        <rect x="18" y="26" width="64" height="54" rx="11" fill={`url(#${id}-top)`} />
        <rect x="18" y="26" width="64" height="15" rx="11" fill={`url(#${id}-side)`} opacity=".55" />
        <rect x="31" y="16" width="7" height="18" rx="3.5" fill={`url(#${id}-edge)`} />
        <rect x="62" y="16" width="7" height="18" rx="3.5" fill={`url(#${id}-edge)`} />
        <g fill={deepDots}>
          <circle cx="33" cy="53" r="4" />
          <circle cx="50" cy="53" r="4" />
          <circle cx="67" cy="53" r="4" />
          <circle cx="33" cy="68" r="4" />
          <circle cx="50" cy="68" r="4" />
        </g>
      </g>
    </svg>
  )
}
/** Silindir fincan: alt kenar + gövde + kulp + ağız. */
function Mug({ cx, top, rx, h, id }: { cx: number; top: number; rx: number; h: number; id: string }) {
  const ry = rx * 0.34
  return (
    <g>
      <path
        d={`M${cx + rx - 1} ${top + h * 0.26} q${rx * 0.85} ${h * 0.04} ${rx * 0.8} ${h * 0.28} q0 ${h * 0.24} -${rx * 0.8} ${h * 0.26}`}
        fill="none"
        stroke={`url(#${id}-side)`}
        strokeWidth={rx * 0.30}
        strokeLinecap="round"
      />
      <ellipse cx={cx} cy={top + h} rx={rx} ry={ry} fill={`url(#${id}-edge)`} />
      <rect x={cx - rx} y={top} width={rx * 2} height={h} fill={`url(#${id}-side)`} />
      <ellipse cx={cx} cy={top} rx={rx} ry={ry} fill={`url(#${id}-top)`} />
      <ellipse cx={cx} cy={top} rx={rx * 0.7} ry={ry * 0.68} fill="#5C0F42" opacity=".5" />
      <ellipse cx={cx} cy={top} rx={rx} ry={ry} fill="none" stroke="#fff" strokeWidth="1.3" opacity=".55" />
    </g>
  )
}

/** 3 — İki fincan. "Gerisi kahvenin işi" — masa, takvim, kahve. */
function IconTanis() {
  const id = 'hw-tanis'
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <Defs id={id} light="#F5A9D8" mid="#E040A0" deep="#7A1259" />
      <g filter={`url(#${id}-sh)`}>
        <ellipse cx="52" cy="84" rx="34" ry="8" fill="#0B1470" opacity=".16" />
        <Mug id={id} cx={64} top={40} rx={16} h={26} />
        <Mug id={id} cx={38} top={32} rx={20} h={34} />
      </g>
    </svg>
  )
}

const STEPS: Step[] = [
  { title: 'Bir masa aç', body: 'Konu, şehir, isim. Topluluk kurmak iki dakika sürer.', icon: <IconMasa /> },
  { title: 'Buluşmayı planla', body: 'Tarih ve yer gir. Bağlantıyı paylaş, katılımı gör.', icon: <IconPlan /> },
  { title: 'Tanışın', body: 'İnsanlar gelir. Gerisi kahvenin işi.', icon: <IconTanis /> },
]

function Arrow() {
  return (
    <span className="hw-arrow" aria-hidden="true">
      <svg viewBox="0 0 34 24" fill="none">
        <path
          d="M2 9.5 H20 V3 L32 12 L20 21 V14.5 H2 Z"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

export default function HowItWorks() {
  return (
    <div className="hw">
      <ol className="hw-row">
        {STEPS.map((s, i) => (
          <li key={s.title} className="hw-cell">
            <div className="hw-step">
              <span className="hw-icon">{s.icon}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
            {i < STEPS.length - 1 && <Arrow />}
          </li>
        ))}
      </ol>

      <style>{`
        .hw {
          border: 1.5px solid var(--ink);
          border-radius: var(--r-lg);
          background: var(--paper-cream);
          box-shadow: 7px 7px 0 var(--ink);
          padding: var(--s-7) var(--s-5);
        }
        .hw-row {
          list-style: none;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          gap: 0;
        }
        .hw-cell { display: flex; align-items: center; flex: 1 1 0; min-width: 0; }
        .hw-step { flex: 1 1 auto; text-align: center; padding: 0 var(--s-3); min-width: 0; }
        .hw-icon { display: block; width: clamp(72px, 9vw, 104px); margin: 0 auto var(--s-4); }
        .hw-icon svg { width: 100%; height: auto; display: block; }
        .hw-step h3 {
          font-size: var(--t-lg);
          font-weight: 700;
          color: var(--ink);
          margin: 0 0 var(--s-2);
          letter-spacing: -.01em;
        }
        .hw-step p {
          font-size: var(--t-sm);
          color: var(--muted);
          line-height: 1.55;
          max-width: 30ch;
          margin: 0 auto;
        }
        .hw-arrow {
          flex: none;
          width: 34px;
          color: var(--coral);
          margin-top: clamp(30px, 4vw, 44px);
        }
        .hw-arrow svg { width: 100%; height: auto; display: block; }

        @media (max-width: 760px) {
          .hw { padding: var(--s-6) var(--s-4); box-shadow: 5px 5px 0 var(--ink); }
          .hw-row { flex-direction: column; align-items: stretch; gap: var(--s-3); }
          .hw-cell { flex-direction: column; }
          .hw-arrow { margin: var(--s-2) 0 0; transform: rotate(90deg); }
        }
      `}</style>
    </div>
  )
}
