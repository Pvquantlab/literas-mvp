'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import ImageUpload from '@/components/image-upload'

export default function EditProfileForm({
  userId,
  initialBio,
  initialAvatarUrl,
}: {
  userId: string
  initialBio: string
  initialAvatarUrl: string | null
}) {
  const router = useRouter()
  const [bio, setBio] = useState(initialBio)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        bio: bio.trim() || null,
        avatar_url: avatarUrl,
      })
      .eq('id', userId)
    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }
    router.push(`/profile/${userId}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <ImageUpload
          bucket="avatars"
          value={avatarUrl}
          onChange={setAvatarUrl}
          label="Avatar"
          hint="Kendine bir yüz seç. En fazla 2 MB, JPG/PNG/WEBP."
        />
      </div>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.9rem', color: 'var(--seal)' }}>Hakkımda</span>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={280}
          rows={5}
          placeholder="Kitap, yürüyüş, bir film... seni anlatan birkaç cümle."
          style={{
            padding: '0.75rem',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            fontFamily: 'inherit',
            fontSize: '1rem',
            lineHeight: 1.5,
            resize: 'vertical',
            background: 'white',
            color: 'var(--ink)',
          }}
        />
        <span style={{ fontSize: '0.8rem', color: 'var(--seal)', textAlign: 'right' }}>
          {bio.length} / 280
        </span>
      </label>
      {error && (
        <p style={{ color: 'var(--seal)', fontSize: '0.9rem' }}>
          Bir şeyler ters gitti: {error}
        </p>
      )}
      <button
        type="submit"
        disabled={saving}
        className="btn-primary"
        style={{ alignSelf: 'flex-start' }}
      >
        {saving ? 'Kaydediliyor...' : 'Kaydet'}
      </button>
    </form>
  )
}
