import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatTr(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Istanbul',
  })
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function GET(req: Request) {
  // Yetki: Vercel Cron, CRON_SECRET'i Authorization header'da yollar
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )

  // 24 saat içinde başlayacak + henüz hatırlatılmamış etkinlikler
  const now = new Date()
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  const { data: events, error: eventsErr } = await supabase
    .from('events')
    .select('id, title, event_date, location, community:communities!community_id(name)')
    .is('reminder_sent_at', null)
    .gte('event_date', now.toISOString())
    .lte('event_date', in24h.toISOString())

  if (eventsErr) {
    console.error('[cron/reminders] etkinlik çekme hatası:', eventsErr)
    return NextResponse.json({ error: 'Etkinlikler çekilemedi' }, { status: 500 })
  }

  let processed = 0

  for (const event of events ?? []) {
    const { data: rsvps } = await supabase
      .from('rsvps')
      .select('user:profiles!user_id(email, name)')
      .eq('event_id', event.id)

    const emails = (rsvps ?? [])
      .map((r: any) => r.user?.email)
      .filter(Boolean) as string[]

    if (emails.length > 0) {
      const community = (event.community as any) ?? {}
      const safeTitle = escapeHtml(event.title)
      const safeLocation = event.location ? escapeHtml(event.location) : null
      const safeCommunity = community.name ? escapeHtml(community.name) : ''
      const dateStr = formatTr(event.event_date)
      const icsUrl = `https://www.literaslab.com/api/event/${event.id}/ics`

      const htmlBody = `
        <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
          <p style="font-style: italic; color: #B8541A;">No. 0001</p>
          <h1 style="color: #1F4A3D; font-weight: 500; font-size: 1.5rem;">
            Yarın: ${safeTitle}
          </h1>
          <p style="color: #1F2A24;">
            Katıldığın <em>${safeTitle}</em> etkinliği yaklaşıyor.
          </p>
          <p style="color: #1F2A24;">
            <strong>${dateStr}</strong>${safeLocation ? ` · ${safeLocation}` : ''}
          </p>
          ${safeCommunity ? `<p style="color: #1F2A24; opacity: 0.75;">${safeCommunity}</p>` : ''}
          <p style="color: #1F2A24;">
            <a href="${icsUrl}" style="color: #B8541A;">Takvimine ekle</a>
          </p>
          <p style="font-style: italic; color: #1F2A24; opacity: 0.6; margin-top: 2rem;">
            literas
          </p>
        </div>
      `

      for (const email of emails) {
        await sendEmail({
          to: [email],
          subject: `Yarın: ${event.title}`,
          html: htmlBody,
        })
        await sleep(600) // Resend rate limit
      }
    }

    // reminder_sent_at'i güvenli RPC ile işaretle (service_role yok)
    const { error: rpcErr } = await supabase.rpc('mark_reminder_sent', {
      p_event_id: event.id,
    })

    if (rpcErr) {
      console.error(`[cron/reminders] ${event.id} işaretlenemedi:`, rpcErr)
    } else {
      processed++
    }
  }

  return NextResponse.json({ ok: true, processed })
}
