import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

const VALID_STATUSES = ['reviewed', 'dismissed', 'actioned'] as const

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const { status, admin_note } = body

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Giriş yapmalısın' }, { status: 401 })
  }

  // Admin mi?
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Yetkin yok' }, { status: 403 })
  }

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Geçersiz status' }, { status: 400 })
  }

  if (admin_note && (typeof admin_note !== 'string' || admin_note.length > 500)) {
    return NextResponse.json(
      { error: 'Admin notu en fazla 500 karakter' },
      { status: 400 }
    )
  }

  const { error: updateError } = await supabase
    .from('reports')
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
      admin_note: admin_note || null,
    })
    .eq('id', id)

  if (updateError) {
    console.error('[report PATCH] hatası:', updateError)
    return NextResponse.json({ error: 'Güncellenemedi' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
