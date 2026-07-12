'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Giriş yapmalısın.')
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.is_admin) throw new Error('Yetkin yok.')
  return supabase
}

export async function approveCommunity(id: string) {
  const supabase = await requireAdmin()
  const { error } = await supabase
    .from('communities')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      review_note: null,
    })
    .eq('id', id)

  if (error) {
    console.error('approveCommunity error:', error)
    throw new Error('Onaylanamadı.')
  }
  revalidatePath('/admin/topluluklar')
  revalidatePath('/')
  return { ok: true }
}

export async function rejectCommunity(id: string, note: string) {
  const supabase = await requireAdmin()
  const { error } = await supabase
    .from('communities')
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      review_note: note?.trim() || null,
    })
    .eq('id', id)

  if (error) {
    console.error('rejectCommunity error:', error)
    throw new Error('Reddedilemedi.')
  }
  revalidatePath('/admin/topluluklar')
  return { ok: true }
}
