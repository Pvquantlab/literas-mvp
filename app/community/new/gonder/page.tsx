'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useWizard } from '../wizard-context'
import { submitCommunity } from '../actions'
import { getTopicsByIds, type TopicSuggestion } from '../topic-actions'
import ImageUpload from '@/components/image-upload'

export default function GonderStep() {
  const { draft, update, isSaving, setSaving } = useWizard()
  const [error, setError] = useState<string | null>(null)
  const [topics, setTopics] = useState<TopicSuggestion[]>([])
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(draft.cover_image_url ?? null)

  useEffect(() => {
    let cancelled = false
    if ((draft.topic_ids ?? []).length > 0) {
      getTopicsByIds(draft.topic_ids ?? []).then((t) => {
        if (!cancelled) setTopics(t)
      })
    }
    return () => { cancelled = true }
  }, [draft.topic_ids])

  async function handleSubmit() {
    if (isSaving) return
    setSaving(true)
    setError(null)
    // Kapak resmi state'ini draft'a yaz (submitCommunity onu kullanacak)
    update({ cover_image_url: coverImageUrl })
    // Kısa gecikme: state güncellemesi + saveDraft sırayı yakalayabilir
    try {
      // saveDraft'ı da atlamayalım — cover url draft'ta olmalı ki submit alsın
      const { saveDraft } = await import('../actions')
      await saveDraft({ cover_image_url: coverImageUrl }, 'gonder')
      await submitCommunity()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Bir şey ters gitti.'
      setError(msg)
      setSaving(false)
    }
  }

  const canSubmit =
    !!draft.location_type &&
    !!draft.name &&
    !!draft.description &&
    (draft.topic_ids?.length ?? 0) > 0

  return (
    <div className="auth-card" style={{ padding: '32px' }}>
      <h2 className="serif" style={{ fontSize: '24px', margin: '0 0 8px', color: 'var(--ink)' }}>
        Gözden geçirin
      </h2>
      <p style={{ fontSize: '13.5px', color: 'var(--muted)', margin: '0 0 24px' }}>
        Her şey doğru mu? Gönderdiğinde grubun inceleme sırasına girer.
      </p>

      {/* Özet tablosu */}
      <div style={{
        borderRadius: '14px',
        border: '1.5px solid rgba(30, 58, 43, 0.1)',
        overflow: 'hidden',
        marginBottom: '24px',
      }}>
        <SummaryRow label="Konum" value={draft.location_name ?? '—'} editHref="/community/new/konum" />
        <SummaryRow
          label="Konular"
          value={
            topics.length > 0
              ? topics.map((t) => t.name).join(' · ')
              : `${draft.topic_ids?.length ?? 0} konu`
          }
          editHref="/community/new/konular"
        />
        <SummaryRow label="Ad" value={draft.name ?? '—'} editHref="/community/new/ad" />
        <SummaryRow
          label="Açıklama"
          value={
            draft.description
              ? draft.description.length > 180
                ? draft.description.slice(0, 180) + '…'
                : draft.description
              : '—'
          }
          editHref="/community/new/aciklama"
          multiline
        />
      </div>

      {/* Kapak fotoğrafı */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '11.5px',
          color: 'var(--muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '10px',
        }}>
          kapak fotoğrafı (opsiyonel)
        </div>
        <ImageUpload
          bucket="community-covers"
          value={coverImageUrl}
          onChange={setCoverImageUrl}
          label="Kapak seç"
          hint="Önerilen: 1200×675 (16:9). En fazla 5 MB. JPG/PNG/WEBP. Şimdi eklemesen de sonra topluluk sayfandan yükleyebilirsin."
        />
      </div>

      {/* Bilgi */}
      <div style={{
        padding: '14px 16px',
        borderRadius: '12px',
        background: 'rgba(214, 255, 63, 0.15)',
        border: '1.5px solid rgba(214, 255, 63, 0.4)',
        marginBottom: '20px',
        fontSize: '13.5px',
        lineHeight: 1.55,
        color: 'var(--ink)',
      }}>
        <strong>Sonraki adım:</strong> Gönderdiğinde grubun <em>inceleme sırasına</em> girer. Onaylandığında bölgeni ve konularınla ilgilenen kişilere duyururuz.
      </div>

      {error && (
        <div style={{
          marginBottom: '16px',
          padding: '12px 16px',
          borderRadius: '12px',
          background: 'rgba(176, 67, 48, .1)',
          border: '1.5px solid rgba(176, 67, 48, .3)',
          color: 'var(--coral-deep, #b04330)',
          fontSize: '14px',
        }}>
          {error}
        </div>
      )}

      {/* Alt navigasyon */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: '20px',
        borderTop: '1px solid rgba(30, 58, 43, 0.1)',
      }}>
        <Link
          href="/community/new/aciklama"
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '13px',
            color: 'var(--muted)',
            textDecoration: 'none',
          }}
        >
          ← Geri
        </Link>
        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={!canSubmit || isSaving}
        >
          {isSaving ? 'Gönderiliyor…' : 'Grubu Oluştur'}
        </button>
      </div>
    </div>
  )
}

function SummaryRow({
  label,
  value,
  editHref,
  multiline,
}: {
  label: string
  value: string
  editHref: string
  multiline?: boolean
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '110px 1fr auto',
        gap: '16px',
        padding: '14px 18px',
        borderBottom: '1px solid rgba(30, 58, 43, 0.08)',
        alignItems: multiline ? 'start' : 'center',
      }}
    >
      <div style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '12px',
        color: 'var(--muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '14px',
        color: 'var(--ink)',
        lineHeight: 1.5,
        whiteSpace: multiline ? 'pre-wrap' : 'normal',
      }}>
        {value}
      </div>
      <Link
        href={editHref}
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '12px',
          color: 'var(--muted)',
          textDecoration: 'underline',
        }}
      >
        düzenle
      </Link>
    </div>
  )
}
