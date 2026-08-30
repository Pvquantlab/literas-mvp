import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { sendBulkEmail, escapeHtml } from '@/lib/email'
import { eventSchema, seriOlusturSchema } from '@/lib/validations'
import { checkRateLimit } from '@/lib/rate-limit'
import { formatDateTimeLong } from '@/lib/date'
import { SITE_URL } from '@/lib/site'

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

  const govde = await req.json().catch(() => null)
  const seriMi = !!(govde && typeof govde === 'object' && 'tekrar' in govde)

  const parsed = seriMi
    ? seriOlusturSchema.safeParse(govde)
    : eventSchema.safeParse(govde)
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

  // Seri dalı: N ayrı POST mümkün değil — bu uç "strict" rate limitte
  // (dakikada 3), 4. tekrarda 429 alır, yarım kalır ve geri alma yoktur.
  // Bu yüzden tek RPC, tek işlem.
  if (seriMi) {
    const { tekrar } = parsed.data as typeof parsed.data & {
      tekrar: { frekans: string; sayi: number; istek_id: string }
    }

    const { data: seriRows, error: seriError } = await supabase.rpc('seri_olustur', {
      p_community_id: community_id,
      p_title: title,
      p_description: description || null,
      p_location: location,
      p_baslangic: event_date.toISOString(),
      p_frekans: tekrar.frekans,
      p_tekrar_sayisi: tekrar.sayi,
      p_max_attendees: max_attendees ?? null,
      p_cover_image_url: cover_image_url ?? null,
      p_istek_id: tekrar.istek_id,
    })

    if (seriError?.message?.includes('yetkisiz')) {
      return NextResponse.json({ error: 'Yetkin yok' }, { status: 403 })
    }
    const seri = seriRows?.[0]
    if (seriError || !seri?.ilk_event_id) {
      console.error('[event] seri oluşturulamadı:', seriError)
      return NextResponse.json({ error: 'Seri oluşturulamadı' }, { status: 500 })
    }

    // Üyelere TEK duyuru maili: seriyi tarif eder, tekrar başına mail atılmaz.
    const { data: seriEmailRows, error: seriEmailError } = await supabase.rpc('get_member_emails', {
      p_community_id: community_id,
      p_exclude: user.id,
    })
    if (seriEmailError) {
      console.error('[event] seri uye mailleri alinamadi:', seriEmailError)
    }
    const seriEmails = (seriEmailRows ?? []) as string[]

    // Duyuru maili YALNIZCA seri gercekten yeni kurulduysa. Ayni istek_id ile
    // gelen tekrar cagri (cift tiklama, ag yeniden denemesi) veritabaninda
    // hicbir sey uretmiyor; posta kutusunda da uretmemeli.
    if (seri.yeni_mi && seriEmails.length > 0) {
      const sikligi = tekrar.frekans === 'haftalik' ? 'haftalık'
        : tekrar.frekans === 'iki_haftalik' ? 'iki haftada bir' : 'aylık'
      const safeTitle = escapeHtml(title)
      const safeLocation = escapeHtml(location)
      const ilkTarih = formatDateTimeLong(event_date.toISOString())

      await sendBulkEmail(
        {
          to: seriEmails,
          subject: `${title} — ${seri.uretilen} buluşmalık yeni bir seri`,
          html: `
      <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
        <p style="font-style: italic; color: #B8541A;">No. 0001</p>
        <h1 style="color: #1F4A3D; font-weight: 500; font-size: 1.5rem;">${safeTitle}</h1>
        <p style="color: #1F2A24;">
          ${escapeHtml(sikligi)} tekrarlanan <strong>${seri.uretilen}</strong> buluşma.
          İlki: ${ilkTarih}
        </p>
        <p style="color: #1F2A24;">${safeLocation}</p>
        <p style="color: #1F2A24;">
          <a href="${SITE_URL}/event/${seri.ilk_event_id}" style="color: #1F4A3D;">İlk buluşmaya git</a>
        </p>
        <p style="font-style: italic; color: #1F2A24; opacity: 0.6;">literas</p>
      </div>
    `,
        },
        'event/yeni-seri-duyurusu'
      )
    }

    // Sözleşme: yanıt şekli tekil dalla AYNI kalmalı — form data.event.id okuyor.
    const { data: ilkEvent } = await supabase
      .from('events').select('*').eq('id', seri.ilk_event_id).single()

    if (!ilkEvent) {
      console.error('[event] seri kuruldu ama ilk tekrar okunamadi:', seri.ilk_event_id)
      return NextResponse.json({ error: 'Seri oluşturulamadı' }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      event: ilkEvent,
      seri: { series_id: seri.series_id, uretilen: seri.uretilen },
    })
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

  // Üye mailleri kilitli kasadan: RPC sadece bu topluluğun founder/admin'ine
  // (yani az önce yetki kontrolünden geçen bu kullanıcıya) mail listesi verir.
  const { data: emailRows, error: emailError } = await supabase.rpc('get_member_emails', {
    p_community_id: community_id,
    p_exclude: user.id,
  })
  if (emailError) {
    console.error('[event] üye mailleri alınamadı:', emailError)
  }
  const emails = (emailRows ?? []) as string[]

  if (emails.length > 0 && community && organizer) {
    // lib/date.ts: timeZone'suz format Vercel'in UTC saatini yazıyordu.
    const eventDateStr = formatDateTimeLong(event.event_date)

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

    await sendBulkEmail(
      {
        to: emails,
        subject: `${community.name} — yeni bir etkinlik`,
        html: htmlBody,
      },
      'event/yeni-etkinlik-duyurusu'
    )
  }

  return NextResponse.json({ ok: true, event })
}
