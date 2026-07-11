'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useWizard } from '../wizard-context'
import { submitCommunity } from '../actions'

export default function GonderStep() {
  const { draft, isSaving, setSaving } = useWizard()
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (isSaving) return
    setSaving(true)
    setError(null)
    try {
      await submitCommunity()
      // submitCommunity içeriden redirect ediyor
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Bir şey ters gitti.'
      setError(msg)
      setSaving(false)
    }
  }

  const canSubmit =
    !!draft.location_type && !!draft.name && !!draft.description && (draft.topic_ids?.length ?? 0) > 0

  return (
    <div className="auth-card" style={{ padding: '32px' }}>
      <h2 className="serif" style={{ fontSize: '24px', margin: '0 0 20px', color: 'var(--ink)' }}>
        Gözden geçir
      </h2>

      <dl style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px 20px', margin: 0 }}>
        <dt style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12.5px', color: 'var(--muted)' }}>Konum</dt>
        <dd style={{ margin: 0 }}>
          {draft.location_name ?? '—'}{' '}
          <Link href="/community/new/konum" style={{ fontSize: '12.5px', color: 'var(--muted)', marginLeft: '8px' }}>Düzenle</Link>
        </dd>

        <dt style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12.5px', color: 'var(--muted)' }}>Konular</dt>
        <dd style={{ margin: 0 }}>
          {draft.topic_ids?.length ?? 0} konu seçili{' '}
          <Link href="/community/new/konular" style={{ fontSize: '12.5px', color: 'var(--muted)', marginLeft: '8px' }}>Düzenle</Link>
        </dd>

        <dt style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12.5px', color: 'var(--muted)' }}>Ad</dt>
        <dd style={{ margin: 0 }}>
          {draft.name ?? '—'}{' '}
          <Link href="/community/new/ad" style={{ fontSize: '12.5px', color: 'var(--muted)', marginLeft: '8px' }}>Düzenle</Link>
        </dd>

        <dt style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12.5px', color: 'var(--muted)' }}>Açıklama</dt>
        <dd style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
          {draft.description ? draft.description.slice(0, 200) + (draft.description.length > 200 ? '…' : '') : '—'}{' '}
          <Link href="/community/new/aciklama" style={{ fontSize: '12.5px', color: 'var(--muted)', marginLeft: '8px' }}>Düzenle</Link>
        </dd>
      </dl>

      <p style={{ marginTop: '24px', fontSize: '13.5px', color: 'var(--muted)', lineHeight: 1.6 }}>
        Kapak fotoğrafı Aşama C5'te eklenecek. Şimdilik boş gönderebilirsin, sonra topluluk sayfandan yüklersin.
      </p>

      {error && (
        <div style={{
          marginTop: '16px', padding: '12px 16px', borderRadius: '12px',
          background: 'rgba(176, 67, 48, .1)', border: '1.5px solid rgba(176, 67, 48, .3)',
          color: 'var(--coral-deep)', fontSize: '14px',
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px' }}>
        <Link href="/community/new/aciklama" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px', color: 'var(--muted)', textDecoration: 'none' }}>
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
