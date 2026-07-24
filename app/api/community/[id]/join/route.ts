import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: communityId } = await params
  const supabase = await createClient()

  // Kim istiyor?
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Giriş yapmalısın' }, { status: 401 })
  }

  // Rate limit (dakikada 10)
  const rl = await checkRateLimit(req, user.id, 'normal')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Çok fazla istek, biraz bekle' },
      { status: 429, headers: rl.headers }
    )
  }

  // Topluluk onaylı mı? (draft/pending/rejected'a katılım istegi kabul edilmez)
  const { data: community, error: communityError } = await supabase
    .from('communities')
    .select('name, status')
    .eq('id', communityId)
    .single()

  if (communityError || !community) {
    return NextResponse.json({ error: 'Topluluk bulunamadı' }, { status: 404 })
  }

  if ((community as any).status !== 'approved') {
    return NextResponse.json(
      { error: 'Bu topluluk henüz aktif değil' },
      { status: 403 }
    )
  }

  // Üyeliği ekle (pending)
  const { error: insertError } = await supabase
    .from('community_members')
    .insert({
      community_id: communityId,
      user_id: user.id,
      role: 'member',
      status: 'pending',
    })

  if (insertError) {
    // Duplicate: kullanici zaten istek atmis (unique constraint)
    if (insertError.code === '23505') {
      return NextResponse.json(
        { error: 'Zaten bu topluluğa istek göndermişsin' },
        { status: 409 }
      )
    }
    console.error('[join] insert hatası:', insertError)
    return NextResponse.json({ error: 'İstek gönderilemedi' }, { status: 500 })
  }

  // Kurucuya bildirim: e-posta adresi DIŞARI VERİLMEDEN kilitli kutuya (email_outbox)
  // düşer; cron gizli anahtarla açıp gönderir. Hata olsa da isteği başarılı say.
  const { error: queueError } = await supabase.rpc('queue_join_notification', {
    p_community_id: communityId,
  })
  if (queueError) {
    console.error('[join] bildirim kuyruğa alınamadı:', queueError)
  }

  return NextResponse.json({ ok: true })
}
