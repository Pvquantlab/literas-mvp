'use server'

import { createClient } from '@/lib/supabase-server'

export type TopicSuggestion = {
  id: number
  name: string
  slug: string
  is_popular: boolean
  categories: { slug: string; name: string }[]
}

/**
 * Türkçe karakter normalize
 */
function normalizeTr(text: string): string {
  return text
    .toLowerCase()
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i')
    .replace(/İ/g, 'i').replace(/I/g, 'i').replace(/i̇/g, 'i')
    .replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
}

/**
 * Konu arama.
 */
export async function searchTopics(query: string, limit: number = 40): Promise<TopicSuggestion[]> {
  const trimmed = query.trim()
  const supabase = await createClient()

  let dbQuery = supabase
    .from('topics')
    .select('id, name, slug, is_popular')
    .order('is_popular', { ascending: false })
    .order('name', { ascending: true })
    .limit(limit)

  if (trimmed.length >= 1) {
    const normalized = normalizeTr(trimmed)
    dbQuery = dbQuery.ilike('search_text', `%${normalized}%`)
  } else {
    // Boş arama = popüler konular
    dbQuery = dbQuery.eq('is_popular', true)
  }

  const { data, error } = await dbQuery

  if (error) {
    console.error('searchTopics error:', error)
    return []
  }

  return (data ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    is_popular: t.is_popular,
    categories: [],
  }))
}

/**
 * Popüler konular (başlangıçta gösterilecek).
 */
export async function getPopularTopics(limit: number = 30): Promise<TopicSuggestion[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('topics')
    .select('id, name, slug, is_popular')
    .eq('is_popular', true)
    .order('name', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('getPopularTopics error:', error)
    return []
  }

  return (data ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    is_popular: t.is_popular,
    categories: [],
  }))
}

/**
 * Verilen id listesindeki konuları getir (Seçtikleriniz için).
 */
export async function getTopicsByIds(ids: number[]): Promise<TopicSuggestion[]> {
  if (ids.length === 0) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('topics')
    .select('id, name, slug, is_popular')
    .in('id', ids)

  if (error) {
    console.error('getTopicsByIds error:', error)
    return []
  }

  return (data ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    is_popular: t.is_popular,
    categories: [],
  }))
}

/**
 * Kullanıcı konu önerir (havuza olmayan).
 */
export async function suggestTopic(name: string): Promise<{ ok: boolean; message: string }> {
  const trimmed = name.trim()
  if (trimmed.length < 2 || trimmed.length > 60) {
    return { ok: false, message: 'Konu adı 2-60 karakter olmalı.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, message: 'Giriş yapmalısın.' }
  }

  const { error } = await supabase
    .from('topic_suggestions')
    .insert({
      suggested_name: trimmed,
      suggested_by: user.id,
    })

  if (error) {
    console.error('suggestTopic error:', error)
    return { ok: false, message: 'Kaydedilemedi. Tekrar dener misin?' }
  }

  return {
    ok: true,
    message: 'Öneriniz alındı, teşekkürler. Onaylandığında havuza eklenecek.'
  }
}
