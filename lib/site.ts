/**
 * Sitenin genel adresi — tek kaynak.
 *
 * NEDEN: adres beş ayrı dosyada sabit yazılıydı (layout metadata, sitemap,
 * robots, .ics ucu, cron mailleri). Sonuç: preview dağıtımlarında OG
 * görselleri, sitemap ve mail bağlantıları hep PRODUCTION'ı gösteriyordu.
 * Bir preview'da yaptığın değişikliği paylaştığında canlı sürüm açılıyordu.
 *
 * Öncelik sırası:
 *   1. NEXT_PUBLIC_SITE_URL — açıkça verilmişse her zaman kazanır.
 *   2. Vercel production — kendi alan adımız.
 *   3. VERCEL_URL — preview dağıtımı kendi adresini gösterir (asıl düzeltme).
 *   4. localhost — yerel geliştirme.
 *
 * NOT: VERCEL_URL `NEXT_PUBLIC_` önekli değil, yani yalnızca sunucuda okunur.
 * Bu sabit de sadece sunucu tarafında kullanılıyor (metadata, sitemap, robots,
 * route handler'lar). İstemci bileşeninde kullanman gerekirse önce
 * NEXT_PUBLIC_SITE_URL'i tanımla.
 */
function siteAdresiniBelirle(): string {
  const acik = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (acik) return acik.replace(/\/+$/, '')

  if (process.env.VERCEL_ENV === 'production') return 'https://www.literaslab.com'
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`

  return 'http://localhost:3000'
}

export const SITE_URL = siteAdresiniBelirle()
