import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { reportUpdateSchema } from '@/lib/validations'
import { checkRateLimit } from '@/lib/rate-limit'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

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
    .maybeSingle()

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Yetkin yok' }, { status: 403 })
  }

  const rl = await checkRateLimit(req, user.id, 'normal')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Çok fazla istek, biraz bekle' },
      { status: 429, headers: rl.headers }
    )
  }

  const parsed = reportUpdateSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Geçersiz veri', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }
  const { status, admin_note } = parsed.data

  const { error: updateError } = await supabase
    .from('reports')
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
      admin_note: admin_note ?? null,
    })
    .eq('id', id)

  if (updateError) {
    console.error('[report PATCH] hatasi:', updateError)
    return NextResponse.json({ error: 'Güncellenemedi' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
