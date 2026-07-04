'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import ImageUpload from '@/components/image-upload'

export default function NewCommunityForm() {
  const router = useRouter()
  const supabase = createClient()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [city, setCity] = useState('')
  const [category, setCategory] = useState('kitap')
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Önce giriş yapmalısın.')
      setLoading(false)
      return
    }

    const { data: community, error: communityError } = await supabase
      .from('communities')
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        city: city.trim(),
        category,
        cover_image_url: coverImageUrl,
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
        <label htmlFor="category">Tür</label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
        >
          <option value="kitap">kitap</option>
          <option value="yürüyüş">yürüyüş</option>
          <option value="yoga">yoga</option>
          <option value="dil">dil</option>
          <option value="sanat">sanat</option>
          <option value="sohbet">sohbet</option>
          <option value="sinema">sinema</option>
        </select>
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
        <ImageUpload
          bucket="community-covers"
          value={coverImageUrl}
          onChange={setCoverImageUrl}
          label="Kapak görseli"
          hint="Bir görsel seç. İstersen şimdilik boş bırakabilirsin. En fazla 5 MB, JPG/PNG/WEBP."
        />
      </div>

      {error && <p className="form-error">{error}</p>}

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? 'Kuruluyor…' : 'Topluluğu kur'}
      </button>
    </form>
  )
}
