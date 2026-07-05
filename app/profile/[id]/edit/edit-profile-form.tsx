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
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <ImageUpload
          bucket="avatars"
          value={avatarUrl}
          onChange={setAvatarUrl}
          label="Avatar"
          hint="Kendine bir yüz seç. En fazla 2 MB, JPG/PNG/WEBP."
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--night)',
        }}>
          Hakkımda
        </label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={280}
          rows={5}
          placeholder="Kitap, yürüyüş, bir film... seni anlatan birkaç cümle."
          style={{
            padding: '12px 14px',
            border: '2px solid var(--border)',
            borderRadius: '12px',
            fontFamily: 'inherit',
            fontSize: '15px',
            lineHeight: 1.55,
            resize: 'vertical',
            background: 'white',
            color: 'var(--night)',
            fontWeight: 500,
          }}
        />
        <span style={{
          fontSize: '13px',
          color: 'var(--muted)',
          textAlign: 'right',
          fontWeight: 500,
        }}>
          {bio.length} / 280
        </span>
      </div>

      {error && (
        <div style={{
          background: 'var(--seal-soft)',
          border: '1px solid rgba(196, 98, 45, 0.25)',
          borderRadius: '12px',
          padding: '12px 16px',
          color: 'var(--seal-deep)',
          fontSize: '14px',
          fontWeight: 600,
          textAlign: 'center',
        }}>
          Bir şeyler ters gitti: {error}
        </div>
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