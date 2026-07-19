import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { reportSchema } from '@/lib/validations'

export async function POST(req: Request) {
  const parsed = reportSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Geçersiz veri', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }
  const { target_type, target_id, reason, description } = parsed.data

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Giriş yapmalısın' }, { status: 401 })
  }

  // Kullanıcı kendi kendini rapor edemesin
  if (target_type === 'user' && target_id === user.id) {
    return NextResponse.json(
      { error: 'Kendini raporlayamazsın' },
      { status: 400 }
    )
  }

  // Rapor oluştur
  const { error: insertError } = await supabase
    .from('reports')
    .insert({
      reporter_id: user.id,
      target_type,
      target_id,
      reason,
      description: description || null,
    })

  if (insertError) {
    // Duplicate: aynı kullanıcı aynı hedefi daha önce raporlamış
    if (insertError.code === '23505') {
      return NextResponse.json(
        { error: 'Bu içeriği zaten raporladın' },
        { status: 409 }
      )
    }
    console.error('[report] insert hatası:', insertError)
    return NextResponse.json({ error: 'Rapor gönderilemedi' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}