/**
 * Kategoriler için tek kaynak.
 *
 * Neden iki alan var:
 *   value → veritabanındaki communities.category / events.category değeri.
 *           Mevcut satırları bozmamak için Türkçe karakterli hâli korundu.
 *   slug  → URL'de görünen ASCII hâli. /?category=doga
 *
 * Böylece migration olmadan temiz URL'lere geçiyorsun. İleride DB'yi de
 * ASCII'ye çevirirsen sadece `value` alanlarını güncellemen yeterli.
 */

export type Category = {
  slug: string
  value: string
  label: string
  gradient: [string, string]
}

export const CATEGORIES: Category[] = [
  { slug: 'kitap',       value: 'kitap',       label: 'Kitap',       gradient: ['#BE5127', '#DE7A4A'] },
  { slug: 'doga',        value: 'doğa',        label: 'Doğa',        gradient: ['#2E6B45', '#63A87E'] },
  { slug: 'muzik',       value: 'müzik',       label: 'Müzik',       gradient: ['#7B4B94', '#B58CC9'] },
  { slug: 'lezzet',      value: 'lezzet',      label: 'Lezzet',      gradient: ['#B5641F', '#E39B4E'] },
  { slug: 'dil',         value: 'dil',         label: 'Dil',         gradient: ['#2A5B8F', '#6C9CCB'] },
  { slug: 'spor',        value: 'spor',        label: 'Spor',        gradient: ['#1F6E52', '#4C9A78'] },
  { slug: 'sanat',       value: 'sanat',       label: 'Sanat',       gradient: ['#A83A6E', '#D077A2'] },
  { slug: 'oyun',        value: 'oyun',        label: 'Oyun',        gradient: ['#B04330', '#D97A63'] },
  { slug: 'tech',        value: 'tech',        label: 'Tech',        gradient: ['#2B3A55', '#5B7BB4'] },
  { slug: 'sinema',      value: 'sinema',      label: 'Sinema',      gradient: ['#544A86', '#8A7DC0'] },
  { slug: 'fotograf',    value: 'fotoğraf',    label: 'Fotoğraf',    gradient: ['#23697A', '#5AA3B5'] },
  { slug: 'gonulluluk',  value: 'gönüllülük',  label: 'Gönüllülük',  gradient: ['#A34A22', '#CE7B4E'] },
  { slug: 'kariyer',     value: 'kariyer',     label: 'Kariyer',     gradient: ['#46603A', '#7D9A6C'] },
  { slug: 'sosyal',      value: 'sosyal',      label: 'Sosyal',      gradient: ['#A8354F', '#D06B84'] },
]

const DEFAULT_GRADIENT: [string, string] = ['#5A6B58', '#8FA28B']

/** URL slug'ından kategoriyi bulur. */
export function bySlug(slug: string | null | undefined): Category | null {
  if (!slug) return null
  return CATEGORIES.find((c) => c.slug === slug) ?? null
}

/** DB değerinden kategoriyi bulur. Eski Türkçe slug'lar da kabul edilir. */
export function byValue(value: string | null | undefined): Category | null {
  if (!value) return null
  return CATEGORIES.find((c) => c.value === value || c.slug === value) ?? null
}

/** Kapak görseli olmayan kartlar için kategori gradyanı. */
export function categoryGradient(value: string | null | undefined): string {
  const [a, b] = byValue(value)?.gradient ?? DEFAULT_GRADIENT
  return `linear-gradient(135deg, ${a}, ${b})`
}

/**
 * Serbest metin aramasını güvenli hâle getirir.
 *
 * Supabase istemcisi sorguyu parametreleştirdiği için SQL injection riski
 * yok — ama `%` ve `_` ILIKE joker karakterleri olduğundan kullanıcının
 * yazdığı `%` tüm tabloyu tarar. Ayrıca uzunluk sınırı koyuyoruz.
 */
export function sanitizeQuery(raw: string | null | undefined): string | null {
  if (!raw) return null
  const cleaned = raw.trim().slice(0, 64).replace(/[%_\\]/g, '\\$&')
  return cleaned.length > 0 ? cleaned : null
}
