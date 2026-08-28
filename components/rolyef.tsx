/**
 * literas rölyef seti — künye ızgarasının illüstrasyonları.
 *
 * NEDEN VAR: week.wild.plus'ın gücünün çoğu hücreleri dolduran büyük beyaz
 * alçı rölyeflerden geliyor. Kategori siluetlerini büyütüp soluklaştırmak
 * yetmedi — onlar 48px'lik ikon olarak çizilmiş, dev ölçekte leke gibi
 * okunuyorlar.
 *
 * DİL: gravür. Kontur + paralel tarama, tek renk, degrade yok.
 * Referansın fotogerçekçi 3B rölyefleri taklit edilmiyor — edilemezdi;
 * onlar render. Gravür hem matbaa diline daha yakın hem de SVG'de dürüstçe
 * üretilebiliyor, üstelik büyük ölçekte ve düşük opaklıkta iyi okunuyor.
 *
 * KONULAR literas'ın kendi dünyasından: marka metaforu zaten "kendi masanı
 * kur". Yunan mitolojisi ödünç almak taklit olurdu.
 *
 * Hepsi 200×200 viewBox, `currentColor` ile boyanır — kullanan taraf rengi
 * ve opaklığı belirler.
 */

type Props = { className?: string; style?: React.CSSProperties }

const ortak = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

/** Paralel tarama — gravürün gölge dili. */
function Tarama({
  x, y, w, h, aralik = 7, egim = 0,
}: { x: number; y: number; w: number; h: number; aralik?: number; egim?: number }) {
  const cizgiler = []
  for (let i = 0; i <= w / aralik; i++) {
    const cx = x + i * aralik
    cizgiler.push(
      <line key={i} x1={cx} y1={y} x2={cx + egim} y2={y + h} stroke="currentColor" strokeWidth="1.1" opacity=".55" />
    )
  }
  return <g>{cizgiler}</g>
}

/** Masa: markanın çekirdek metaforu — etrafında toplanılan yer. */
export function RolyefMasa({ className, style }: Props) {
  return (
    <svg viewBox="0 0 200 200" className={className} style={style} aria-hidden="true">
      <g {...ortak}>
        {/* tabla */}
        <ellipse cx="100" cy="96" rx="72" ry="26" />
        <path d="M28 96 v10 a72 26 0 0 0 144 0 V96" />
        {/* ayak */}
        <path d="M100 122 v40" />
        <path d="M74 176 q26 -14 52 0" />
        {/* iki fincan */}
        <ellipse cx="76" cy="88" rx="13" ry="5.5" />
        <path d="M63 88 v6 a13 5.5 0 0 0 26 0 v-6" />
        <ellipse cx="126" cy="92" rx="13" ry="5.5" />
        <path d="M113 92 v6 a13 5.5 0 0 0 26 0 v-6" />
        {/* arkada iki sandalye sırtı */}
        <path d="M52 74 v-30 a10 10 0 0 1 20 0 v30" />
        <path d="M130 70 v-30 a10 10 0 0 1 20 0 v30" />
      </g>
      <g clipPath="url(#rolyef-masa-kirp)">
        <Tarama x={30} y={106} w={140} h={18} aralik={8} egim={4} />
      </g>
      <clipPath id="rolyef-masa-kirp">
        <path d="M28 96 v10 a72 26 0 0 0 144 0 V96 Z" />
      </clipPath>
    </svg>
  )
}

/** Kahve: buluşmanın bahanesi. */
export function RolyefKahve({ className, style }: Props) {
  return (
    <svg viewBox="0 0 200 200" className={className} style={style} aria-hidden="true">
      <g {...ortak}>
        {/* buhar */}
        <path d="M84 46 q10 -12 0 -24 q-10 -12 0 -22" />
        <path d="M108 46 q10 -12 0 -24 q-10 -12 0 -22" />
        {/* fincan */}
        <path d="M56 74 h84 v34 a42 42 0 0 1 -84 0 Z" />
        {/* kulp */}
        <path d="M140 82 q26 0 26 16 t-26 16" />
        {/* tabak */}
        <ellipse cx="98" cy="156" rx="66" ry="14" />
        <path d="M32 156 q66 22 132 0" />
      </g>
      <g clipPath="url(#rolyef-kahve-kirp)">
        <Tarama x={58} y={76} w={84} h={56} aralik={8} egim={-6} />
      </g>
      <clipPath id="rolyef-kahve-kirp">
        <path d="M56 74 h84 v34 a42 42 0 0 1 -84 0 Z" />
      </clipPath>
    </svg>
  )
}

/** Kitap yığını: literas'ın adının geldiği yer. */
export function RolyefKitap({ className, style }: Props) {
  return (
    <svg viewBox="0 0 200 200" className={className} style={style} aria-hidden="true">
      <g {...ortak}>
        {/* alttan üste üç kitap, hafif kaydırmalı */}
        <rect x="30" y="140" width="140" height="26" rx="3" />
        <path d="M30 148 h140" />
        <rect x="40" y="112" width="122" height="26" rx="3" />
        <path d="M40 120 h122" />
        <rect x="26" y="84" width="132" height="26" rx="3" />
        <path d="M26 92 h132" />
        {/* en üstte açık kitap */}
        <path d="M52 78 q30 -14 46 -4 q16 -10 46 4" />
        <path d="M98 74 v-26" />
        <path d="M52 78 v-26 q30 -14 46 -4 q16 -10 46 4 v26" />
      </g>
      <g clipPath="url(#rolyef-kitap-kirp)">
        <Tarama x={28} y={150} w={142} h={16} aralik={9} egim={0} />
      </g>
      <clipPath id="rolyef-kitap-kirp">
        <rect x="30" y="148" width="140" height="18" />
      </clipPath>
    </svg>
  )
}

/** Sandalye: logodaki nesne; "bir masa aç" davetinin ikinci yarısı. */
export function RolyefSandalye({ className, style }: Props) {
  return (
    <svg viewBox="0 0 200 200" className={className} style={style} aria-hidden="true">
      <g {...ortak}>
        {/* sırt */}
        <path d="M64 108 V44 a14 14 0 0 1 28 0 v64" />
        <path d="M64 62 h28" />
        <path d="M64 82 h28" />
        {/* oturak */}
        <path d="M56 108 h84 l-8 18 H64 Z" />
        {/* ayaklar */}
        <path d="M66 126 v44" />
        <path d="M130 126 v44" />
        <path d="M74 126 l16 44" />
        <path d="M66 150 h64" />
      </g>
      <g clipPath="url(#rolyef-sandalye-kirp)">
        <Tarama x={58} y={110} w={82} h={16} aralik={8} egim={-4} />
      </g>
      <clipPath id="rolyef-sandalye-kirp">
        <path d="M56 108 h84 l-8 18 H64 Z" />
      </clipPath>
    </svg>
  )
}

/** Şehir: buluşmaların geçtiği yer — çatılar ve kubbe. */
export function RolyefSehir({ className, style }: Props) {
  return (
    <svg viewBox="0 0 200 200" className={className} style={style} aria-hidden="true">
      <g {...ortak}>
        <path d="M14 168 h172" />
        {/* sol blok */}
        <path d="M26 168 v-52 h34 v52" />
        <path d="M32 128 h6 M48 128 h6 M32 146 h6 M48 146 h6" />
        {/* kubbe */}
        <path d="M74 168 v-40 a26 26 0 0 1 52 0 v40" />
        <path d="M100 102 v-14" />
        {/* minare */}
        <path d="M140 168 v-72 l6 -14 l6 14 v72" />
        <path d="M140 126 h12" />
        {/* sağ blok */}
        <path d="M160 168 v-38 h22 v38" />
        <path d="M166 142 h4 M176 142 h4" />
      </g>
      <g clipPath="url(#rolyef-sehir-kirp)">
        <Tarama x={74} y={128} w={54} h={40} aralik={9} egim={0} />
      </g>
      <clipPath id="rolyef-sehir-kirp">
        <path d="M74 168 v-40 a26 26 0 0 1 52 0 v40 Z" />
      </clipPath>
    </svg>
  )
}

/**
 * Rölyefi hücreye yerleştiren kap.
 *
 * Referansta rölyefler hücreye TAŞACAK kadar büyük ve kompozisyona göre
 * yerleşmiş — ortada duran, kırpılmamış bir görsel o etkiyi vermiyor.
 * Bu yüzden ölçek 1'den büyük ve konum ayarlanabilir.
 */
export function RolyefKap({
  cizim: Cizim,
  konum = 'sag-alt',
  olcek = 1.15,
  opaklik = 0.13,
  renk = 'var(--ink)',
}: {
  cizim: (p: Props) => React.JSX.Element
  konum?: 'sag-alt' | 'sol-alt' | 'orta' | 'sag-ust'
  olcek?: number
  opaklik?: number
  /** Mavi dolgu gibi koyu zeminlerde beyaza çekilir. */
  renk?: string
}) {
  const yer =
    konum === 'sag-alt' ? { right: '-6%', bottom: '-8%' }
      : konum === 'sol-alt' ? { left: '-8%', bottom: '-8%' }
      : konum === 'sag-ust' ? { right: '-6%', top: '-8%' }
        : { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        width: `${olcek * 78}%`,
        aspectRatio: '1',
        color: renk,
        opacity: opaklik,
        pointerEvents: 'none',
        ...yer,
      }}
    >
      <Cizim style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}
