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

  const rl = await checkRateLimit(req, user.id, 'strict')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Cok fazla istek, biraz bekle' },
      { status: 429, headers: rl.headers }
    )
  }

  const parsed = waitlistSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Gecersiz veri', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }
  const { event_id } = parsed.data

  const { data: event } = await supabase
    .from('events')
    .select('id, max_attendees')
    .eq('id', event_id)
    .maybeSingle()

  if (!event) {
    return NextResponse.json({ error: 'Etkinlik bulunamadi' }, { status: 404 })
  }

  const { data: existingRsvp } = await supabase
    .from('rsvps')
    .select('id')
    .eq('event_id', event_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existingRsvp) {
    return NextResponse.json(
      { error: 'Zaten katiliyorsun, bekleme listesi gerekmiyor' },
      { status: 400 }
    )
  }

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
    return NextResponse.json(
      { error: 'Bekleme listesine eklenemedi' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}

// DELETE: waitlist'ten cik
export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Giris yapmalisin' }, { status: 401 })
  }

  const rl = await checkRateLimit(req, user.id, 'normal')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Cok fazla istek, biraz bekle' },
      { status: 429, headers: rl.headers }
    )
  }

  // POST ile ayni dogrulama: event_id gecerli bir uuid olmali
  const url = new URL(req.url)
  const parsed = waitlistSchema.safeParse({
    event_id: url.searchParams.get('event_id'),
  })
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Gecersiz veri', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }
  const { event_id } = parsed.data

  const { error: deleteError } = await supabase
    .from('waitlist')
    .delete()
    .eq('event_id', event_id)
    .eq('user_id', user.id)

  if (deleteError) {
    console.error('[waitlist] delete hatasi:', deleteError)
    return NextResponse.json(
      { error: 'Bekleme listesinden cikarilamadi' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
