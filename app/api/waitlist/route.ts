import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { waitlistSchema } from '@/lib/validations'
import { checkRateLimit } from '@/lib/rate-limit'

// POST: waitlist'e gir
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Giris yapmalisin' }, { status: 401 })
  }

  // Rate limit (hassas uç — dakikada 3)
  const rl = await checkRateLimit(req, user.id, 'strict')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Çok fazla istek, biraz bekle' },
      { status: 429, headers: rl.headers }
    )
  }

  const parsed = waitlistSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Geçersiz veri', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }
  const { event_id } = parsed.data

  // Etkinlik var mi kontrolu
  const { data: event } = await supabase
    .from('events')
    .select('id, max_attendees')
    .eq('id', event_id)
    .single()

  if (!event) {
    return NextResponse.json({ error: 'Etkinlik bulunamadi' }, { status: 404 })
  }

  // Zaten RSVP mi vermis?
  const { data: existingRsvp } = await supabase
    .from('rsvps')
    .select('id')
    .eq('event_id', event_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existingRsvp) {
    return NextResponse.json(
      { error: 'Zaten katiliyorsun, waitlist gerekmiyor' },
      { status: 400 }
    )
  }

  // Waitlist'e ekle
  const { error: insertError } = await supabase
    .from('waitlist')
    .insert({ event_id, user_id: user.id })

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json(
        { error: 'Zaten bekleme listesindesin' },
        { status: 409 }
      )
    }
    console.error('[waitlist] insert hatasi:', insertError)
    return NextResponse.json({ error: 'Bekleme listesine eklenemedi' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// DELETE: waitlist'ten cik
export async function DELETE(req: Request) {
  const url = new URL(req.url)
  const eventId = url.searchParams.get('event_id')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Giris yapmalisin' }, { status: 401 })
  }

  if (!eventId) {
    return NextResponse.json({ error: 'Etkinlik ID eksik' }, { status: 400 })
  }

  const { error: deleteError } = await supabase
    .from('waitlist')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', user.id)

  if (deleteError) {
    console.error('[waitlist] delete hatasi:', deleteError)
    return NextResponse.json({ error: 'Bekleme listesinden cikarilamadi' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
