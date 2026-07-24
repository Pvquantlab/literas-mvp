'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewEventForm({
  userId,
  communities,
}: {
  userId: string
  communities: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [communityId, setCommunityId] = useState(communities[0]?.id ?? '')
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

    // API rotası üzerinden oluştur: zod doğrulama, rate limit,
    // founder/admin yetki kontrolü ve üyelere bildirim e-postası burada çalışır.
    const res = await fetch('/api/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        community_id: communityId,
        title,
        description: description || null,
        location,
        event_date: new Date(eventDate).toISOString(),
        max_attendees: maxAttendees ? parseInt(maxAttendees) : null,
      }),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      // zod alan hataları varsa ilkini göster
      const firstFieldError =
        data.details && typeof data.details === 'object'
          ? (Object.values(data.details).flat()[0] as string | undefined)
          : undefined
      setError(data.error === 'Geçersiz veri' && firstFieldError
        ? firstFieldError
        : data.error ?? 'Etkinlik oluşturulamadı. Lütfen tekrar dene.')
      setLoading(false)
      return
    }

    router.push(`/event/${data.event.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {communities.length > 1 && (
        <div style={groupStyle}>
          <label htmlFor="community" style={labelStyle}>Hangi topluluk için?</label>
          <select
            id="community"
            value={communityId}
            onChange={(e) => setCommunityId(e.target.value)}
            required
          >
            {communities.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      <div style={groupStyle}>
        <label htmlFor="title" style={labelStyle}>Başlık</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Örn: Tutunamayanlar — bir kitap"
        />
      </div>

      <div style={groupStyle}>
        <label htmlFor="description" style={labelStyle}>
          Açıklama <span style={{ opacity: 0.5 }}>(isteğe bağlı)</span>
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Birkaç satırla anlat. Ne yapacağız, kime hitap ediyor?"
        />
      </div>

      <div style={groupStyle}>
        <label htmlFor="location" style={labelStyle}>Konum</label>
        <input
          id="location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
          placeholder="Örn: Kadıköy, Kahve Dünyası"
        />
      </div>

      <div style={groupStyle}>
        <label htmlFor="eventDate" style={labelStyle}>Tarih ve saat</label>
        <input
          id="eventDate"
          type="datetime-local"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          required
        />
      </div>

      <div style={groupStyle}>
        <label htmlFor="maxAttendees" style={labelStyle}>
          Maksimum katılımcı <span style={{ opacity: 0.5 }}>(isteğe bağlı)</span>
        </label>
        <input
          id="maxAttendees"
          type="number"
          value={maxAttendees}
          onChange={(e) => setMaxAttendees(e.target.value)}
          min="1"
          placeholder="Boş bırakırsan sınır yok"
        />
      </div>

      {error && (
        <div style={{
          background: 'rgba(176, 67, 48, .1)',
          border: '1.5px solid rgba(176, 67, 48, .3)',
          borderRadius: '12px',
          padding: '12px 16px',
          color: 'var(--coral-deep)',
          fontSize: '14px',
          fontWeight: 600,
          textAlign: 'center',
        }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn-primary"
        style={{ width: '100%', marginTop: '8px', textAlign: 'center' }}
      >
        {loading ? 'Oluşturuluyor...' : 'Etkinliği oluştur'}
      </button>
    </form>
  )
}

const groupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
}

const labelStyle: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: '13px',
  fontWeight: 600,
  color: 'var(--ink)',
}