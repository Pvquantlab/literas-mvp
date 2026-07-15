'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type Props = {
  eventId: string
  userId: string
  userHasRsvp: boolean
  userInWaitlist: boolean
  isFull: boolean
}

export default function RsvpForm(props: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleRsvp() {
    setLoading(true)
    setError('')

    const { error } = await supabase
      .from('rsvps')
      .insert({ event_id: props.eventId, user_id: props.userId })

    if (error) {
      if (error.message && error.message.indexOf('EVENT_FULL') !== -1) {
        setError('Bu etkinlik az once doldu. Bekleme listesine girebilirsin.')
        router.refresh()
      } else {
        setError('Katilim kaydedilemedi. Lutfen tekrar dene.')
      }
      setLoading(false)
      return
    }
    router.refresh()
  }

  async function handleCancel() {
    setLoading(true)
    setError('')

    const { error } = await supabase
      .from('rsvps')
      .delete()
      .eq('event_id', props.eventId)
      .eq('user_id', props.userId)

    if (error) {
      setError('Iptal basarisiz. Lutfen tekrar dene.')
      setLoading(false)
      return
    }
    router.refresh()
  }

  async function handleJoinWaitlist() {
    setLoading(true)
    setError('')

    const res = await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: props.eventId }),
    })

    if (!res.ok) {
      const data = await res.json().catch(function () {
        return {}
      })
      setError(data.error || 'Bekleme listesine eklenemedi')
      setLoading(false)
      return
    }
    router.refresh()
  }

  async function handleLeaveWaitlist() {
    setLoading(true)
    setError('')

    const res = await fetch('/api/waitlist?event_id=' + props.eventId, {
      method: 'DELETE',
    })

    if (!res.ok) {
      const data = await res.json().catch(function () {
        return {}
      })
      setError(data.error || 'Bekleme listesinden cikilamadi')
      setLoading(false)
      return
    }
    router.refresh()
  }

  // Durum 1: RSVP vermis
  if (props.userHasRsvp) {
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
          }}>{'\u2713'}</span>
          Katiliyorsun. Gorusmek uzere.
        </p>
        <button
          onClick={handleCancel}
          disabled={loading}
          className="btn-secondary"
          style={{ fontSize: '13.5px', padding: '8px 18px' }}
        >
          {loading ? 'Iptal ediliyor...' : 'Katilimi iptal et'}
        </button>
        {error ? <div style={errorStyle}>{error}</div> : null}
      </div>
    )
  }

  // Durum 2: Waitlist'te
  if (props.userInWaitlist) {
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
          marginBottom: '8px',
        }}>
          Bekleme listesindesin.
        </p>
        <p style={{
          color: 'var(--muted)',
          fontSize: '13.5px',
          marginBottom: '16px',
          lineHeight: 1.5,
          fontFamily: "'IBM Plex Mono', monospace",
        }}>
          Bir kisi katilimi iptal ederse yerine otomatik gecirilirsin.
        </p>
        <button
          onClick={handleLeaveWaitlist}
          disabled={loading}
          className="btn-secondary"
          style={{ fontSize: '13.5px', padding: '8px 18px' }}
        >
          {loading ? 'Cikiliyor...' : 'Bekleme listesinden cik'}
        </button>
        {error ? <div style={errorStyle}>{error}</div> : null}
      </div>
    )
  }

  // Durum 3: Etkinlik dolu, waitlist'e girme seçenegi
  if (props.isFull) {
    return (
      <div>
        <div style={{
          background: 'var(--paper-cream)',
          border: '1.5px solid var(--border)',
          padding: '14px 22px',
          borderRadius: '18px',
          fontFamily: "'IBM Plex Mono', monospace",
          color: 'var(--muted)',
          fontSize: '13.5px',
          marginBottom: '12px',
        }}>
          Etkinlik dolu. Bekleme listesine girebilirsin.
        </div>
        <button
          onClick={handleJoinWaitlist}
          disabled={loading}
          className="btn-primary"
          style={{ fontSize: '15px', padding: '11px 24px' }}
        >
          {loading ? 'Ekleniyor...' : 'Bekleme listesine gir'}
        </button>
        {error ? <div style={errorStyle}>{error}</div> : null}
      </div>
    )
  }

  // Durum 4: Normal RSVP
  return (
    <div>
      <button
        onClick={handleRsvp}
        disabled={loading}
        className="btn-primary"
        style={{ fontSize: '16px', padding: '13px 28px' }}
      >
        {loading ? 'Kaydediliyor...' : 'Katiliyorum'}
      </button>
      {error ? <div style={errorStyle}>{error}</div> : null}
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
