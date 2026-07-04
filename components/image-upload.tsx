'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'

type Props = {
  bucket: string
  value: string | null
  onChange: (url: string | null) => void
  label?: string
  hint?: string
}

export default function ImageUpload({ bucket, value, onChange, label, hint }: Props) {
  const supabase = createClient()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    // Dosya adı: benzersiz olsun, orijinal isim değil (güvenlik + çakışma önleme)
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      setError('Yükleme başarısız: ' + uploadError.message)
      console.error(uploadError)
      setUploading(false)
      return
    }

    // Public URL'i al
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName)

    onChange(publicUrl)
    setUploading(false)
  }

  function handleRemove() {
    onChange(null)
  }

  return (
    <div>
      {label && (
        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
          {label}
        </label>
      )}

      {value ? (
        <div style={{
          position: 'relative',
          display: 'inline-block',
          marginBottom: '0.5rem',
        }}>
          <img
            src={value}
            alt="önizleme"
            style={{
              width: '100%',
              maxWidth: '400px',
              maxHeight: '240px',
              objectFit: 'cover',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              display: 'block',
            }}
          />
          <button
            type="button"
            onClick={handleRemove}
            style={{
              marginTop: '0.5rem',
              background: 'none',
              border: 'none',
              padding: 0,
              fontFamily: 'Newsreader, serif',
              fontStyle: 'italic',
              fontSize: '0.85rem',
              color: 'var(--seal)',
              opacity: 0.7,
              cursor: 'pointer',
              textDecoration: 'underline',
              textDecorationStyle: 'dotted',
            }}
          >
            kaldır
          </button>
        </div>
      ) : (
        <label style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          maxWidth: '400px',
          height: '160px',
          border: '1.5px dashed var(--border)',
          borderRadius: '8px',
          background: 'white',
          cursor: uploading ? 'wait' : 'pointer',
          fontFamily: 'Newsreader, serif',
          fontStyle: 'italic',
          color: 'var(--ink)',
          opacity: uploading ? 0.5 : 0.7,
          transition: 'border-color 0.15s ease, opacity 0.15s ease',
        }}>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFile}
            disabled={uploading}
            style={{ display: 'none' }}
          />
          {uploading ? 'yükleniyor…' : 'bir görsel seç'}
        </label>
      )}

      {hint && (
        <p style={{
          marginTop: '0.4rem',
          fontSize: '0.85rem',
          color: 'var(--night)',
          opacity: 0.55,
        }}>
          {hint}
        </p>
      )}

      {error && (
        <p style={{
          marginTop: '0.4rem',
          fontSize: '0.85rem',
          color: 'var(--seal)',
        }}>
          {error}
        </p>
      )}
    </div>
  )
}
