'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function NewCommunityForm() {
  const router = useRouter()
  const supabase = createClient()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [city, setCity] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // 1. Kullanıcıyı al
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Önce giriş yapmalısın.')
      setLoading(false)
      return
    }

    // 2. Topluluğu oluştur
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        city: city.trim(),
        cover_image_url: coverImageUrl.trim() || null,
        founder_id: user.id,
      })
      .select()
      .single()

    if (communityError || !community) {
      setError('Topluluk oluşturulamadı. Tekrar dener misin?')
      console.error(communityError)
      setLoading(false)
      return
    }

    // 3. Kuran kişiyi founder + approved olarak üye yap
    const { error: memberError } = await supabase
      .from('community_members')
      .insert({
        community_id: community.id,
        user_id: user.id,
        role: 'founder',
        status: 'approved',
      })

    if (memberError) {
      setError('Üyelik kaydedilemedi.')
      console.error(memberError)
      setLoading(false)
      return
    }

    // 4. Yeni topluluğun sayfasına yönlendir (henüz yok, şimdilik ana sayfa)
    router.push('/')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="form">
      <div className="form-group">
        <label htmlFor="name">İsim</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Kadıköy Kitap Kulübü"
        />
      </div>

      <div className="form-group">
        <label htmlFor="city">Şehir</label>
        <input
          id="city"
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          required
          placeholder="İstanbul"
        />
      </div>

      <div className="form-group">
        <label htmlFor="description">Açıklama</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Topluluğun ne yapıyor, kimleri arıyor, nasıl bir his?"
        />
      </div>

      <div className="form-group">
        <label htmlFor="cover">Kapak görseli (URL)</label>
        <input
          id="cover"
          type="url"
          value={coverImageUrl}
          onChange={(e) => setCoverImageUrl(e.target.value)}
          placeholder="https://..."
        />
        <p className="form-hint">Bir görselin internetteki linki. İstersen şimdilik boş bırakabilirsin.</p>
      </div>

      {error && <p className="form-error">{error}</p>}

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? 'Kuruluyor…' : 'Topluluğu kur'}
      </button>
    </form>
  )
}