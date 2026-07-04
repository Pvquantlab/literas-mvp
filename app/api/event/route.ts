import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { sendEmail } from '@/lib/email'

export async function POST(req: Request) {
  const body = await req.json()
  const {
    community_id,
    title,
    description,
    location,
    event_date,
    max_attendees,
    cover_image_url,
  } = body

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Giriş yapmalısın' }, { status: 401 })
  }

  const { data: event, error: insertError } = await supabase
    .from('events')
    .insert({
      title,
      description: description || null,
      location,
      event_date,
      organizer_id: user.id,
      community_id,
      max_attendees: max_attendees ?? null,
      cover_image_url: cover_image_url ?? null,
    })
    .select()
    .single()

  if (insertError || !event) {
    console.error('[event] insert hatası:', insertError)
    return NextResponse.json({ error: 'Etkinlik oluşturulamadı' }, { status: 500 })
  }

  const { data: community } = await supabase
    .from('communities')
    .select('name')
    .eq('id', community_id)
    .single()

  const { data: organizer } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .single()

  const { data: members } = await supabase
    .from('community_members')
    .select('user:profiles!user_id(email, name)')
    .eq('community_id', community_id)
    .eq('status', 'approved')
    .neq('user_id', user.id)

  const emails = (members ?? [])
    .map((m: any) => m.user?.email)
    .filter(Boolean) as string[]

  if (emails.length > 0 && community && organizer) {
    const eventDateStr = new Date(event.event_date).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    await sendEmail({
      to: emails,
      subject: `${community.name} — yeni bir etkinlik`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
          <p style="font-style: italic; color: #B8541A;">No. 0001</p>
          <h1 style="color: #1F4A3D; font-weight: 500; font-size: 1.5rem;">
            ${event.title}
          </h1>
          <p style="color: #1F2A24; opacity: 0.75; font-size: 0.95rem;">
            ${community.name} · ${eventDateStr}
          </p>
          ${event.location ? `<p style="color: #1F2A24;">${event.location}</p>` : ''}
          ${event.description ? `<p style="color: #1F2A24;">${event.description}</p>` : ''}
          <p style="font-style: italic; color: #1F2A24; opacity: 0.6; margin-top: 2rem;">
            <em>${organizer.name}</em> düzenliyor
          </p>
          <p style="font-style: italic; color: #1F2A24; opacity: 0.6;">
            literas
          </p>
        </div>
      `,
    })
  }

  return NextResponse.json({ ok: true, event })
}
