import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// literaslab.com üzerinden gönderim yapıyoruz.
const FROM = 'literas <bildirimler@literaslab.com>'

type SendEmailArgs = {
  to: string | string[]
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailArgs) {
  try {
    const { data, error } = await resend.emails.send({
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
