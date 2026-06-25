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

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)

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
      marginTop: '1rem',
      display: 'flex',
      gap: '0.75rem',
      flexWrap: 'wrap',
      alignItems: 'center',
    }}>
      <Link
        href={`/event/${eventId}/edit`}
        style={{
          fontFamily: 'Newsreader, serif',
          fontStyle: 'italic',
          fontSize: '0.95rem',
          color: 'var(--ink)',
          opacity: 0.75,
          textDecoration: 'underline',
          textDecorationStyle: 'dotted',
        }}
      >
        düzenle
      </Link>

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            fontFamily: 'Newsreader, serif',
            fontStyle: 'italic',
            fontSize: '0.95rem',
            color: 'var(--seal)',
            opacity: 0.75,
            cursor: 'pointer',
            textDecoration: 'underline',
            textDecorationStyle: 'dotted',
          }}
        >
          iptal et
        </button>
      ) : (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontFamily: 'Newsreader, serif',
          fontStyle: 'italic',
          fontSize: '0.95rem',
        }}>
          <span style={{ opacity: 0.75 }}>emin misin?</span>
          <button
            onClick={handleCancel}
            disabled={loading}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              fontFamily: 'inherit',
              fontStyle: 'inherit',
              fontSize: 'inherit',
              color: 'var(--seal)',
              cursor: loading ? 'wait' : 'pointer',
              textDecoration: 'underline',
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
              fontStyle: 'inherit',
              fontSize: 'inherit',
              color: 'var(--ink)',
              opacity: 0.5,
              cursor: 'pointer',
              textDecoration: 'underline',
              textDecorationStyle: 'dotted',
            }}
          >
            vazgeç
          </button>
        </span>
      )}

      {error && (
        <p style={{ color: 'var(--seal)', fontSize: '0.9rem' }}>{error}</p>
      )}
    </div>
  )
}
