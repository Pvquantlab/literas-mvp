import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { sendEmail } from '@/lib/email'

// HTML injection'a karşı basit escape fonksiyonu
function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const { id: communityId, memberId } = await params
  const body = await req.json()

 const { action } = body as {
    action: 'toggle-admin' | 'approve' | 'reject'
  }

  const supabase = await createClient()

  // Kim istiyor?
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Giriş yapmalısın' }, { status: 401 })
  }

  // İstek yapan kişi gerçekten kurucu/admin mi? (güvenlik)
  const { data: actor } = await supabase
    .from('community_members')
    .select('role, status')
    .eq('community_id', communityId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!actor || actor.status !== 'approved' || !['founder', 'admin'].includes(actor.role)) {
    return NextResponse.json({ error: 'Yetkin yok' }, { status: 403 })
  }
  // Hedef üyeyi DB'den oku — istemciden gelen currentRole'e ASLA güvenme.
  const { data: target } = await supabase
    .from('community_members')
    .select('id, role, status, user_id')
    .eq('id', memberId)
    .eq('community_id', communityId)
    .maybeSingle()

  if (!target) {
    return NextResponse.json({ error: 'Üye bulunamadı' }, { status: 404 })
  }

  // Kurucuya hiç kimse dokunamaz — admin de, kurucunun kendisi de.
  if (target.role === 'founder') {
    return NextResponse.json(
      { error: 'Kurucu üzerinde işlem yapılamaz' },
      { status: 403 }
    )
  }

  // Admin rolünü yalnızca kurucu verebilir/alabilir.
  if (action === 'toggle-admin' && actor.role !== 'founder') {
    return NextResponse.json(
      { error: 'Yalnızca kurucu yönetici atayabilir' },
      { status: 403 }
    )
  }

  if (action === 'toggle-admin') {
    const newRole = target.role === 'admin' ? 'member' : 'admin'
    // IDOR fix: community_id de kontrol edilsin
    const { error } = await supabase
      .from('community_members')
      .update({ role: newRole })
      .eq('id', memberId)
      .eq('community_id', communityId)

    if (error) {
      console.error('[member] toggle-admin hatası:', error)
      return NextResponse.json({ error: 'Güncellenemedi' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  if (action === 'approve') {
    // IDOR fix: community_id de kontrol edilsin
    const { data: updated, error } = await supabase
      .from('community_members')
      .update({ status: 'approved' })
      .eq('id', memberId)
      .eq('community_id', communityId)
      .select('user_id')
      .single()

    if (error || !updated) {
      console.error('[member] approve hatası:', error)
      return NextResponse.json({ error: 'Onaylanamadı' }, { status: 500 })
    }

    // Onaylanan kişiye email at
    const { data: community } = await supabase
      .from('communities')
      .select('name')
      .eq('id', communityId)
      .single()

    // Onaylanan kişinin iletişimi kilitli kasadan: RPC sadece bu topluluğun
    // founder/admin'ine (yani yukarıda yetkisi doğrulanan bu kullanıcıya) verir.
    const { data: contactRows, error: contactError } = await supabase.rpc('get_member_contact', {
      p_membership_id: memberId,
    })
    if (contactError) {
      console.error('[member] üye iletişimi alınamadı:', contactError)
    }
    const member = (contactRows as any)?.[0] as { name: string | null; email: string | null } | undefined

    if (community && member?.email) {
      // HTML injection fix: kullanıcı verilerini escape et
      const safeMemberName = escapeHtml(member.name ?? '')
      const safeCommunityName = escapeHtml(community.name)

      await sendEmail({
        to: member.email,
        subject: `${community.name} — hoş geldin`,
        html: `
          <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
            <p style="font-style: italic; color: #B8541A;">No. 0001</p>
            <h1 style="color: #1F4A3D; font-weight: 500; font-size: 1.5rem;">
              hoş geldin ${safeMemberName}
            </h1>
            <p style="color: #1F2A24;">
              <em>${safeCommunityName}</em> topluluğuna kabul edildin.
              Etkinliklerden haberdar olacaksın.
            </p>
            <p style="font-style: italic; color: #1F2A24; opacity: 0.6; margin-top: 2rem;">
              literas
            </p>
          </div>
        `,
      })
    }

    return NextResponse.json({ ok: true })
  }

  if (action === 'reject') {
    // IDOR fix: community_id de kontrol edilsin
    // Sessizce sil, kimseye söyleme
    const { error } = await supabase
      .from('community_members')
      .delete()
      .eq('id', memberId)
      .eq('community_id', communityId)

    if (error) {
      console.error('[member] reject hatası:', error)
      return NextResponse.json({ error: 'Reddedilemedi' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 })
}

