import { CATEGORIES, byValue, NEUTRAL_COVER } from '@/lib/categories'

/**
 * Kategori kapak sistemi — tek şekil kütüphanesi, iki kap.
 *
 *   <GlossyIcon value />    çıplak parlak ikon
 *   <CategoryCover value /> geniş kapak (kart) / kare kapak (liste thumbnail)
 *
 * NOT: components/category-icon.tsx AYRI bir dosya — filtre şeridi ve
 * upcoming-events onu kullanıyor. İki sistem geçiş boyunca yan yana duruyor.
 * Filtre şeridi buraya geçtiğinde eski dosya silinecek.
 *
 * MİMARÎ: bütün gradyan, sheen ve clipPath tanımları <IconSprite /> içinde
 * BİR KEZ duruyor; kullanım noktaları <use href="#ikon-{slug}"> ile çağırıyor.
 *
 * Neden sayaçla ID üretmiyoruz: prototipte her ikon `uid++` ile ID alıyordu.
 * Next'te bu iki şeyi kırar — sunucu ve istemci farklı sayı üretince
 * hydration uyuşmazlığı olur, ve aynı sayfada 40+ kopya gradyan birikir.
 * ID'ler kategori anahtarından türediği için ikisi de olmuyor.
 *
 * DİKKAT: clipPath ID'leri kategoriye özel olmalı (clip-kitap). Ortak tek
 * bir clip kullanılırsa bütün ikonlar ilk tanımlanan şeklin içine kırpılır.
 *
 * Satori (OG görselleri) <use href> desteklemiyor — OG dosyaları kendi
 * çizimini yapmaya devam ediyor, buraya bağlanmayacak.
 */

/**
 * "Tümü" bir kategori DEĞİL, bir filtre anahtarı — o yüzden CATEGORIES
 * dizisinde yok. Ama filtre satırının ilk karosu olarak ikona ihtiyacı var,
 * bu yüzden burada özel durum olarak duruyor.
 */
export const TUMU_SLUG = 'tumu'
const TUMU_COLORS: [string, string, string] = ['#5C9E7B', '#2F5B43', '#1A3225']

/** Gövde şekli. viewBox 0 0 100 100. */
const SHAPES: Record<string, React.ReactNode> = {
  tumu: (
    <>
      <rect x="20" y="20" width="26" height="26" rx="9" />
      <rect x="54" y="20" width="26" height="26" rx="9" />
      <rect x="20" y="54" width="26" height="26" rx="9" />
      <rect x="54" y="54" width="26" height="26" rx="9" />
    </>
  ),
  kitap: (
    <>
      <path d="M50 30 L24 24 Q18 22 18 29 V70 Q18 76 24 77 L50 83 Z" />
      <path d="M50 30 L76 24 Q82 22 82 29 V70 Q82 76 76 77 L50 83 Z" />
    </>
  ),
  doga: <path d="M50 18 Q84 26 84 52 Q84 80 50 86 Q16 80 16 52 Q16 26 50 18 Z" />,
  muzik: (
    <>
      <ellipse cx="36" cy="72" rx="17" ry="13" transform="rotate(-18 36 72)" />
      <rect x="47" y="16" width="9" height="58" rx="4" />
      <path d="M47 16 L84 8 V30 L47 38 Z" />
    </>
  ),
  lezzet: (
    <>
      <path d="M22 34 H70 V60 Q70 84 46 84 Q22 84 22 60 Z" />
      <path d="M70 42 Q88 42 88 56 Q88 70 70 70 V60 Q78 60 78 56 Q78 52 70 52 Z" />
    </>
  ),
  dil: <path d="M22 18 H78 Q88 18 88 28 V62 Q88 72 78 72 H46 L26 88 V72 H22 Q12 72 12 62 V28 Q12 18 22 18 Z" />,
  spor: <circle cx="50" cy="50" r="34" />,
  sanat: <path d="M50 14 Q88 14 88 48 Q88 68 70 68 Q60 68 60 76 Q60 86 49 86 Q12 86 12 48 Q12 14 50 14 Z" />,
  oyun: <rect x="10" y="32" width="80" height="40" rx="20" />,
  tech: (
    <>
      <rect x="20" y="20" width="60" height="42" rx="8" />
      <path d="M10 68 H90 L98 84 H2 Z" />
    </>
  ),
  sinema: <rect x="14" y="20" width="72" height="62" rx="12" />,
  fotograf: (
    <>
      <rect x="12" y="32" width="76" height="50" rx="14" />
      <path d="M38 32 L44 20 H62 L68 32 Z" />
    </>
  ),
  gonulluluk: (
    <path d="M50 86 C26 66 10 53 10 36 C10 23 20 14 32 14 C40 14 47 19 50 26 C53 19 60 14 68 14 C80 14 90 23 90 36 C90 53 74 66 50 86 Z" />
  ),
  kariyer: (
    <>
      <rect x="12" y="30" width="76" height="52" rx="13" />
      <path d="M36 30 V24 Q36 16 44 16 H56 Q64 16 64 24 V30" fill="none" strokeWidth="9" strokeLinecap="round" />
    </>
  ),
  sosyal: (
    <>
      <circle cx="34" cy="34" r="15" />
      <path d="M12 84 Q12 56 34 56 Q56 56 56 84 Z" />
      <circle cx="68" cy="40" r="12" />
      <path d="M52 84 Q52 62 68 62 Q86 62 86 84 Z" />
    </>
  ),
}

/** Şeklin içine düşen detaylar — hacim hissini bunlar taşıyor. */
function details(slug: string, hi: string, dk: string): React.ReactNode {
  switch (slug) {
    case 'kitap':
      return <rect x="46" y="30" width="8" height="53" rx="4" fill={dk} opacity=".45" />
    case 'doga':
      return (
        <>
          <path d="M50 24 V80" stroke={dk} strokeWidth="5" opacity=".4" strokeLinecap="round" />
          <path d="M50 44 L68 34 M50 58 L34 48" stroke={dk} strokeWidth="4.5" opacity=".35" strokeLinecap="round" />
        </>
      )
    case 'spor':
      return (
        <>
          <ellipse cx="50" cy="50" rx="14" ry="34" fill="none" stroke={dk} strokeWidth="4.5" opacity=".4" />
          <path d="M16 50 H84" stroke={dk} strokeWidth="4.5" opacity=".4" />
        </>
      )
    case 'sanat':
      return (
        <>
          <circle cx="34" cy="38" r="7.5" fill={dk} opacity=".5" />
          <circle cx="58" cy="30" r="7.5" fill={dk} opacity=".38" />
          <circle cx="72" cy="50" r="7.5" fill={dk} opacity=".28" />
        </>
      )
    case 'oyun':
      return (
        <>
          <rect x="22" y="47" width="22" height="7" rx="3.5" fill={dk} opacity=".5" />
          <rect x="29.5" y="39.5" width="7" height="22" rx="3.5" fill={dk} opacity=".5" />
          <circle cx="68" cy="45" r="6.5" fill={dk} opacity=".5" />
          <circle cx="78" cy="58" r="6.5" fill={dk} opacity=".38" />
        </>
      )
    case 'tech':
      return <rect x="27" y="27" width="46" height="28" rx="5" fill={hi} opacity=".55" />
    case 'sinema':
      return (
        <>
          <g fill={dk} opacity=".45">
            <rect x="20" y="24" width="9" height="7" rx="3" />
            <rect x="36" y="24" width="9" height="7" rx="3" />
            <rect x="55" y="24" width="9" height="7" rx="3" />
            <rect x="71" y="24" width="9" height="7" rx="3" />
            <rect x="20" y="71" width="9" height="7" rx="3" />
            <rect x="36" y="71" width="9" height="7" rx="3" />
            <rect x="55" y="71" width="9" height="7" rx="3" />
            <rect x="71" y="71" width="9" height="7" rx="3" />
          </g>
          <path d="M42 40 L64 51 L42 62 Z" fill={hi} opacity=".85" />
        </>
      )
    case 'fotograf':
      return (
        <>
          <circle cx="50" cy="58" r="18" fill={dk} opacity=".45" />
          <circle cx="50" cy="58" r="10" fill={hi} opacity=".65" />
          <rect x="70" y="41" width="10" height="6" rx="3" fill={hi} opacity=".7" />
        </>
      )
    case 'kariyer':
      return (
        <>
          <rect x="12" y="50" width="76" height="8" fill={dk} opacity=".35" />
          <rect x="41" y="46" width="18" height="15" rx="5" fill={hi} opacity=".6" />
        </>
      )
    case 'dil':
      return (
        <>
          <circle cx="34" cy="45" r="6.5" fill={dk} opacity=".45" />
          <circle cx="50" cy="45" r="6.5" fill={dk} opacity=".45" />
          <circle cx="66" cy="45" r="6.5" fill={dk} opacity=".45" />
        </>
      )
    case 'lezzet':
      return <ellipse cx="46" cy="36" rx="24" ry="6" fill={hi} opacity=".5" />
    default:
      return null
  }
}

/**
 * Bütün tanımlar. layout.tsx'te BİR KEZ render edilir, görsel çıktısı yok.
 */
const SPRITE_ITEMS: { slug: string; colors: [string, string, string] }[] = [
  { slug: TUMU_SLUG, colors: TUMU_COLORS },
  ...CATEGORIES.map((c) => ({ slug: c.slug, colors: c.colors })),
]

export function IconSprite() {
  return (
    <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
      <defs>
        <radialGradient id="ci-sheen" cx="26%" cy="18%" r="52%">
          <stop offset="0%" stopColor="#fff" stopOpacity=".85" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <filter id="ci-softblur" x="-45%" y="-45%" width="190%" height="190%">
          <feGaussianBlur stdDeviation="6" />
        </filter>

        {SPRITE_ITEMS.map(({ slug, colors: [hi, base, dk] }) => (
          <linearGradient key={slug} id={`ci-grad-${slug}`} x1="18%" y1="6%" x2="82%" y2="96%">
            <stop offset="0%" stopColor={hi} />
            <stop offset="52%" stopColor={base} />
            <stop offset="100%" stopColor={dk} />
          </linearGradient>
        ))}

        {SPRITE_ITEMS.map(({ slug, colors: [, base, dk] }) => (
          <linearGradient key={slug} id={`ci-bg-${slug}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={base} />
            <stop offset="100%" stopColor={dk} />
          </linearGradient>
        ))}

        <linearGradient id="ci-bg-none" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={NEUTRAL_COVER[0]} />
          <stop offset="100%" stopColor={NEUTRAL_COVER[1]} />
        </linearGradient>

        {SPRITE_ITEMS.map(({ slug }) => (
          <clipPath key={slug} id={`ci-clip-${slug}`}>
            <g>{SHAPES[slug]}</g>
          </clipPath>
        ))}

        {SPRITE_ITEMS.map(({ slug, colors: [hi, base, dk] }) => (
          <symbol key={slug} id={`ci-icon-${slug}`} viewBox="-6 -6 112 112">
            <ellipse cx="50" cy="90" rx="30" ry="8" fill={base} opacity=".35" filter="url(#ci-softblur)" />
            <g fill={`url(#ci-grad-${slug})`} stroke={dk}>
              {SHAPES[slug]}
            </g>
            <g clipPath={`url(#ci-clip-${slug})`}>
              <rect x="-6" y="-6" width="112" height="112" fill="url(#ci-sheen)" />
              {details(slug, hi, dk)}
            </g>
          </symbol>
        ))}
      </defs>
    </svg>
  )
}

type IconProps = { value?: string | null; size?: number; className?: string }

/** Çıplak parlak ikon. Filtre karoları buraya geçince kullanılacak. */
export function GlossyIcon({ value, size = 47, className }: IconProps) {
  const slug = value === TUMU_SLUG ? TUMU_SLUG : byValue(value)?.slug
  if (!slug) return null
  return (
    <svg width={size} height={size} viewBox="-6 -6 112 112" className={className} aria-hidden="true">
      <use href={`#ci-icon-${slug}`} />
    </svg>
  )
}

/**
 * Filtre karosu — düz squircle + parlak 3D ikon + etiket.
 *
 * Cam (backdrop-filter) BİLİNÇLİ olarak kullanılmadı: cam yalnızca arkasında
 * renk karmaşası varsa görünür, bizim zeminimiz düz. Camı görünür kılmak için
 * sayfaya sabit bir mesh katmanı gerekirdi — Safari'de kaydırma maliyeti ve
 * mobilde backdrop-filter yükü karşılığında görsel kazanç küçüktü.
 *
 * Bu bileşen SADECE görünüm. Yönlendirme ve kaydırma mantığı her şeritte
 * kendi yerinde kalıyor, çünkü ana sayfa ?category=, keşfet ?tab=&kategori=
 * kullanıyor. Karoyu paylaşmak görsel tekrarı bitiriyor, URL'leri bozmadan.
 */
export function CategoryTile({
  value,
  label,
  active = false,
  size = 72,
}: {
  value: string
  label: string
  active?: boolean
  size?: number
}) {
  return (
    <>
      <span className={active ? 'ct-sq on' : 'ct-sq'} style={{ width: size, height: size }}>
        <GlossyIcon value={value} size={Math.round(size * 0.66)} />
      </span>
      <span className={active ? 'ct-lbl on' : 'ct-lbl'}>{label}</span>
    </>
  )
}

type CoverProps = {
  value?: string | null
  /** Kapak oranı. Kart için 400×240, liste thumbnail'ı için 120×120. */
  w?: number
  h?: number
  className?: string
}

/**
 * Üretilen kapak. Kullanıcı görseli yoksa bunu göster.
 * Kategori bilinmiyorsa ikon ÇİZİLMEZ — sadece nötr zemin kalır.
 * Uydurma ikon yanlış bilgi verir.
 */
export function CategoryCover({ value, w = 400, h = 240, className }: CoverProps) {
  const cat = byValue(value)
  const scale = w === h ? 0.62 : 1.15
  const s = 100 * scale
  const ox = (w - s) / 2
  const oy = (h - s) / 2

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid slice"
      className={className}
      role="img"
      aria-label={cat ? `${cat.label} kapak görseli` : 'Kapak görseli'}
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      <rect width={w} height={h} fill={cat ? `url(#ci-bg-${cat.slug})` : 'url(#ci-bg-none)'} />
      {cat && (
        <>
          <ellipse cx={w * 0.24} cy={h * 0.16} rx={w * 0.6} ry={h * 0.5} fill={cat.colors[0]} opacity=".22" />
          <g transform={`translate(${ox} ${oy}) scale(${scale})`}>
            <use href={`#ci-icon-${cat.slug}`} width="100" height="100" x="0" y="0" />
          </g>
        </>
      )}
    </svg>
  )
}
