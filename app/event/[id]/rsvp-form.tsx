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
        background: 'var(--paper-cream)',
        padding: '20px 22px',
        borderRadius: '18px',
        border: '1.5px solid var(--border)',
      }}>
        <p style={{
          color: 'var(--ink)',
          fontSize: '15.5px',
          fontWeight: 700,
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            background: 'var(--lime)',
            border: '1.5px solid var(--ink)',
            display: 'inline-grid',
            placeItems: 'center',
            fontSize: '13px',
          }}>✓</span>
          Katılıyorsun. Görüşmek üzere.
        </p>
        <button
          onClick={handleCancel}
          disabled={loading}
          className="btn-secondary"
          style={{ fontSize: '13.5px', padding: '8px 18px' }}
        >
          {loading ? 'İptal ediliyor...' : 'Katılımı iptal et'}
        </button>
        {error && <div style={errorStyle}>{error}</div>}
      </div>
    )
  }

  if (isFull) {
    return (
      <div style={{
        background: 'var(--paper-cream)',
        border: '1.5px solid var(--border)',
        padding: '18px 22px',
        borderRadius: '18px',
        fontFamily: "'IBM Plex Mono', monospace",
        color: 'var(--muted)',
        fontSize: '13.5px',
      }}>
        ✿ maalesef etkinlik dolu
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={handleRsvp}
        disabled={loading}
        className="btn-primary"
        style={{ fontSize: '16px', padding: '13px 28px' }}
      >
        {loading ? 'Kaydediliyor...' : 'Katılıyorum'}
      </button>
      {error && <div style={errorStyle}>{error}</div>}
    </div>
  )
}

const errorStyle: React.CSSProperties = {
  marginTop: '12px',
  background: 'rgba(176, 67, 48, .1)',
  border: '1.5px solid rgba(176, 67, 48, .3)',
  borderRadius: '12px',
  padding: '10px 14px',
  color: 'var(--coral-deep)',
  fontSize: '13.5px',
  fontWeight: 600,
}