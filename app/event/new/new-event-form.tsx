'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ImageUpload from '@/components/image-upload'

type Community = { id: string; name: string }

export default function NewEventForm({
  userId,
  communities,
}: {
  userId: string
  communities: Community[]
}) {
  const router = useRouter()

  const [communityId, setCommunityId] = useState(communities[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [maxAttendees, setMaxAttendees] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

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
        cover_image_url: coverImageUrl,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Etkinlik oluşturulamadı.')
      setLoading(false)
      return
    }

    const { event } = await res.json()
    router.push(`/event/${event.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
    }}>
      <div style={groupStyle}>
        <label style={labelStyle}>Topluluk</label>
        <select
          value={communityId}
          onChange={(e) => setCommunityId(e.target.value)}
          required
        >
          {communities.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div style={groupStyle}>
        <label style={labelStyle}>Başlık</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Örn: Tutunamayanlar — bir kitap"
        />
      </div>

      <div style={groupStyle}>
        <label style={labelStyle}>
          Açıklama <span style={optionalStyle}>(isteğe bağlı)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Birkaç satırla anlat. Ne yapacağız, kime hitap ediyor?"
        />
      </div>

      <div style={groupStyle}>
        <label style={labelStyle}>Konum</label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
          placeholder="Örn: Kadıköy, Kahve Dünyası"
        />
      </div>

      <div style={groupStyle}>
        <label style={labelStyle}>Tarih ve saat</label>
        <input
          type="datetime-local"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          required
        />
      </div>

      <div style={groupStyle}>
        <label style={labelStyle}>
          Maksimum katılımcı <span style={optionalStyle}>(isteğe bağlı)</span>
        </label>
        <input
          type="number"
          value={maxAttendees}
          onChange={(e) => setMaxAttendees(e.target.value)}
          min="1"
          placeholder="Boş bırakırsan sınır yok"
        />
      </div>

      <div style={groupStyle}>
        <ImageUpload
          bucket="event-covers"
          value={coverImageUrl}
          onChange={setCoverImageUrl}
          label="Kapak görseli"
          hint="Bir görsel seç. İstersen şimdilik boş bırakabilirsin. En fazla 5 MB, JPG/PNG/WEBP."
        />
      </div>

      {error && (
        <div style={{
          background: 'var(--seal-soft)',
          border: '1px solid rgba(196, 98, 45, 0.25)',
          borderRadius: '12px',
          padding: '12px 16px',
          color: 'var(--seal-deep)',
          fontSize: '14px',
          fontWeight: 600,
          textAlign: 'center',
        }}>
          {error}
        </div>
      )}

      <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', marginTop: '4px' }}>
        {loading ? 'Oluşturuluyor…' : 'Etkinliği oluştur'}
      </button>
    </form>
  )
}

const groupStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '6px',
}

const labelStyle = {
  fontSize: '14px',
  fontWeight: 600,
  color: 'var(--night)',
}

const optionalStyle = {
  color: 'var(--muted)',
  fontWeight: 500,
}