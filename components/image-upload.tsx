'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { dosyayiDogrula, guvenliDosyaAdi } from '@/lib/upload'

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
    // Aynı dosya hatadan sonra tekrar seçilebilsin diye her seferinde sıfırla.
    e.target.value = ''
    if (!file) return

    // Kurallar lib/upload.ts'te — avatar editörüyle tek kaynaktan.
    // Boyut limiti artık kovaya göre değişiyor: burada sabit 5 MB yazıyordu,
    // ama avatars kovasının sunucu limiti 2 MB.
    const dogrulama = dosyayiDogrula(file, bucket)
    if (!dogrulama.ok) {
      setError(dogrulama.mesaj)
      return
    }

    setUploading(true)
    setError(null)

    const fileName = guvenliDosyaAdi(file.type)

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,  // MIME tipini açık ver
      })

    if (uploadError) {
      console.error('[image-upload] yükleme hatası:', uploadError)
      setError('Yükleme başarısız. Lütfen tekrar dene.')
      setUploading(false)
      return
    }

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
        <label style={{
          display: 'block',
          marginBottom: '8px',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--ink)',
        }}>
          {label}
        </label>
      )}

      {value ? (
        <div style={{ marginBottom: '8px' }}>
          <img
            src={value}
            alt="önizleme"
            style={{
              width: '100%',
              maxWidth: '400px',
              maxHeight: '240px',
              objectFit: 'cover',
              borderRadius: '14px',
              border: '1.5px solid var(--border)',
              display: 'block',
            }}
          />
          <button
            type="button"
            onClick={handleRemove}
            style={{
              marginTop: '10px',
              background: 'none',
              border: 'none',
              padding: 0,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '13px',
              color: 'var(--coral-deep)',
              cursor: 'pointer',
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
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
          border: '1.5px dashed var(--border-mid)',
          borderRadius: '14px',
          background: 'var(--paper-cream)',
          cursor: uploading ? 'wait' : 'pointer',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '13.5px',
          color: 'var(--muted)',
          opacity: uploading ? 0.5 : 1,
          transition: 'all 0.18s ease',
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
          marginTop: '8px',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '12px',
          color: 'var(--muted)',
          lineHeight: 1.5,
        }}>
          {hint}
        </p>
      )}

      {error && (
        <p style={{
          marginTop: '8px',
          fontSize: '13px',
          color: 'var(--coral-deep)',
          fontWeight: 600,
        }}>
          {error}
        </p>
      )}
    </div>
  )
}
