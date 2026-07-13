import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// Kabul edilen rapor kategorileri
const VALID_REASONS = [
  'spam',
  'rahatsiz_edici',
  'yanlis_bilgi',
  'sahte_hesap',
  'nefret_soylemi',
  'diger',
] as const

const VALID_TARGET_TYPES = ['event', 'community', 'user'] as const

export async function POST(req: Request) {
  const body = await req.json()
  const { target_type, target_id, reason, description } = body

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Giriş yapmalısın' }, { status: 401 })
  }

  // Validasyon
  if (!VALID_TARGET_TYPES.includes(target_type)) {
    return NextResponse.json({ error: 'Geçersiz hedef tipi' }, { status: 400 })
  }

  if (!VALID_REASONS.includes(reason)) {
    return NextResponse.json({ error: 'Geçersiz sebep' }, { status: 400 })
  }

  if (!target_id || typeof target_id !== 'string') {
    return NextResponse.json({ error: 'Hedef ID eksik' }, { status: 400 })
  }

  // Description opsiyonel ama varsa 500 karakter sınırı
  if (description && (typeof description !== 'string' || description.length > 500)) {
    return NextResponse.json(
      { error: 'Açıklama en fazla 500 karakter olabilir' },
      { status: 400 }
    )
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
