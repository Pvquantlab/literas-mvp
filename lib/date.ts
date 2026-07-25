/**
 * Tarih ve saat biçimlendirme — tek kaynak.
 *
 * NEDEN: Vercel sunucuları UTC'de çalışıyor. timeZone belirtilmeyen her
 * toLocaleDateString çağrısı yaz aylarında 3 saat, kışta 3 saat kaydırıyor.
 * Lokalde fark edilmiyor çünkü geliştirme makinesi zaten İstanbul saatinde.
 *
 * Sonuç: WhatsApp paylaşımında görselde 14:17, metinde 11:17 yazıyordu.
 * Hatırlatma e-postaları da yanlış saatle gidiyordu.
 *
 * KURAL: uygulamada hiçbir yerde doğrudan toLocaleDateString / toLocaleTimeString
 * / toISOString kullanma. Hep buradaki fonksiyonları çağır.
 */

export const TZ = 'Europe/Istanbul'

/** "4 Ağustos" */
export function formatDayMonth(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    timeZone: TZ,
  })
}

/** "4 Ağu" */
export function formatDayMonthShort(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    timeZone: TZ,
  })
}

/** "ağu" — tarih omurgasının üst satırı */
export function formatMonthShort(iso: string): string {
  return new Date(iso)
    .toLocaleDateString('tr-TR', { month: 'short', timeZone: TZ })
    .toLowerCase()
}

/** Ayın günü, sayı olarak. Gece yarısı kaymalarını önler. */
export function dayOfMonth(iso: string): number {
  return Number(
    new Intl.DateTimeFormat('en-CA', { day: 'numeric', timeZone: TZ }).format(new Date(iso))
  )
}

/** "14:17" */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  })
}

/** "4 Ağustos 14:17" — paylaşım metni ve e-postalar için */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  })
}

/** "Salı, 4 Ağustos 2026, 14:17" — uzun hâli */
export function formatDateTimeLong(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  })
}

/** "Salı" */
export function formatWeekday(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', { weekday: 'long', timeZone: TZ })
}

/**
 * Gruplama anahtarı: "2026-08-04" — İSTANBUL gününe göre.
 *
 * toISOString().slice(0,10) UTC gününü verir. Gece 02:00'deki bir İstanbul
 * etkinliği UTC'de bir önceki güne düşer ve yanlış tarih başlığı altında
 * listelenir. Bu fonksiyon o hatayı önler.
 */
export function dayKey(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: TZ,
  }).format(new Date(iso))
}

/** "Bugün" / "Yarın" / "Salı" — İstanbul gününe göre karşılaştırır. */
export function dayLabel(iso: string): string {
  const key = dayKey(iso)
  const now = new Date()
  const tomorrow = new Date(now.getTime() + 86400000)

  if (key === dayKey(now.toISOString())) return 'Bugün'
  if (key === dayKey(tomorrow.toISOString())) return 'Yarın'
  return formatWeekday(iso)
}
