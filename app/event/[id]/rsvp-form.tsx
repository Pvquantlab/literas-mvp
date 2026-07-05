'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function RsvpForm({
  eventId,
  userId,
  userHasRsvp,
  isFull,
}: {
  eventId: string
  userId: string
  userHasRsvp: boolean
  isFull: boolean
}) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleRsvp() {
    setLoading(true)
    setError('')

    const { error } = await supabase
      .from('rsvps')
      .insert({ event_id: eventId, user_id: userId })

    if (error) {
      setError('Katılım kaydedilemedi: ' + error.message)
      setLoading(false)
    } else {
      router.refresh()
    }
  }

  async function handleCancel() {
    setLoading(true)
    setError('')

    const { error } = await supabase
      .from('rsvps')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', userId)

    if (error) {
      setError('İptal başarısız: ' + error.message)
      setLoading(false)
    } else {
      router.refresh()
    }
  }

  if (userHasRsvp) {
    return (
      <div style={{
        background: '#ffffff',
        padding: '20px 22px',
        borderRadius: '16px',
        border: '1px solid var(--border-soft)',
      }}>
        <p style={{
          color: 'var(--night)',
          fontSize: '15.5px',
          fontWeight: 700,
          marginBottom: '16px',
        }}>
          ✓ Katılıyorsun. Görüşmek üzere.
        </p>
        <button
          onClick={handleCancel}
          disabled={loading}
          className="btn-secondary"
          style={{ fontSize: '14px', padding: '0.6rem 1.25rem' }}
        >
          {loading ? 'İptal ediliyor...' : 'Katılımı iptal et'}
        </button>
        {error && (
          <div style={errorStyle}>{error}</div>
        )}
      </div>
    )
  }

  if (isFull) {
    return (
      <div style={{
        background: 'var(--paper-soft)',
        padding: '18px 22px',
        borderRadius: '16px',
        color: 'var(--muted)',
        fontSize: '15px',
        fontWeight: 600,
      }}>
        Maalesef etkinlik dolu.
      </div>
    )
  }

  return (
    <div>
      <button onClick={handleRsvp} disabled={loading} className="btn-primary">
        {loading ? 'Kaydediliyor...' : 'Katılıyorum'}
      </button>
      {error && (
        <div style={errorStyle}>{error}</div>
      )}
    </div>
  )
}

const errorStyle = {
  marginTop: '12px',
  background: 'var(--seal-soft)',
  border: '1px solid rgba(196, 98, 45, 0.25)',
  borderRadius: '12px',
  padding: '10px 14px',
  color: 'var(--seal-deep)',
  fontSize: '13.5px',
  fontWeight: 600,
}