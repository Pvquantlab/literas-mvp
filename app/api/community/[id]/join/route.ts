import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { sendEmail } from '@/lib/email'

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
    console.error('[join] insert hatası:', insertError)
    return NextResponse.json({ error: 'İstek gönderilemedi' }, { status: 500 })
  }

  // Topluluğun kurucusunu ve ismini bul, isteyenin ismini al
  const { data: community } = await supabase
    .from('communities')
    .select(`
      name,
      founder:profiles!founder_id(name, email)
    `)
    .eq('id', communityId)
    .single()

  const { data: requester } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .single()

  // Email at (hata olsa da isteği başarılı say — email opsiyonel)
  if (community?.founder && (community.founder as any).email) {
    const founder = community.founder as any
    const requesterName = requester?.name ?? 'biri'

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
            <em>${requesterName}</em>, <strong>${community.name}</strong> topluluğuna katılmak istiyor.
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
