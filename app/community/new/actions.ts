'use server'

import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { communitySchema, taslakSchema } from '@/lib/validations'

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

  // Taslak da kullanıcı girdisi ve jsonb'ye yazılıyor — sınırsız bırakılamaz.
  // Adımlar tek tek kaydettiği için parça doğrulaması (hepsi opsiyonel).
  const parsed = taslakSchema.safeParse(partial)
  if (!parsed.success) {
    const ilk = Object.values(parsed.error.flatten().fieldErrors).flat()[0]
    throw new Error(ilk ?? 'Geçersiz veri.')
  }

  // Önce mevcut taslağı çek, üzerine merge et
  const { data: existing } = await supabase
    .from('community_drafts')
    .select('data')
    .eq('user_id', user.id)
    .maybeSingle()

  const mergedData = { ...(existing?.data ?? {}), ...parsed.data }

  const { error } = await supabase
    .from('community_drafts')
    .upsert({
      user_id: user.id,
      data: mergedData,
      current_step: nextStep,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

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

  // Nihai doğrulama. Eskiden yalnızca "boş mu" kontrolü vardı: uzunluk sınırı
  // yoktu, yani 3 karakterlik ad ya da 1 MB'lık açıklama kaydedilebiliyordu.
  // communitySchema yazılmıştı ama YANLIŞ şekle göreydi ve hiç bağlanmamıştı.
  const parsed = communitySchema.safeParse(draft.data)
  if (!parsed.success) {
    const ilk = Object.values(parsed.error.flatten().fieldErrors).flat()[0]
    throw new Error(ilk ?? 'Taslak eksik. Lütfen tüm adımları tamamla.')
  }
  const d = parsed.data

  // 1) Topluluk kaydı
  const { data: community, error: communityError } = await supabase
    .from('communities')
    .insert({
      name: d.name.trim(),
      description: d.description.trim(),
      cover_image_url: d.cover_image_url,
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
    // KRİTİK: kurucu üyeliği yoksa topluluğu kimse yönetemez, etkinlik açamaz.
    // Eskiden hata yalnızca loglanıyordu ve ortada YÖNETİLEMEZ bir topluluk
    // kalıyordu. Üç insert tek işlem değil (PostgREST üzerinden), o yüzden
    // telafi ediyoruz: topluluğu geri al ve kullanıcıya söyle.
    console.error('community_members insert:', memberError)
    await supabase.from('communities').delete().eq('id', community.id)
    throw new Error('Topluluk oluşturulamadı, lütfen tekrar dene.')
  }

  // 4) Taslağı temizle
  await clearDraft()

  revalidatePath('/community')
  redirect(`/community/new/basarili?id=${community.id}`)
}
