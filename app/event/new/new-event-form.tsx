'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function NewEventForm({ userId }: { userId: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [maxAttendees, setMaxAttendees] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('events')
      .insert({
        title,
        description: description || null,
        location,
        event_date: new Date(eventDate).toISOString(),
        organizer_id: userId,
        max_attendees: maxAttendees ? parseInt(maxAttendees) : null,
      })
      .select()
      .single()

    if (error) {
      setError('Etkinlik oluşturulamadı: ' + error.message)
      setLoading(false)
    } else {
      router.push(`/event/${data.id}`)
      router.refresh()
    }
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
          placeholder="Örn: Tutunamayanlar — bir kitap"
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
          placeholder="Birkaç satırla anlat. Ne yapacağız, kime hitap ediyor?"
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
          placeholder="Örn: Kadıköy, Kahve Dünyası"
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

      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? 'Oluşturuluyor...' : 'Etkinliği oluştur'}
      </button>
    </form>
  )
}
