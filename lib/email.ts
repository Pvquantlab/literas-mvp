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

type SendEmailArgs = {
  to: string | string[]
  subject: string
  html: string
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
