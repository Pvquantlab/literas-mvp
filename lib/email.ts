import { Resend } from 'resend'

// RESEND_API_KEY build aşamasında (sayfa verisi toplanırken) tanımlı olmayabilir.
// Modül import anında `new Resend(undefined)` hata fırlatıp build'i kırdığı için
// istemciyi ilk kullanımda lazy başlatıyoruz.
let resend: Resend | null = null

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  if (!resend) resend = new Resend(key)
  return resend
}

// literaslab.com üzerinden gönderim yapıyoruz.
const FROM = 'literas <bildirimler@literaslab.com>'

/**
 * E-posta HTML'ine giren HER değişken buradan geçer (CLAUDE.md kural 3).
 * Eskiden app/api/event/route.ts içinde yerel bir kopyası vardı; duyurular
 * da aynısına ihtiyaç duyunca ikinci kopya çıkarmak yerine buraya alındı.
 */
export function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

type SendEmailArgs = {
  to: string | string[]
  subject: string
  html: string
}

/**
 * Birden çok alıcıya AYRI AYRI gönderir (BCC sızıntısı olmasın diye) ve
 * sonucu loglar.
 *
 * NEDEN: çağıran yerler `await Promise.all(emails.map(sendEmail))` yazıp
 * sonucu tamamen atıyordu. 27.08.2026'da ortaya çıktı ki Resend, alan adı
 * doğrulanmadığı için BİR AY BOYUNCA her gönderimi 403 ile reddetmiş —
 * ve hiçbir yerde tek satır iz kalmamış. Kimse fark etmedi çünkü hata
 * hiçbir şeye yansımıyordu.
 *
 * Artık en az bir gönderim başarısızsa log düşüyor. Gönderimi engellemez;
 * amaç sessizliği bozmak.
 */
export async function sendBulkEmail(
  { to, subject, html }: { to: string[]; subject: string; html: string },
  etiket: string
): Promise<{ gonderildi: number; basarisiz: number }> {
  if (to.length === 0) return { gonderildi: 0, basarisiz: 0 }

  const sonuclar = await Promise.all(
    to.map((email) => sendEmail({ to: [email], subject, html }))
  )

  const basarisizlar = sonuclar.filter((r) => !r.ok)
  if (basarisizlar.length > 0) {
    console.error(
      `[${etiket}] ${basarisizlar.length}/${to.length} mail GÖNDERİLEMEDİ:`,
      basarisizlar[0].error
    )
  }

  return { gonderildi: to.length - basarisizlar.length, basarisiz: basarisizlar.length }
}

/**
 * Alıcılara PARÇALAR hâlinde gönderir.
 *
 * NEDEN: sendBulkEmail hepsini Promise.all ile aynı anda yolluyor. Resend
 * saniyelik istek sınırı uyguluyor ve sendEmail'de yeniden deneme yok —
 * sınıra çarpan alıcının postası sessizce kayboluyor. Duyuru, etkinlik
 * oluşturmaktan çok daha sık gönderilecek bir şey.
 *
 * sendBulkEmail KALDIRILMADI: app/api/event/route.ts ve üyelik postaları onu
 * kullanıyor; onları taşımak ayrı bir iştir.
 */
export async function sendChunkedEmail(
  { to, subject, html }: { to: string[]; subject: string; html: string },
  etiket: string,
  { parcaBoyu = 5, bekleMs = 1000 }: { parcaBoyu?: number; bekleMs?: number } = {}
): Promise<{ gonderildi: number; basarisiz: number }> {
  if (to.length === 0) return { gonderildi: 0, basarisiz: 0 }

  let gonderildi = 0
  let basarisiz = 0
  let ilkHata: unknown = null

  for (let i = 0; i < to.length; i += parcaBoyu) {
    const parca = to.slice(i, i + parcaBoyu)
    const sonuclar = await Promise.all(
      parca.map((email) => sendEmail({ to: [email], subject, html }))
    )
    for (const r of sonuclar) {
      if (r.ok) {
        gonderildi++
      } else {
        basarisiz++
        if (!ilkHata) ilkHata = r.error
      }
    }
    // Son parçadan sonra bekleme yok: gereksiz gecikme olurdu.
    if (i + parcaBoyu < to.length) {
      await new Promise((c) => setTimeout(c, bekleMs))
    }
  }

  if (basarisiz > 0) {
    console.error(`[${etiket}] ${basarisiz}/${to.length} mail GÖNDERİLEMEDİ:`, ilkHata)
  }

  return { gonderildi, basarisiz }
}

export async function sendEmail({ to, subject, html }: SendEmailArgs) {
  const client = getResend()
  if (!client) {
    // Env yoksa e-postayı atla ama çağıran akışı bozma (logla)
    console.error('[email] RESEND_API_KEY tanımlı değil — e-posta atlandı:', subject)
    return { ok: false, error: new Error('RESEND_API_KEY tanımlı değil') }
  }

  try {
    const { data, error } = await client.emails.send({
      from: FROM,
      to,
      subject,
      html,
    })

    if (error) {
      console.error('[email] gönderim hatası:', error)
      return { ok: false, error }
    }

    return { ok: true, data }
  } catch (err) {
    console.error('[email] beklenmedik hata:', err)
    return { ok: false, error: err }
  }
}
