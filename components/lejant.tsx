import Link from 'next/link'
import { CATEGORIES } from '@/lib/categories'
import { SHAPES } from '@/components/category-art'

/**
 * Lejant — kategori indeksi, program afişinin dipnotu.
 *
 * 14 kare kutu + ikon "uygulama ikon satırı" gibi okunuyordu; afiş dilinde
 * kategoriler bir lejanttır: düz glif + etiket, nokta ile ayrılmış, sarar.
 * Kimlik şekilde kalıyor (aynı SHAPES), kutu gidiyor.
 * Bağlantılar mevcut ?category= sözleşmesini korur; şehir ve arama taşınır.
 */
export default function Lejant({
  activeSlug,
  activeCity,
  query,
  hrefFor,
}: {
  /** ASCII slug (lib/categories `slug`). Keşfet aksanlı değer tutuyor;
   *  çağıran taraf `byValue(...)?.slug` ile çevirip verir. */
  activeSlug: string | null
  activeCity?: string | null
  query?: string | null
  /** Bağlantı sözleşmesi çağırana ait: ana sayfa `?category=slug`,
   *  keşfet `?tab=&kategori=<aksanlı değer>`. Verilmezse ana sayfa. */
  hrefFor?: (slug: string | null) => string
}) {
  const href = hrefFor ?? ((slug: string | null) => {
    const p = new URLSearchParams()
    if (slug) p.set('category', slug)
    if (activeCity) p.set('city', activeCity)
    if (query) p.set('q', query)
    const s = p.toString()
    return s ? `/?${s}` : '/'
  })

  return (
    <nav aria-label="Kategoriler">
      <ul className="lejant">
        <li>
          <Link href={href(null)} aria-current={!activeSlug ? 'true' : undefined}>Tümü</Link>
        </li>
        {CATEGORIES.map((c) => (
          <li key={c.slug}>
            <Link href={href(c.slug)} aria-current={activeSlug === c.slug ? 'true' : undefined}>
              <svg viewBox="0 0 100 100" aria-hidden="true"><g className="ci-body">{SHAPES[c.slug]}</g></svg>
              {c.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
