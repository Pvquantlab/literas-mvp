'use server'

import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export type WizardStep = 'konum' | 'konular' | 'ad' | 'aciklama' | 'gonder'

export type LocationType = 'physical' | 'online'

export type DraftData = {
  location_type?: LocationType
  location_name?: string
  topic_ids?: number[]
  name?: string
  description?: string
  cover_image_url?: string | null
}

/**
 * Kullanıcının mevcut taslağını yükle. Yoksa null döner.
 */
export async function loadDraft(): Promise<{ data: DraftData; current_step: WizardStep } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('community_drafts')
    .select('data, current_step')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !data) return null
  return {
    data: (data.data ?? {}) as DraftData,
    current_step: (data.current_step ?? 'konum') as WizardStep,
  }
}

/**
 * Taslağı kaydet (upsert). Adımı ilerlet.
 */
export async function saveDraft(partial: Partial<DraftData>, nextStep: WizardStep) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Giriş yapmalısın.')

  // Önce mevcut taslağı çek, üzerine merge et
  const { data: existing } = await supabase
    .from('community_drafts')
    .select('data')
    .eq('user_id', user.id)
    .maybeSingle()

  const mergedData = { ...(existing?.data ?? {}), ...partial }

  const { error } = await supabase
    .from('community_drafts')
    .upsert({
      user_id: user.id,
      data: mergedData,
      current_step: nextStep,
      updated_at: new Date().toISOString(),
    })

  if (error) {
    console.error('saveDraft error:', error)
    throw new Error('Taslak kaydedilemedi.')
  }

  return { ok: true }
}

/**
 * Taslağı sil (kullanıcı vazgeçerse veya submit sonrası).
 */
export async function clearDraft() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('community_drafts')
    .delete()
    .eq('user_id', user.id)
}

/**
 * Nihai: Taslağı topluluğa dönüştür ve inceleme sırasına gönder.
 */
export async function submitCommunity() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Giriş yapmalısın.')

  const draft = await loadDraft()
  if (!draft) throw new Error('Taslak bulunamadı.')

  const d = draft.data
  if (!d.location_type || !d.name || !d.description || !d.topic_ids?.length) {
    throw new Error('Taslak eksik. Lütfen tüm adımları tamamla.')
  }

  // 1) Topluluk kaydı
  const { data: community, error: communityError } = await supabase
    .from('communities')
    .insert({
      name: d.name.trim(),
      description: d.description.trim(),
      cover_image_url: d.cover_image_url ?? null,
      founder_id: user.id,
      location_type: d.location_type,
      location_name: d.location_name ?? null,
      // eski kolonlar geriye dönük — city artık location_name ile aynı
      city: d.location_name ?? null,
      status: 'pending_review',
    })
    .select()
    .single()

  if (communityError || !community) {
    console.error('community insert:', communityError)
    throw new Error('Topluluk oluşturulamadı.')
  }

  // 2) Konu ilişkilerini kur
  const topicRows = d.topic_ids.map((topic_id) => ({
    community_id: community.id,
    topic_id,
  }))
  const { error: topicsError } = await supabase
    .from('community_topics')
    .insert(topicRows)

  if (topicsError) {
    console.error('community_topics insert:', topicsError)
    // Topluluk oluştu ama konular başarısız — yine de devam et, moderatör düzeltebilir
  }

  // 3) Kurucu üyeliği
  const { error: memberError } = await supabase
    .from('community_members')
    .insert({
      community_id: community.id,
      user_id: user.id,
      role: 'founder',
      status: 'approved',
    })

  if (memberError) {
    console.error('community_members insert:', memberError)
  }

  // 4) Taslağı temizle
  await clearDraft()

  revalidatePath('/community')
  redirect(`/community/new/basarili?id=${community.id}`)
}
