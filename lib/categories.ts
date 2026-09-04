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
 * KATEGORİ BAŞINA RENK YOK (05.09.2026): `colors` ve `gradient` üçlüleri
 * kaldırıldı. Kimlik ŞEKİL (SHAPES/ikon) ve ETİKET ile taşınır; etkinlik
 * kartı parıltısı ve kapak elipsi de mürekkep. Palet tek kromatik renk.
 */

export type Category = {
  slug: string
  value: string
  label: string
}

export const CATEGORIES: Category[] = [
  { slug: 'kitap',       value: 'kitap',       label: 'Kitap' },
  { slug: 'doga',        value: 'doğa',        label: 'Doğa' },
  { slug: 'muzik',       value: 'müzik',       label: 'Müzik' },
  { slug: 'lezzet',      value: 'lezzet',      label: 'Lezzet' },
  { slug: 'dil',         value: 'dil',         label: 'Dil' },
  { slug: 'spor',        value: 'spor',        label: 'Spor' },
  { slug: 'sanat',       value: 'sanat',       label: 'Sanat' },
  { slug: 'oyun',        value: 'oyun',        label: 'Oyun' },
  { slug: 'tech',        value: 'tech',        label: 'Tech' },
  { slug: 'sinema',      value: 'sinema',      label: 'Sinema' },
  { slug: 'fotograf',    value: 'fotoğraf',    label: 'Fotoğraf' },
  { slug: 'gonulluluk',  value: 'gönüllülük',  label: 'Gönüllülük' },
  { slug: 'kariyer',     value: 'kariyer',     label: 'Kariyer' },
  { slug: 'sosyal',      value: 'sosyal',      label: 'Sosyal' },
]


/** Kategorisi olmayan kart için nötr zemin. Bilinçli olarak ikonsuz. */
export const NEUTRAL_COVER: [string, string] = ['var(--obj-mid)', 'var(--obj-dk)']

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
