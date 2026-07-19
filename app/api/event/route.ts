import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { sendEmail } from '@/lib/email'
import { eventSchema } from '@/lib/validations'
import { checkRateLimit } from '@/lib/rate-limit'

// HTML injection'a karşı basit escape fonksiyonu
function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Giriş yapmalısın' }, { status: 401 })
  }

  // Rate limit (hassas uç — dakikada 3)
  const rl = await checkRateLimit(req, user.id, 'strict')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Çok fazla istek, biraz bekle' },
      { status: 429, headers: rl.headers }
    )
  }

  const parsed = eventSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Geçersiz veri', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }
  const {
    community_id,
    title,
    description,
    location,
    event_date,
    max_attendees,
    cover_image_url,
  } = parsed.data

  // YETKI KONTROLU: Giriş yapan kişi bu topluluğun founder'ı veya onaylı admin'i mi?
  const { data: membership } = await supabase
    .from('community_members')
    .select('role, status')
    .eq('community_id', community_id)
    .eq('user_id', user.id)
    .eq('status', 'approved')
    .in('role', ['founder', 'admin'])
    .maybeSingle()

  if (!membership) {
    return NextResponse.json(
      { error: 'Bu topluluğa etkinlik açma yetkin yok' },
      { status: 403 }
    )
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

    const safeTitle = escapeHtml(event.title)
    const safeCommunity = escapeHtml(community.name)
    const safeOrganizer = escapeHtml(organizer.name)
    const safeLocation = event.location ? escapeHtml(event.location) : null
    const safeDescription = event.description ? escapeHtml(event.description) : null

    const htmlBody = `
      <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
        <p style="font-style: italic; color: #B8541A;">No. 0001</p>
        <h1 style="color: #1F4A3D; font-weight: 500; font-size: 1.5rem;">
          ${safeTitle}
        </h1>
        <p style="color: #1F2A24; opacity: 0.75; font-size: 0.95rem;">
          ${safeCommunity} · ${eventDateStr}
        </p>
        ${safeLocation ? `<p style="color: #1F2A24;">${safeLocation}</p>` : ''}
        ${safeDescription ? `<p style="color: #1F2A24;">${safeDescription}</p>` : ''}
        <p style="font-style: italic; color: #1F2A24; opacity: 0.6; margin-top: 2rem;">
          <em>${safeOrganizer}</em> düzenliyor
        </p>
        <p style="font-style: italic; color: #1F2A24; opacity: 0.6;">
          literas
        </p>
      </div>
    `

    await Promise.all(
      emails.map((email) =>
        sendEmail({
          to: [email],
          subject: `${community.name} — yeni bir etkinlik`,
          html: htmlBody,
        })
      )
    )
  }

  return NextResponse.json({ ok: true, event })
}
