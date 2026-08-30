import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { sendBulkEmail } from '@/lib/email'
import { eventEditSchema } from '@/lib/validations'
import { checkRateLimit } from '@/lib/rate-limit'
import { formatDateTimeLong } from '@/lib/date'

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

// Katılımcı e-postalarını kilitli kasadan çek (etkinliği düzenleyen hariç).
// RPC yalnızca organizatöre veya topluluğun founder/admin'ine liste verir;
// bu fonksiyon zaten checkCanManage'den sonra çağrılır.
async function getRsvpEmails(supabase: any, eventId: string, excludeUserId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_event_rsvp_emails', {
    p_event_id: eventId,
    p_exclude: excludeUserId,
  })
  if (error) {
    console.error('[event] katılımcı mailleri alınamadı:', error)
    return []
  }
  return (data ?? []) as string[]
}

// Tarih formatı lib/date.ts'ten gelir: Vercel UTC'de koştuğu için timeZone
// belirtmeyen her çağrı e-postalara 3 saat kayık saat yazıyordu.
const formatDateTr = formatDateTimeLong

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
      { error: 'Çok fazla istek, biraz bekle' },
      { status: 429, headers: rl.headers }
    )
  }

  const { ok, event: oldEvent } = await checkCanManage(supabase, user.id, id)
  if (!ok || !oldEvent) {
    return NextResponse.json({ error: 'Yetkin yok' }, { status: 403 })
  }

  const { title, description, location, event_date, max_attendees, cover_image_url, kapsam } =
    parsed.data

  // TOPLU KAPSAM. event_date BİLİNÇLİ olarak taşınmıyor: eventEditSchema onu
  // zorunlu tutuyor ve form koşulsuz gönderiyor, ama UNIQUE(series_id,
  // event_date) yüzünden toplu yazım her seride ikinci satırda 23505 alır ve
  // işlem tamamen geri döner. Gövdedeki event_date bu dalda YOK SAYILIR.
  if (kapsam !== 'tek' && oldEvent.series_id) {
    const { data: seriRows, error: seriError } = await supabase.rpc('seri_guncelle', {
      p_series_id: oldEvent.series_id,
      p_kapsam: kapsam,
      p_from: kapsam === 'sonrakiler' ? oldEvent.event_date : null,
      p_title: title,
      p_description: description || null,
      p_location: location,
      p_max_attendees: max_attendees ?? null,
      p_cover_image_url: cover_image_url === undefined ? null : (cover_image_url || null),
      p_kapak_degissin: cover_image_url !== undefined,
    })

    if (seriError?.message?.includes('yetkisiz')) {
      return NextResponse.json({ error: 'Yetkin yok' }, { status: 403 })
    }
    if (seriError) {
      console.error('[event PATCH] seri güncellenemedi:', seriError)
      return NextResponse.json({ error: 'Güncellenemedi' }, { status: 500 })
    }

    const seri = seriRows?.[0]
    // Bildirim seri_guncelle içinde email_outbox'a yazıldı; burada mail
    // gönderilmiyor (kişi başına tek mail, cron gönderiyor).
    return NextResponse.json({
      ok: true,
      kapsam,
      guncellenen: seri?.guncellenen ?? 0,
      atlanan: seri?.atlanan ?? 0,
      yeni_series_id: seri?.yeni_series_id ?? null,
      // Son tekrarda 'sonrakiler' seçilirse bölme yerine o satır seriden
      // ÇIKARILIR (tekrar_sayisi CHECK'i 2'nin altına inemez). yeni_series_id
      // NULL kaldığı için arayüz ikisini ayırt edemezdi.
      ayrildi: seri?.ayrildi ?? 0,
      // Kullanicinin o an baktigi bulusma elle duzenlenmis olabilir; o zaman
      // toplu guncelleme TAM DA ONU atliyor ve kullanici degismemis kendi
      // sayfasina bakiyor. Arayuz bunu soyleyebilsin.
      bu_atlandi: oldEvent.seri_disina_alindi_at != null,
    })
  }

  // TEKİL YOL. Düz .update() yerine RPC: seri_disina_alindi_at, updated_at ve
  // reminder_sent_at kolonları istemciye kapalı (Görev 1), yalnızca
  // SECURITY DEFINER fonksiyon yazabilir.
  const { error: rpcError } = await supabase.rpc('etkinlik_guncelle', {
    p_event_id: id,
    p_title: title,
    p_description: description || null,
    p_location: location,
    p_event_date: event_date.toISOString(),
    p_max_attendees: max_attendees ?? null,
    p_cover_image_url: cover_image_url === undefined ? null : (cover_image_url || null),
    p_kapak_degissin: cover_image_url !== undefined,
  })

  if (rpcError?.message?.includes('yetkisiz')) {
    return NextResponse.json({ error: 'Yetkin yok' }, { status: 403 })
  }
  // Migration bu mesaji ham 23505 yerine BILEREK Turkce firlatiyor; genel
  // 500'e cevirirsek kullanicinin ogrenmesinin baska yolu yok.
  if (rpcError?.message?.includes('o tarihte seride baska bulusma var')) {
    return NextResponse.json(
      { error: 'O tarihte seride başka bir buluşma var' },
      { status: 409 }
    )
  }
  if (rpcError) {
    console.error('[event PATCH] update hatası:', rpcError)
    return NextResponse.json({ error: 'Güncellenemedi' }, { status: 500 })
  }

  const { data: updatedEvent, error: okumaError } = await supabase
    .from('events').select('*').eq('id', id).single()

  if (okumaError || !updatedEvent) {
    // Yazma BASARILI oldu; burada 500 donersek kullanici tekrar kaydeder,
    // RPC ikinci cagrida no-op olur ve degisiklik maili KALICI olarak kaybolur.
    // Basarili donuyoruz ve izi loga birakiyoruz.
    console.error('[event PATCH] guncellendi ama yeniden okunamadi:', id, okumaError)
    return NextResponse.json({ ok: true, event: null })
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

      // Her alıcıya ayrı mail (sızıntı yok); başarısızlık artık loglanıyor.
      await sendBulkEmail(
        {
          to: emails,
          subject: `${updatedEvent.title} — değişiklik var`,
          html: htmlBody,
        },
        'event/degisiklik-bildirimi'
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
      { error: 'Çok fazla istek, biraz bekle' },
      { status: 429, headers: rlDel.headers }
    )
  }

  const { ok, event } = await checkCanManage(supabase, user.id, id)
  if (!ok || !event) {
    return NextResponse.json({ error: 'Yetkin yok' }, { status: 403 })
  }

  // kapsam query string'den: DELETE gövdesi okunmuyor ve mevcut istemciler
  // gövdesiz istek atıyor (geriye uyumluluk).
  const kapsamHam = new URL(_req.url).searchParams.get('kapsam')
  const kapsam =
    kapsamHam === 'sonrakiler' || kapsamHam === 'tumu' ? kapsamHam : 'tek'

  if (kapsam !== 'tek' && event.series_id) {
    const { data: silRows, error: silError } = await supabase.rpc('seri_sil', {
      p_series_id: event.series_id,
      p_kapsam: kapsam,
      p_from: kapsam === 'sonrakiler' ? event.event_date : null,
    })

    if (silError?.message?.includes('yetkisiz')) {
      return NextResponse.json({ error: 'Yetkin yok' }, { status: 403 })
    }
    if (silError) {
      console.error('[event DELETE] seri silinemedi:', silError)
      return NextResponse.json({ error: 'İptal edilemedi' }, { status: 500 })
    }

    // İptal bildirimi ve kuyruk temizliği seri_sil içinde, silmeden ÖNCE
    // yapıldı — sonra rsvps CASCADE ile gittiği için kime haber verileceği
    // bilgisi kalmıyor.
    return NextResponse.json({
      ok: true,
      kapsam,
      silinen: silRows?.[0]?.silinen ?? 0,
      // Elle düzenlenmiş tekrarlar silinmez (seri_guncelle ile simetrik);
      // kullanıcı kaçının atlandığını bilmeli.
      atlanan: silRows?.[0]?.atlanan ?? 0,
      // bkz. PATCH toplu dalı: kullanıcının baktığı buluşma elle düzenlenmişse
      // silme de onu atlıyor, arayüz bunu söyleyebilsin.
      bu_atlandi: event.seri_disina_alindi_at != null,
    })
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
    return NextResponse.json({ error: 'İptal edilemedi' }, { status: 500 })
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

    await sendBulkEmail(
      {
        to: emails,
        subject: `${event.title} — iptal edildi`,
        html: htmlBody,
      },
      'event/iptal-bildirimi'
    )
  }

  return NextResponse.json({ ok: true })
}
