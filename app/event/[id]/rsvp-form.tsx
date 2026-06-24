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
        background: 'white',
        padding: '1.25rem',
        borderRadius: '8px',
        border: '1px solid var(--border)',
      }}>
        <p style={{
          fontFamily: 'Newsreader, serif',
          fontStyle: 'italic',
          color: 'var(--ink)',
          marginBottom: '1rem',
        }}>
          Katılıyorsun. Görüşmek üzere.
        </p>
        <button onClick={handleCancel} disabled={loading} className="btn-secondary" style={{ fontSize: '0.9rem' }}>
          {loading ? 'İptal ediliyor...' : 'Katılımı iptal et'}
        </button>
        {error && <p style={{ color: 'var(--seal)', fontSize: '0.9rem', marginTop: '0.75rem' }}>{error}</p>}
      </div>
    )
  }

  if (isFull) {
    return (
      <p style={{
        background: 'white',
        padding: '1.25rem',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        fontFamily: 'Newsreader, serif',
        fontStyle: 'italic',
        opacity: 0.7,
      }}>
        Maalesef etkinlik dolu.
      </p>
    )
  }

  return (
    <div>
      <button onClick={handleRsvp} disabled={loading} className="btn-primary">
        {loading ? 'Kaydediliyor...' : 'Katılıyorum'}
      </button>
      {error && <p style={{ color: 'var(--seal)', fontSize: '0.9rem', marginTop: '0.75rem' }}>{error}</p>}
    </div>
  )
}
