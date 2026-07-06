'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import ImageUpload from '@/components/image-upload'

// v2'nin 14 kategorisi (formda küçük harf slug'lar database'e yazılır)
const CATEGORY_OPTIONS = [
  { slug: 'kitap',      label: 'Kitap' },
  { slug: 'doğa',       label: 'Doğa' },
  { slug: 'müzik',      label: 'Müzik' },
  { slug: 'lezzet',     label: 'Lezzet' },
  { slug: 'dil',        label: 'Dil' },
  { slug: 'spor',       label: 'Spor' },
  { slug: 'sanat',      label: 'Sanat' },
  { slug: 'oyun',       label: 'Oyun' },
  { slug: 'tech',       label: 'Tech' },
  { slug: 'sinema',     label: 'Sinema' },
  { slug: 'fotoğraf',   label: 'Fotoğraf' },
  { slug: 'gönüllülük', label: 'Gönüllülük' },
  { slug: 'kariyer',    label: 'Kariyer' },
  { slug: 'sosyal',     label: 'Sosyal' },
]

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
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={groupStyle}>
        <label htmlFor="name" style={labelStyle}>İsim</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Kadıköy Kitap Kulübü"
        />
      </div>

      <div style={groupStyle}>
        <label htmlFor="category" style={labelStyle}>Kategori</label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
        >
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c.slug} value={c.slug}>{c.label}</option>
          ))}
        </select>
      </div>

      <div style={groupStyle}>
        <label htmlFor="city" style={labelStyle}>Şehir</label>
        <input
          id="city"
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          required
          placeholder="İstanbul"
        />
      </div>

      <div style={groupStyle}>
        <label htmlFor="description" style={labelStyle}>Açıklama</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Topluluğun ne yapıyor, kimleri arıyor, nasıl bir his?"
        />
      </div>

      <div style={groupStyle}>
        <ImageUpload
          bucket="community-covers"
          value={coverImageUrl}
          onChange={setCoverImageUrl}
          label="Kapak görseli"
          hint="Bir görsel seç. İstersen şimdilik boş bırakabilirsin. En fazla 5 MB, JPG/PNG/WEBP."
        />
      </div>

      {error && (
        <div style={{
          background: 'rgba(176, 67, 48, .1)',
          border: '1.5px solid rgba(176, 67, 48, .3)',
          borderRadius: '12px',
          padding: '12px 16px',
          color: 'var(--coral-deep)',
          fontSize: '14px',
          fontWeight: 600,
          textAlign: 'center',
        }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        className="btn-primary"
        disabled={loading}
        style={{ width: '100%', marginTop: '8px', textAlign: 'center' }}
      >
        {loading ? 'Kuruluyor…' : 'Topluluğu kur'}
      </button>
    </form>
  )
}

const groupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
}

const labelStyle: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: '13px',
  fontWeight: 600,
  color: 'var(--ink)',
}