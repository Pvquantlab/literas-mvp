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

// Kuyruktaki bir satır için konu + gövde üret
function buildMail(template: string, payload: any): { subject: string; html: string } | null {
  if (template === 'reminder') {
    const safeTitle = escapeHtml(payload.title ?? '')
    const safeLocation = payload.location ? escapeHtml(payload.location) : null
    const safeCommunity = payload.community_name ? escapeHtml(payload.community_name) : ''
    const dateStr = formatTr(payload.event_date)
    const icsUrl = `${SITE}/api/event/${payload.event_id}/ics`

    return {
      subject: `Yarın: ${payload.title}`,
      html: mailShell(`
        <h1 style="color: #1F4A3D; font-weight: 500; font-size: 1.5rem;">
          Yarın: ${safeTitle}
        </h1>
        <p style="color: #1F2A24;">
          Katıldığın <em>${safeTitle}</em> etkinliği yaklaşıyor.
        </p>
        <p style="color: #1F2A24;">
          <strong>${dateStr}</strong>${safeLocation ? ` &middot; ${safeLocation}` : ''}
        </p>
        ${safeCommunity ? `<p style="color: #1F2A24; opacity: 0.75;">${safeCommunity}</p>` : ''}
        <p style="color: #1F2A24;">
          <a href="${icsUrl}" style="color: #B8541A;">Takvimine ekle</a>
        </p>
      `),
    }
  }

  if (template === 'promotion') {
    const safeTitle = escapeHtml(payload.title ?? '')
    const safeLocation = payload.location ? escapeHtml(payload.location) : null
    const dateStr = formatTr(payload.event_date)
    const icsUrl = `${SITE}/api/event/${payload.event_id}/ics`
    const eventUrl = `${SITE}/event/${payload.event_id}`

    return {
      subject: `Yerin hazır: ${payload.title}`,
      html: mailShell(`
        <h1 style="color: #1F4A3D; font-weight: 500; font-size: 1.5rem;">
          Yerin hazır: ${safeTitle}
        </h1>
        <p style="color: #1F2A24;">
          Bekleme listesindeydin. Bir kişi katılımını iptal etti ve
          <em>${safeTitle}</em> etkinliğine kaydın yapıldı.
        </p>
        <p style="color: #1F2A24;">
          <strong>${dateStr}</strong>${safeLocation ? ` &middot; ${safeLocation}` : ''}
        </p>
        <p style="color: #1F2A24;">
          <a href="${icsUrl}" style="color: #B8541A;">Takvimine ekle</a>
          &middot;
          <a href="${eventUrl}" style="color: #B8541A;">Etkinliğe git</a>
        </p>
        <p style="color: #1F2A24; opacity: 0.75; font-size: 0.95rem;">
          Gelemeyeceksen etkinlik sayfasından katılımını iptal edebilirsin;
          yerin bekleme listesindeki bir sonraki kişiye geçer.
        </p>
      `),
    }
  }

  if (template === 'join_request') {
    const safeRequester = escapeHtml(payload.requester_name ?? 'biri')
    const safeCommunity = escapeHtml(payload.community_name ?? '')
    const communityUrl = `${SITE}/community/${payload.community_id}`

    return {
      subject: `${payload.requester_name ?? 'Biri'} topluluğuna katılmak istiyor`,
      html: mailShell(`
        <h1 style="color: #1F4A3D; font-weight: 500; font-size: 1.5rem;">
          yeni bir üyelik isteği
        </h1>
        <p style="color: #1F2A24;">
          <em>${safeRequester}</em>, <strong>${safeCommunity}</strong> topluluğuna katılmak istiyor.
        </p>
        <p style="color: #1F2A24;">
          <a href="${communityUrl}" style="color: #B8541A;">Onaylamak ya da reddetmek için topluluğa dön</a>
        </p>
      `),
    }
  }

  return null
}

export async function GET(req: Request) {
  // Yetki: CRON_SECRET tanımlı değilse kapalı başarısız ol.
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[cron/reminders] CRON_SECRET tanımlı değil — istek reddedildi')
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

  // ---- 1) Yaklaşan etkinlikleri bul ve maillerini kilitli kutuya doldur ----
  // E-posta adresleri hiçbir zaman bu koda gelmez; kutuya DB içinde yazılır,
  // kutu da sadece gizli anahtarla açılır (aşağıda).

  const now = new Date()
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  const { data: events, error: eventsErr } = await supabase
    .from('events')
    .select('id')
    .is('reminder_sent_at', null)
    .gte('event_date', now.toISOString())
    .lte('event_date', in24h.toISOString())

  if (eventsErr) {
    console.error('[cron/reminders] etkinlik çekme hatası:', eventsErr)
    return NextResponse.json({ error: 'Etkinlikler çekilemedi' }, { status: 500 })
  }

  let queuedReminders = 0

  for (const event of events ?? []) {
    const { error: queueErr } = await supabase.rpc('queue_event_reminders', {
      p_event_id: event.id,
      p_secret: cronSecret,
    })
    if (queueErr) {
      console.error(`[cron/reminders] ${event.id} kuyruğa alınamadı:`, queueErr)
      continue
    }

    const { error: markErr } = await supabase.rpc('mark_reminder_sent', {
      p_event_id: event.id,
    })
    if (markErr) {
      console.error(`[cron/reminders] ${event.id} işaretlenemedi:`, markErr)
    } else {
      queuedReminders++
    }
  }

  // ---- 2) Bekleme listesinden terfi edenlerin maillerini kutuya doldur ----

  const { error: promoErr } = await supabase.rpc('queue_promotion_emails', {
    p_secret: cronSecret,
  })
  if (promoErr) {
    console.error('[cron/reminders] terfi mailleri kuyruğa alınamadı:', promoErr)
  }

  // ---- 3) Kutuyu aç ve gönder (katılım isteği mailleri de bu kutuda) ----

  const { data: outbox, error: claimErr } = await supabase.rpc('claim_email_outbox', {
    p_secret: cronSecret,
  })
  if (claimErr) {
    console.error('[cron/reminders] kutu açılamadı:', claimErr)
    return NextResponse.json({ error: 'Kutu açılamadı' }, { status: 500 })
  }

  let sent = 0
  const sentIds: number[] = []

  for (const row of outbox ?? []) {
    const mail = buildMail(row.template, row.payload)
    if (!mail || !row.email) continue

    const result = await sendEmail({
      to: [row.email],
      subject: mail.subject,
      html: mail.html,
    })

    if (result.ok) {
      sent++
      sentIds.push(row.id)
    } else {
      console.error(`[cron/reminders] mail gönderilemedi (kuyruk #${row.id}):`, result.error)
    }
    await sleep(600) // Resend hız limiti
  }

  if (sentIds.length > 0) {
    const { error: markErr } = await supabase.rpc('mark_outbox_sent', {
      p_ids: sentIds,
      p_secret: cronSecret,
    })
    if (markErr) {
      console.error('[cron/reminders] gönderim işaretlenemedi:', markErr)
    }
  }

  return NextResponse.json({ ok: true, queuedReminders, sent })
}
