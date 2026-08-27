import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'
import { SITE_URL } from '@/lib/site'

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

const SITE = SITE_URL

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

/**
 * ÇALIŞMA SIKLIĞI ve SÜRE LİMİTİ
 *
 * Zamanlama vercel.json'da: "0 6 * * *" — GÜNDE BİR. Vercel Hobby planı daha
 * sık cron'a izin vermiyor. (vercel.json'a açıklama yazılamaz: JSON yorum
 * desteklemiyor ve Vercel bilinmeyen anahtarları şema hatasıyla reddediyor —
 * bir kez denendi, deploy kırıldı. Bu yüzden not burada duruyor.)
 *
 * 06:00 UTC = 09:00 Türkiye. Hatırlatma penceresi 24 saat olduğu için
 * hatırlatmalar doğru çalışıyor.
 *
 * BİLİNEN SINIR: bekleme listesi terfi maili ("yerin açıldı") de bu cron'a
 * bağlı, yani yer açıldıktan sonra kullanıcıya haber 24 saate kadar
 * gecikebiliyor. RSVP'si DB trigger'ıyla zaten oluştuğu için yerini
 * kaybetmiyor, sadece geç öğreniyor. Çözüm: Pro'ya geçip cron'u saatlik
 * yapmak, ya da terfi mailini RSVP iptal akışından tetiklemek.
 *
 * SÜRE: Hobby planında fonksiyon tavanı 60 saniye (doğrulandı). Daha büyük bir
 * maxDuration yazmanın faydası yok, plan tavanına çekilir; bütçeyi 60'a göre
 * ayarlamazsak fonksiyon bütçe dolmadan öldürülür ve temiz çıkış hiç çalışmaz.
 *
 * Pro'ya geçilirse: maxDuration 300, SURE_BUTCESI_MS 240_000 yapılabilir —
 * o zaman kuyruk tek koşuda çok daha fazla mail bitirir.
 */
export const maxDuration = 60

// Bütçe tavanın altında: kesilmek yerine kendi isteğimizle, her gönderimi
// işaretlemiş olarak çıkalım. Kalanları ertesi koşu alır.
const SURE_BUTCESI_MS = 50_000
const MAIL_ARASI_MS = 600

export async function GET(req: Request) {
  const basladi = Date.now()

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
      p_secret: cronSecret,
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

  const kuyruk = outbox ?? []
  let sent = 0
  let basarisiz = 0
  let sureDoldu = false

  for (const [sira, row] of kuyruk.entries()) {
    // Süre bütçesi: fonksiyon öldürülmeden önce temiz çık. Kalanları bir
    // sonraki koşu alır — hepsi hâlâ sent_at IS NULL olduğu için kaybolmaz.
    if (Date.now() - basladi > SURE_BUTCESI_MS) {
      sureDoldu = true
      console.warn(
        `[cron/reminders] süre bütçesi doldu: ${sira}/${kuyruk.length} işlendi, kalanlar sonraki koşuya bırakıldı`
      )
      break
    }

    const mail = buildMail(row.template, row.payload)
    if (!mail || !row.email) continue

    const result = await sendEmail({
      to: [row.email],
      subject: mail.subject,
      html: mail.html,
    })

    if (!result.ok) {
      basarisiz++
      console.error(`[cron/reminders] mail gönderilemedi (kuyruk #${row.id}):`, result.error)
      await sleep(MAIL_ARASI_MS)
      continue
    }

    sent++

    // İşaretlemeyi döngü sonuna BIRAKMA. Eskiden tüm id'ler sonda tek seferde
    // işaretleniyordu; fonksiyon süre limitinde kesildiğinde gönderilmiş
    // mailler işaretsiz kalıyor ve ertesi koşu AYNI kişilere tekrar mail
    // gönderiyordu. Her gönderimden hemen sonra işaretleyince tekrar gönderim
    // penceresi en fazla tek maile iner.
    const { error: markErr } = await supabase.rpc('mark_outbox_sent', {
      p_ids: [row.id],
      p_secret: cronSecret,
    })
    if (markErr) {
      // Kritik: mail gitti ama işaretlenemedi → tekrar gönderilebilir.
      console.error(
        `[cron/reminders] DİKKAT: #${row.id} gönderildi ama işaretlenemedi, tekrar gidebilir:`,
        markErr
      )
    }

    await sleep(MAIL_ARASI_MS) // Resend hız limiti
  }

  return NextResponse.json({
    ok: true,
    queuedReminders,
    sent,
    basarisiz,
    kuyrukta: kuyruk.length,
    sureDoldu,
  })
}
