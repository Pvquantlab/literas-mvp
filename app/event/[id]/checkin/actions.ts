'use server'

import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { checkUserRateLimit } from '@/lib/rate-limit'
import { z } from 'zod'

const tokenSchema = z.object({
  event_id: z.string().uuid({ message: 'Geçersiz etkinlik' }),
  token: z.string().uuid({ message: 'Geçersiz kod' }),
})

/**
 * Kullanıcıya taşınan hata kodları. Serbest metin DEĞİL: `?hata=` adres
 * çubuğundan geliyor, yani okutulan QR'ı kuran kişi burayı doldurabilir.
 * Metin gönderseydik katılımcı, organizatöre kendi yazdığı bir "sistem
 * mesajını" gösterebilirdi. Kod gönderiyoruz, metni sayfa seçiyor.
 */
export type CheckinHata = 'limit' | 'gecersiz' | 'yetkisiz' | 'basarisiz'

/**
 * Action sonucunu kullanıcıya taşır. `<form action={fn}>` deseninde dönüş
 * değeri kullanıcıya ulaşmadığı için sonucu query parametresiyle geri
 * gönderiyoruz. redirect() istisna fırlatır — try/catch içine alma.
 *
 * eventId/token kodlanıyor: bu değerler formun hidden alanlarından, yani
 * kullanıcı kontrolündeki bir kanaldan geliyor. Bugün sabit `/event/`
 * ön eki sayesinde adres site dışına çıkamıyordu, ama savunma o ön ekin
 * tesadüfüne dayanmasın.
 */
function sonuc(eventId: string, token: string, hata?: CheckinHata): never {
  const taban = `/event/${encodeURIComponent(eventId)}/checkin?t=${encodeURIComponent(token)}`
  redirect(hata ? `${taban}&hata=${hata}` : taban)
}

async function calistir(formData: FormData, islem: 'yap' | 'geri_al') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Rate limit ve zod adımlarında henüz doğrulanmış event_id/token yok.
  // Bu ikisi sayfanın kendi hidden alanlarından geliyor (kullanıcı normal
  // akışta değiştirmiyor), o yüzden hata mesajını doğru sekmeye taşımak
  // için ham (doğrulanmamış) değerleri kullanıyoruz.
  const rawEventId = String(formData.get('event_id') ?? '')
  const rawToken = String(formData.get('token') ?? '')

  if (!(await checkUserRateLimit(user.id, 'normal'))) {
    return sonuc(rawEventId, rawToken, 'limit')
  }

  const parsed = tokenSchema.safeParse({
    event_id: rawEventId,
    token: rawToken,
  })
  if (!parsed.success) {
    return sonuc(rawEventId, rawToken, 'gecersiz')
  }

  const { event_id, token } = parsed.data
  const { error } = await supabase.rpc(
    islem === 'yap' ? 'checkin_yap' : 'checkin_geri_al',
    { p_token: token }
  )

  if (error) {
    if (error.message?.includes('yetkisiz')) {
      return sonuc(event_id, token, 'yetkisiz')
    }
    console.error('[checkin] islem hatasi:', error)
    return sonuc(event_id, token, 'basarisiz')
  }

  revalidatePath(`/event/${event_id}/checkin`)
  sonuc(event_id, token)
}

export async function girisiOnayla(formData: FormData) {
  return calistir(formData, 'yap')
}

export async function girisiGeriAl(formData: FormData) {
  return calistir(formData, 'geri_al')
}
