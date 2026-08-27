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

/** "04.08.2026 14:17" — admin tabloları gibi kompakt zaman damgaları için */
export function formatDateTimeShort(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
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

/**
 * Verilen anın İstanbul ofsetini milisaniye olarak döndürür.
 * Sabit +03:00 varsaymak yerine Intl'e sorar; ofset kuralı değişirse kod bozulmaz.
 */
function tzOffsetMs(utcMs: number): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: TZ,
  }).formatToParts(new Date(utcMs))
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value)
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') % 24,
    get('minute'),
    get('second')
  )
  return asUtc - utcMs
}

/**
 * datetime-local girdisini ("2026-08-04T14:17") ISO'ya çevirir.
 *
 * NEDEN: `new Date(value).toISOString()` girdiyi TARAYICININ saat dilimine göre
 * yorumlar. Berlin'deki bir organizatör 19:00 seçtiğinde etkinlik 20:00 İstanbul
 * olarak kaydediliyordu. Okuma yolu İstanbul'a sabitken yazma yolu sabit değildi.
 * Burada girdi her zaman İstanbul duvar saati kabul edilir.
 */
export function localInputToISO(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value)
  if (!m) return new Date(value).toISOString()
  const [, y, mo, d, h, mi] = m
  const wallAsUtc = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi))
  return new Date(wallAsUtc - tzOffsetMs(wallAsUtc)).toISOString()
}

/** ISO → datetime-local değeri ("2026-08-04T14:17"), İstanbul duvar saatiyle. */
export function isoToLocalInput(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: TZ,
  }).formatToParts(new Date(iso))
  const get = (type: string) => parts.find((p) => p.type === type)!.value
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
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
