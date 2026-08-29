import { createClient } from '@/lib/supabase-server'
import { SITE_URL } from '@/lib/site'
import { qrSvg } from '@/lib/qr'

/**
 * Katılımcının kapıda okutacağı QR.
 *
 * Token istemciye HİÇ inmez: yalnızca QR'ın içine gömülür. checkin_kodum
 * SECURITY DEFINER olduğu için kullanıcı başkasının token'ını alamaz.
 */
export default async function CheckinQr({ eventId }: { eventId: string }) {
  const supabase = await createClient()
  const { data: token, error } = await supabase.rpc('checkin_kodum', { p_event_id: eventId })
  // Bileşen yalnızca userHasRsvp doğruyken çağrılıyor, yani token null
  // dönerse "RSVP yok" değil gerçek bir hata var — en azından iz bırak.
  if (!token) {
    if (error) console.error('[checkin] kod alinamadi:', error)
    return null
  }

  const svg = await qrSvg(`${SITE_URL}/event/${eventId}/checkin?t=${token}`)

  return (
    <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
      <div
        aria-label="Giriş QR kodun"
        style={{ lineHeight: 0, background: '#fff', padding: 10, borderRadius: 'var(--r-md)' }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, margin: 0 }}>
        Giriş kodun.<br />Kapıda bunu okut.
      </p>
    </div>
  )
}
