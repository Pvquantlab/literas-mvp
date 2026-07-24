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

const SITE = 'https://www.literaslab.com'

function mailShell(inner: string): string {
  return `
    <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
      <p style="font-style: italic; color: #B8541A;">No. 0001</p>
      ${inner}
      <p style="font-style: italic; color: #1F2A24; opacity: 0.6; margin-top: 2rem;">
        literas
      </p>
    </div>
  `
}

export async function GET(req: Request) {
  // Yetki: CRON_SECRET tanimli degilse kapali basarisiz ol.
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[cron/reminders] CRON_SECRET tanimli degil - istek reddedildi')
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )

  // ---- 1) Yaklasan etkinlik hatirlatmalari --------------------------------

  const now = new Date()
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  const { data: events, error: eventsErr } = await supabase
    .from('events')
    .select('id, title, event_date, location, community:communities!community_id(name)')
    .is('reminder_sent_at', null)
    .gte('event_date', now.toISOString())
    .lte('event_date', in24h.toISOString())

  if (eventsErr) {
    console.error('[cron/reminders] etkinlik cekme hatasi:', eventsErr)
    return NextResponse.json({ error: 'Etkinlikler cekilemedi' }, { status: 500 })
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
      const icsUrl = `${SITE}/api/event/${event.id}/ics`

      const htmlBody = mailShell(`
        <h1 style="color: #1F4A3D; font-weight: 500; font-size: 1.5rem;">
          Yarin: ${safeTitle}
        </h1>
        <p style="color: #1F2A24;">
          Katildigin <em>${safeTitle}</em> etkinligi yaklasiyor.
        </p>
        <p style="color: #1F2A24;">
          <strong>${dateStr}</strong>${safeLocation ? ` &middot; ${safeLocation}` : ''}
        </p>
        ${safeCommunity ? `<p style="color: #1F2A24; opacity: 0.75;">${safeCommunity}</p>` : ''}
        <p style="color: #1F2A24;">
          <a href="${icsUrl}" style="color: #B8541A;">Takvimine ekle</a>
        </p>
      `)

      for (const email of emails) {
        await sendEmail({
          to: [email],
          subject: `Yarin: ${event.title}`,
          html: htmlBody,
        })
        await sleep(600)
      }
    }

    const { error: rpcErr } = await supabase.rpc('mark_reminder_sent', {
      p_event_id: event.id,
    })

    if (rpcErr) {
      console.error(`[cron/reminders] ${event.id} isaretlenemedi:`, rpcErr)
    } else {
      processed++
    }
  }

  // ---- 2) Bekleme listesinden terfi edenlere haber -------------------------
  // rsvp_waitlist_promote trigger'i otomatik terfi ettiriyor ama mail atmiyor.
  // promoted_at dolu + promotion_email_sent_at bos olanlara burada haber veriyoruz.

  let promoted = 0

  const { data: promotions, error: promoErr } = await supabase
    .from('waitlist')
    .select(`
      id,
      event:events!event_id(id, title, event_date, location),
      user:profiles!user_id(email, name)
    `)
    .not('promoted_at', 'is', null)
    .is('promotion_email_sent_at', null)

  if (promoErr) {
    console.error('[cron/reminders] terfi cekme hatasi:', promoErr)
  } else {
    for (const row of promotions ?? []) {
      const ev = (row as any).event
      const email = (row as any).user?.email

      // Etkinlik silinmisse ya da e-posta yoksa sadece isaretle, mail atma
      if (ev && email) {
        const safeTitle = escapeHtml(ev.title)
        const safeLocation = ev.location ? escapeHtml(ev.location) : null
        const dateStr = formatTr(ev.event_date)
        const icsUrl = `${SITE}/api/event/${ev.id}/ics`
        const eventUrl = `${SITE}/event/${ev.id}`

        const htmlBody = mailShell(`
          <h1 style="color: #1F4A3D; font-weight: 500; font-size: 1.5rem;">
            Yerin hazir: ${safeTitle}
          </h1>
          <p style="color: #1F2A24;">
            Bekleme listesindeydin. Bir kisi katilimini iptal etti ve
            <em>${safeTitle}</em> etkinligine kaydin yapildi.
          </p>
          <p style="color: #1F2A24;">
            <strong>${dateStr}</strong>${safeLocation ? ` &middot; ${safeLocation}` : ''}
          </p>
          <p style="color: #1F2A24;">
            <a href="${icsUrl}" style="color: #B8541A;">Takvimine ekle</a>
            &middot;
            <a href="${eventUrl}" style="color: #B8541A;">Etkinlige git</a>
          </p>
          <p style="color: #1F2A24; opacity: 0.75; font-size: 0.95rem;">
            Gelemeyeceksen etkinlik sayfasindan katilimini iptal edebilirsin;
            yerin bekleme listesindeki bir sonraki kisiye gecer.
          </p>
        `)

        await sendEmail({
          to: [email],
          subject: `Yerin hazir: ${ev.title}`,
          html: htmlBody,
        })
        await sleep(600)
      }

      const { error: markErr } = await supabase.rpc('mark_promotion_email_sent', {
        p_waitlist_id: (row as any).id,
      })

      if (markErr) {
        console.error(`[cron/reminders] terfi ${(row as any).id} isaretlenemedi:`, markErr)
      } else {
        promoted++
      }
    }
  }

  return NextResponse.json({ ok: true, processed, promoted })
}
