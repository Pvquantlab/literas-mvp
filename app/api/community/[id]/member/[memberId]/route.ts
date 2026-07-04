import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { sendEmail } from '@/lib/email'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const { id: communityId, memberId } = await params
  const body = await req.json()
  const { action, currentRole } = body as {
    action: 'toggle-admin' | 'approve' | 'reject'
    currentRole?: 'member' | 'admin'
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
    .single()

  if (!actor || actor.status !== 'approved' || !['founder', 'admin'].includes(actor.role)) {
    return NextResponse.json({ error: 'Yetkin yok' }, { status: 403 })
  }

  if (action === 'toggle-admin') {
    const newRole = currentRole === 'admin' ? 'member' : 'admin'
    const { error } = await supabase
      .from('community_members')
      .update({ role: newRole })
      .eq('id', memberId)
    if (error) {
      console.error('[member] toggle-admin hatası:', error)
      return NextResponse.json({ error: 'Güncellenemedi' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  if (action === 'approve') {
    // Önce üyeliği onayla
    const { data: updated, error } = await supabase
      .from('community_members')
      .update({ status: 'approved' })
      .eq('id', memberId)
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

    const { data: member } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('id', updated.user_id)
      .single()

    if (community && member?.email) {
      await sendEmail({
        to: member.email,
        subject: `${community.name} — hoş geldin`,
        html: `
          <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
            <p style="font-style: italic; color: #B8541A;">No. 0001</p>
            <h1 style="color: #1F4A3D; font-weight: 500; font-size: 1.5rem;">
              hoş geldin ${member.name ?? ''}
            </h1>
            <p style="color: #1F2A24;">
              <em>${community.name}</em> topluluğuna kabul edildin.
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
    // Sessizce sil, kimseye söyleme
    const { error } = await supabase
      .from('community_members')
      .delete()
      .eq('id', memberId)
    if (error) {
      console.error('[member] reject hatası:', error)
      return NextResponse.json({ error: 'Reddedilemedi' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Geçersiz aksiyon' }, { status: 400 })
}
