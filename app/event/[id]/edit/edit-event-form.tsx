'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

function toLocalInputValue(iso: string) {
  // ISO timestamp'i datetime-local input'unun beklediği "YYYY-MM-DDTHH:mm" formatına çevir
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function EditEventForm({ event }: { event: any }) {
  const router = useRouter()
  const supabase = createClient()

  const [title, setTitle] = useState(event.title)
  const [description, setDescription] = useState(event.description ?? '')
  const [location, setLocation] = useState(event.location)
  const [eventDate, setEventDate] = useState(toLocalInputValue(event.event_date))
  const [maxAttendees, setMaxAttendees] = useState(
    event.max_attendees ? String(event.max_attendees) : ''
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase
      .from('events')
      .update({
        title,
        description: description || null,
        location,
        event_date: new Date(eventDate).toISOString(),
        max_attendees: maxAttendees ? parseInt(maxAttendees) : null,
      })
      .eq('id', event.id)

    if (error) {
      setError('Kaydedilemedi: ' + error.message)
      setLoading(false)
      return
    }

    router.push(`/event/${event.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
          Başlık
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
          Açıklama <span style={{ opacity: 0.5 }}>(isteğe bağlı)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
        />
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
          Konum
        </label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
        />
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
          Tarih ve saat
        </label>
        <input
          type="datetime-local"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          required
        />
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
          Maksimum katılımcı <span style={{ opacity: 0.5 }}>(isteğe bağlı)</span>
        </label>
        <input
          type="number"
          value={maxAttendees}
          onChange={(e) => setMaxAttendees(e.target.value)}
          min="1"
          placeholder="Boş bırakırsan sınır yok"
        />
      </div>

      {error && (
        <p style={{ color: 'var(--seal)', fontSize: '0.9rem' }}>{error}</p>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/event/${event.id}`)}
          disabled={loading}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            fontFamily: 'Newsreader, serif',
            fontStyle: 'italic',
            fontSize: '0.95rem',
            color: 'var(--ink)',
            opacity: 0.65,
            cursor: 'pointer',
            textDecoration: 'underline',
            textDecorationStyle: 'dotted',
          }}
        >
          vazgeç
        </button>
      </div>
    </form>
  )
}
