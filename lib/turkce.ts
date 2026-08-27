/**
 * Türkçe ek üretimi — tek kaynak.
 *
 * NEDEN: Şehir adlarına ek sabit '&apos;da olarak yapıştırılıyordu. Bu İstanbul
 * için doğru ama "İzmir'da", "Sinop'da", "Gaziantep'da" hepsi yanlış.
 * Türkçe yerellik bu ürünün farklılaşma noktası; ek uyumu doğru olmalı.
 *
 * Kurallar:
 *  - Ünlü uyumu: son ünlü a/ı/o/u → "da", e/i/ö/ü → "de"
 *  - Ünsüz benzeşmesi: son harf sert ünsüz (f s t k ç ş h p) → "ta"/"te"
 *  - Özel ad olduğu için kesme işareti ile ayrılır
 */

const KALIN = new Set(['a', 'ı', 'o', 'u', 'â', 'î', 'û'])
const INCE = new Set(['e', 'i', 'ö', 'ü'])
const SERT = new Set(['f', 's', 't', 'k', 'ç', 'ş', 'h', 'p'])

/** Türkçe'ye duyarlı küçültme — 'I' → 'ı', 'İ' → 'i' */
function kucult(s: string): string {
  return s.replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase()
}

/**
 * Bulunma hâli eki: "İstanbul" → "İstanbul'da", "İzmir" → "İzmir'de",
 * "Sinop" → "Sinop'ta", "Gaziantep" → "Gaziantep'te".
 *
 * Ad boşsa null döner — çağıran taraf cümleyi şehirsiz kurmalı.
 */
export function bulunmaHali(ad: string | null | undefined): string | null {
  const temiz = ad?.trim()
  if (!temiz) return null

  const harfler = kucult(temiz)

  // Son ünlüyü sondan başlayarak ara (ör. "Kadıköy" → ö → ince)
  let kalinMi = true
  for (let i = harfler.length - 1; i >= 0; i--) {
    const h = harfler[i]
    if (KALIN.has(h)) { kalinMi = true; break }
    if (INCE.has(h)) { kalinMi = false; break }
  }

  const sonHarf = harfler[harfler.length - 1]
  const sertMi = SERT.has(sonHarf)

  const ek = sertMi ? (kalinMi ? 'ta' : 'te') : (kalinMi ? 'da' : 'de')
  return `${temiz}'${ek}`
}
