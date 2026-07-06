'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function EventActions({ eventId }: { eventId: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCancel() {
    setLoading(true)
    setError(null)
    const { error } = await supabase.from('events').delete().eq('id', eventId)
    if (error) {
      setError('İptal edilemedi: ' + error.message)
      setLoading(false)
      return
    }
    router.push('/')
    router.refresh()
  }

  return (
    <div style={{
      marginTop: '1.25rem',
      display: 'flex',
      gap: '0.75rem',
      flexWrap: 'wrap',
      alignItems: 'center',
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: '13px',
    }}>
      <Link
        href={`/event/${eventId}/edit`}
        style={{
          color: 'var(--ink)',
          textDecoration: 'underline',
          textUnderlineOffset: '3px',
        }}
      >
        düzenle
      </Link>

      <span style={{ color: 'var(--muted)' }}>·</span>

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            fontFamily: 'inherit',
            fontSize: 'inherit',
            color: 'var(--coral-deep)',
            cursor: 'pointer',
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
          }}
        >
          etkinliği iptal et
        </button>
      ) : (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: 'var(--muted)' }}>emin misin?</span>
          <button
            onClick={handleCancel}
            disabled={loading}
            style={{
              background: 'var(--coral-deep)',
              color: 'var(--paper-soft)',
              border: 'none',
              padding: '5px 12px',
              borderRadius: '999px',
              fontFamily: 'inherit',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? 'siliniyor...' : 'evet, iptal et'}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={loading}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              fontFamily: 'inherit',
              fontSize: 'inherit',
              color: 'var(--muted)',
              cursor: 'pointer',
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
            }}
          >
            vazgeç
          </button>
        </span>
      )}

      {error && (
        <p style={{ color: 'var(--coral-deep)', fontSize: '13px', width: '100%', marginTop: '8px' }}>{error}</p>
      )}
    </div>
  )
}