import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { sendEmail } from '@/lib/email'
import { checkRateLimit } from '@/lib/rate-limit'

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
    .select(`
      name,
      status,
      founder:profiles!founder_id(name, email)
    `)
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

  // İstek yapanın ismini al
  const { data: requester } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .single()

  // Email at (hata olsa da isteği başarılı say — email opsiyonel)
  const founder = community.founder as any
  if (founder?.email) {
    const requesterName = requester?.name ?? 'biri'

    const safeRequesterName = escapeHtml(requesterName)
    const safeCommunityName = escapeHtml(community.name)

    await sendEmail({
      to: founder.email,
      subject: `${requesterName} topluluğuna katılmak istiyor`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
          <p style="font-style: italic; color: #B8541A;">No. 0001</p>
          <h1 style="color: #1F4A3D; font-weight: 500; font-size: 1.5rem;">
            yeni bir üyelik isteği
          </h1>
          <p style="color: #1F2A24;">
            <em>${safeRequesterName}</em>, <strong>${safeCommunityName}</strong> topluluğuna katılmak istiyor.
          </p>
          <p style="color: #1F2A24;">
            Onaylamak ya da reddetmek için topluluğa dön.
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
