import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { sendEmail } from '@/lib/email'
import { eventEditSchema } from '@/lib/validations'
import { checkRateLimit } from '@/lib/rate-limit'

// HTML injection'a karşı basit escape
function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Yetki kontrolü: kullanıcı bu etkinliği yönetebilir mi?
async function checkCanManage(
  supabase: any,
  userId: string,
  eventId: string
): Promise<{ ok: boolean; event?: any }> {
  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (!event) return { ok: false }

  // Organizatör her zaman yönetebilir
  if (event.organizer_id === userId) return { ok: true, event }

  // Topluluğun founder/admin'i de yönetebilir
  if (event.community_id) {
    const { data: membership } = await supabase
      .from('community_members')
      .select('role, status')
      .eq('community_id', event.community_id)
      .eq('user_id', userId)
      .maybeSingle()

    if (
      membership?.status === 'approved' &&
      (membership.role === 'founder' || membership.role === 'admin')
    ) {
      return { ok: true, event }
    }
  }

  return { ok: false }
}

// Katılımcı e-postalarını çek (etkinliği düzenleyen hariç)
async function getRsvpEmails(supabase: any, eventId: string, excludeUserId: string): Promise<string[]> {
  const { data: rsvps } = await supabase
    .from('rsvps')
    .select('user:profiles!user_id(email)')
    .eq('event_id', eventId)
    .neq('user_id', excludeUserId)

  return (rsvps ?? [])
    .map((r: any) => r.user?.email)
    .filter(Boolean) as string[]
}

// Tarih formatla (Türkçe)
function formatDateTr(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// PATCH: Etkinliği güncelle
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const parsed = eventEditSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Geçersiz veri', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Giriş yapmalısın' }, { status: 401 })
  }

  const rl = await checkRateLimit(req, user.id, 'strict')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Cok fazla istek, biraz bekle' },
      { status: 429, headers: rl.headers }
    )
  }

  const { ok, event: oldEvent } = await checkCanManage(supabase, user.id, id)
  if (!ok || !oldEvent) {
    return NextResponse.json({ error: 'Yetkin yok' }, { status: 403 })
  }

  const { title, description, location, event_date, max_attendees, cover_image_url } =
    parsed.data

  const { data: updatedEvent, error: updateError } = await supabase
    .from('events')
    .update({
      title,
      description: description || null,
      location,
      event_date,
      max_attendees: max_attendees ?? null,
      cover_image_url: cover_image_url ?? null,
    })
    .eq('id', id)
    .select()
    .single()

  if (updateError || !updatedEvent) {
    console.error('[event PATCH] update hatası:', updateError)
    return NextResponse.json({ error: 'Güncellenemedi' }, { status: 500 })
  }

  // Değişiklikleri karşılaştır
  const changes: string[] = []
  if (oldEvent.title !== updatedEvent.title) {
    changes.push(`başlık: "${oldEvent.title}" → "${updatedEvent.title}"`)
  }
  if (oldEvent.event_date !== updatedEvent.event_date) {
    changes.push(`tarih: ${formatDateTr(oldEvent.event_date)} → ${formatDateTr(updatedEvent.event_date)}`)
  }
  if (oldEvent.location !== updatedEvent.location) {
    changes.push(`konum: "${oldEvent.location}" → "${updatedEvent.location}"`)
  }

  // Sadece anlamlı değişiklik varsa mail at
  if (changes.length > 0) {
    const emails = await getRsvpEmails(supabase, id, user.id)

    if (emails.length > 0) {
      const safeTitle = escapeHtml(updatedEvent.title)
      const safeLocation = escapeHtml(updatedEvent.location)
      const changesListHtml = changes
        .map((c) => `<li style="margin-bottom: 6px;">${escapeHtml(c)}</li>`)
        .join('')

      const htmlBody = `
        <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
          <p style="font-style: italic; color: #B8541A;">No. 0001</p>
          <h1 style="color: #1F4A3D; font-weight: 500; font-size: 1.5rem;">
            Etkinlikte değişiklik var
          </h1>
          <p style="color: #1F2A24;">
            Katıldığın <em>${safeTitle}</em> etkinliğinde şu değişiklikler yapıldı:
          </p>
          <ul style="color: #1F2A24; padding-left: 20px;">
            ${changesListHtml}
          </ul>
          <p style="color: #1F2A24;">
            Güncel bilgi: <strong>${formatDateTr(updatedEvent.event_date)}</strong>, ${safeLocation}
          </p>
          <p style="font-style: italic; color: #1F2A24; opacity: 0.6; margin-top: 2rem;">
            literas
          </p>
        </div>
      `

      // Her alıcıya ayrı mail (sızıntı yok)
      await Promise.all(
        emails.map((email) =>
          sendEmail({
            to: [email],
            subject: `${updatedEvent.title} — değişiklik var`,
            html: htmlBody,
          })
        )
      )
    }
  }

  return NextResponse.json({ ok: true, event: updatedEvent })
}

// DELETE: Etkinliği iptal et
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Giriş yapmalısın' }, { status: 401 })
  }

  const rlDel = await checkRateLimit(_req, user.id, 'strict')
  if (!rlDel.ok) {
    return NextResponse.json(
      { error: 'Cok fazla istek, biraz bekle' },
      { status: 429, headers: rlDel.headers }
    )
  }

  const { ok, event } = await checkCanManage(supabase, user.id, id)
  if (!ok || !event) {
    return NextResponse.json({ error: 'Yetkin yok' }, { status: 403 })
  }

  // Katılımcı listesi (silmeden önce al)
  const emails = await getRsvpEmails(supabase, id, user.id)

  // Etkinliği sil (rsvps CASCADE ile otomatik silinir, DB'de tanımlıysa)
  const { error: deleteError } = await supabase
    .from('events')
    .delete()
    .eq('id', id)

  if (deleteError) {
    console.error('[event DELETE] hatası:', deleteError)
    return NextResponse.json({ error: 'Iptal edilemedi' }, { status: 500 })
  }

  // Katılımcılara iptal maili
  if (emails.length > 0) {
    const safeTitle = escapeHtml(event.title)
    const eventDateStr = formatDateTr(event.event_date)

    const htmlBody = `
      <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
        <p style="font-style: italic; color: #B8541A;">No. 0001</p>
        <h1 style="color: #1F4A3D; font-weight: 500; font-size: 1.5rem;">
          Etkinlik iptal edildi
        </h1>
        <p style="color: #1F2A24;">
          Katıldığın <em>${safeTitle}</em> (${eventDateStr}) etkinliği iptal edildi.
        </p>
        <p style="color: #1F2A24;">
          Bir sonrakinde görüşmek üzere.
        </p>
        <p style="font-style: italic; color: #1F2A24; opacity: 0.6; margin-top: 2rem;">
          literas
        </p>
      </div>
    `

    await Promise.all(
      emails.map((email) =>
        sendEmail({
          to: [email],
          subject: `${event.title} — iptal edildi`,
          html: htmlBody,
        })
      )
    )
  }

  return NextResponse.json({ ok: true })
}
