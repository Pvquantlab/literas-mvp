/**
 * Kategoriler için tek kaynak.
 *
 * Neden iki alan var:
 *   value → veritabanındaki communities.category değeri.
 *           Mevcut satırları bozmamak için Türkçe karakterli hâli korundu.
 *   slug  → URL'de görünen ASCII hâli. /?category=doga
 *
 * Böylece migration olmadan temiz URL'lere geçiyorsun. İleride DB'yi de
 * ASCII'ye çevirirsen sadece `value` alanlarını güncellemen yeterli.
 *
 * RENKLER: her kategori üç ton taşır — [açık, ana, koyu]. Bunlar sitenin
 * beş marka renginin ton varyasyonları:
 *   coral #BE5127 · lime #C8EB4B · sarı #FFD84D · koyu yeşil #1E3A2B · adaçayı
 * Yeni hue EKLEME. 14 kategoriyi ayırt etmek için ton varyasyonu yeterli.
 * Sıra da önemli: yan yana gelen kategoriler farklı aileden — yoksa filtre
 * satırı tek renk şerit gibi görünür.
 *
 * `gradient` alanı eski kullanımlar için duruyor (categoryGradient). Yeni
 * kod `colors` kullanmalı; gradient bütün çağrı yerleri geçince silinecek.
 */

export type Category = {
  slug: string
  value: string
  label: string
  /** [açık, ana, koyu] — ikon degradesi ve kapak zemini bundan türer. */
  colors: [string, string, string]
  /** @deprecated `colors` kullan. */
  gradient: [string, string]
}

export const CATEGORIES: Category[] = [
  { slug: 'kitap',       value: 'kitap',       label: 'Kitap',       colors: ['#E7A7CD', '#DB2492', '#76134F'], gradient: ['#BE5127', '#DE7A4A'] },
  { slug: 'doga',        value: 'doğa',        label: 'Doğa',        colors: ['#AADAD5', '#41BEB2', '#246A64'], gradient: ['#2E6B45', '#63A87E'] },
  { slug: 'muzik',       value: 'müzik',       label: 'Müzik',       colors: ['#D2B4E6', '#9033D1', '#4F1A73'], gradient: ['#7B4B94', '#B58CC9'] },
  { slug: 'lezzet',      value: 'lezzet',      label: 'Lezzet',      colors: ['#EAB1DA', '#DE31AD', '#7E1461'], gradient: ['#B5641F', '#E39B4E'] },
  { slug: 'dil',         value: 'dil',         label: 'Dil',         colors: ['#A1BBE2', '#296BCC', '#163A6E'], gradient: ['#2A5B8F', '#6C9CCB'] },
  { slug: 'spor',        value: 'spor',        label: 'Spor',        colors: ['#B3DDDE', '#4CBFC2', '#276F71'], gradient: ['#1F6E52', '#4C9A78'] },
  { slug: 'sanat',       value: 'sanat',       label: 'Sanat',       colors: ['#D5A5E1', '#A32BC0', '#581768'], gradient: ['#A83A6E', '#D077A2'] },
  { slug: 'oyun',        value: 'oyun',        label: 'Oyun',        colors: ['#B4ADE3', '#4331C9', '#241B6E'], gradient: ['#B04330', '#D97A63'] },
  { slug: 'tech',        value: 'tech',        label: 'Tech',        colors: ['#ABBBE5', '#2F5CD5', '#183176'], gradient: ['#2B3A55', '#5B7BB4'] },
  { slug: 'sinema',      value: 'sinema',      label: 'Sinema',      colors: ['#AC9ADC', '#4F2BB0', '#2B175F'], gradient: ['#544A86', '#8A7DC0'] },
  { slug: 'fotograf',    value: 'fotoğraf',    label: 'Fotoğraf',    colors: ['#A3D7CA', '#3EB599', '#226555'], gradient: ['#23697A', '#5AA3B5'] },
  { slug: 'gonulluluk',  value: 'gönüllülük',  label: 'Gönüllülük',  colors: ['#E59DC2', '#CE217B', '#6F1242'], gradient: ['#A34A22', '#CE7B4E'] },
  { slug: 'kariyer',     value: 'kariyer',     label: 'Kariyer',     colors: ['#AFA6E0', '#462EBF', '#261968'], gradient: ['#46603A', '#7D9A6C'] },
  { slug: 'sosyal',      value: 'sosyal',      label: 'Sosyal',      colors: ['#9ABFE0', '#277AC1', '#154268'], gradient: ['#A8354F', '#D06B84'] },
]

const DEFAULT_GRADIENT: [string, string] = ['#5A6B58', '#8FA28B']

/** Kategorisi olmayan kart için nötr zemin. Bilinçli olarak ikonsuz. */
export const NEUTRAL_COVER: [string, string] = ['#2C3E8C', '#101B54']

/**
 * Serbest metin girilen kategori alanı için eşanlamlılar.
 * DB'de `yürüyüş` yazan bir topluluk var; 14 kategoriden hiçbiriyle
 * eşleşmiyordu. Buraya ekleyerek migration olmadan çözülüyor.
 * Anahtarlar trLower()'dan geçmiş hâlde yazılmalı.
 */
const ALIASES: Record<string, string> = {
  'yürüyüş': 'doga',
  'yuruyus': 'doga',
  'doga': 'doga',
  'yemek': 'lezzet',
  'muzik': 'muzik',
  'fotografcilik': 'fotograf',
  'fotoğrafçılık': 'fotograf',
  'teknoloji': 'tech',
  'sinema-film': 'sinema',
  'gonulluluk': 'gonulluluk',
}

/**
 * Türkçe farkındalıklı küçük harf.
 *
 * JS'in toLowerCase()'i İngilizce kuralıyla çalışır: 'IŞIK' → 'işik'.
 * toLocaleLowerCase('tr-TR') de önerilmez — ICU verisi eksik ortamda
 * sessizce İngilizce davranışa döner (devir notundaki trUpper dersi).
 * Bu yüzden iki harfi elle çeviriyoruz.
 */
export function trLower(s: string): string {
  return s.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase()
}

/** URL slug'ından kategoriyi bulur. */
export function bySlug(slug: string | null | undefined): Category | null {
  if (!slug) return null
  return CATEGORIES.find((c) => c.slug === slug) ?? null
}

/**
 * DB değerinden kategoriyi bulur.
 * Sırayla: birebir eşleşme → küçük harf eşleşmesi → eşanlamlı tablosu.
 */
export function byValue(value: string | null | undefined): Category | null {
  if (!value) return null
  const exact = CATEGORIES.find((c) => c.value === value || c.slug === value)
  if (exact) return exact

  const k = trLower(value.trim())
  const loose = CATEGORIES.find((c) => trLower(c.value) === k || c.slug === k)
  if (loose) return loose

  const aliased = ALIASES[k]
  return aliased ? CATEGORIES.find((c) => c.slug === aliased) ?? null : null
}

/**
 * Kapak için üç ton. Kategori yoksa null döner — çağıran taraf
 * ikonsuz nötr zemin çizmeli. Uydurma ikon gösterme.
 */
export function categoryColors(value: string | null | undefined): [string, string, string] | null {
  return byValue(value)?.colors ?? null
}

/** @deprecated Kapaklar `colors` kullanıyor. Eski çağrı yerleri için duruyor. */
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
