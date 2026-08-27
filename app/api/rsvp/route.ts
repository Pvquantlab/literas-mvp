import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { rsvpSchema } from '@/lib/validations'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * RSVP oluşturma ve iptal.
 *
 * NEDEN VAR: bu iki işlem eskiden doğrudan tarayıcıdan Supabase'e gidiyordu.
 * Tek koruma RLS'ti; CLAUDE.md kural 2'nin dört adımının hiçbiri
 * uygulanamıyordu — rate limit yok, sunucu doğrulaması yok.
 *
 * Rate limit özellikle önemliydi: RSVP'yi hızlıca aç-kapa yapmak her
 * kapanışta promote_from_waitlist trigger'ını ateşliyor, o da bekleme
 * listesinden birini terfi ettirip mail kuyruğuna satır ekliyor. Sınırsız
 * hızda yapılabilseydi Resend kotası tüketilebilirdi.
 *
 * Hata eşlemesi de burada: istemci eskiden hata METNİNDE 'EVENT_FULL'
 * arıyordu. Artık sunucu net durum kodu ve Türkçe mesaj dönüyor.
 */

// POST: etkinliğe katıl
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Giriş yapmalısın' }, { status: 401 })
  }

  const rl = await checkRateLimit(req, user.id, 'normal')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Çok fazla istek, biraz bekle' },
      { status: 429, headers: rl.headers }
    )
  }

  const body = await req.json().catch(() => null)
  const parsed = rsvpSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Geçersiz veri', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }
  const { event_id } = parsed.data

  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', event_id)
    .maybeSingle()

  if (!event) {
    return NextResponse.json({ error: 'Etkinlik bulunamadı' }, { status: 404 })
  }

  const { error: insertError } = await supabase
    .from('rsvps')
    .insert({ event_id, user_id: user.id })

  if (insertError) {
    // Kapasite trigger'ı (check_rsvp_capacity) P0001 ile 'EVENT_FULL' atıyor.
    if (insertError.message?.includes('EVENT_FULL')) {
      return NextResponse.json(
        { error: 'Bu etkinlik az önce doldu. Bekleme listesine girebilirsin.', kod: 'EVENT_FULL' },
        { status: 409 }
      )
    }
    // Aynı kullanıcı ikinci kez: unique (event_id, user_id) ihlali.
    if (insertError.code === '23505') {
      return NextResponse.json({ error: 'Zaten katılıyorsun' }, { status: 409 })
    }
    // RLS reddi: yalnızca topluluğun onaylı üyesi RSVP verebilir.
    if (insertError.code === '42501' || insertError.message?.includes('row-level security')) {
      return NextResponse.json(
        { error: 'Bu etkinliğe katılmak için topluluğun onaylı üyesi olmalısın' },
        { status: 403 }
      )
    }
    console.error('[rsvp] insert hatası:', insertError)
    return NextResponse.json({ error: 'Katılım kaydedilemedi' }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { headers: rl.headers })
}

// DELETE: katılımı iptal et
export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Giriş yapmalısın' }, { status: 401 })
  }

  const rl = await checkRateLimit(req, user.id, 'normal')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Çok fazla istek, biraz bekle' },
      { status: 429, headers: rl.headers }
    )
  }

  // POST ile aynı doğrulama: event_id geçerli bir uuid olmalı.
  const url = new URL(req.url)
  const parsed = rsvpSchema.safeParse({ event_id: url.searchParams.get('event_id') })
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Geçersiz veri', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }
  const { event_id } = parsed.data

  // Yalnızca kendi kaydını siler; RLS de ayrıca zorluyor.
  const { error: deleteError } = await supabase
    .from('rsvps')
    .delete()
    .eq('event_id', event_id)
    .eq('user_id', user.id)

  if (deleteError) {
    console.error('[rsvp] delete hatası:', deleteError)
    return NextResponse.json({ error: 'İptal edilemedi' }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { headers: rl.headers })
}
