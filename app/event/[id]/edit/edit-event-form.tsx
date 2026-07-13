'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

function toLocalInputValue(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function EditEventForm({ event }: { event: any }) {
  const router = useRouter()
  const [title, setTitle] = useState(event.title)
  const [description, setDescription] = useState(event.description ?? '')
  const [location, setLocation] = useState(event.location)
  const [eventDate, setEventDate] = useState(toLocalInputValue(event.event_date))
  const [maxAttendees, setMaxAttendees] = useState(
    event.max_attendees ? String(event.max_attendees) : ''
  )
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch(`/api/event/${event.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description: description || null,
        location,
        event_date: new Date(eventDate).toISOString(),
        max_attendees: maxAttendees ? parseInt(maxAttendees) : null,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Kaydedilemedi. Lütfen tekrar dene.')
      setLoading(false)
      return
    }

    router.push(`/event/${event.id}`)
    router.refresh()
  }

  async function handleDelete() {
    const confirmed = confirm(
      `"${event.title}" etkinliğini iptal etmek istediğine emin misin?\n\nKatılımcılara iptal maili gidecek. Bu işlem geri alınamaz.`
    )
    if (!confirmed) return

    setDeleting(true)
    setError('')

    const res = await fetch(`/api/event/${event.id}`, {
      method: 'DELETE',
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'İptal edilemedi. Lütfen tekrar dene.')
      setDeleting(false)
      return
    }

    // Etkinlik silindi, topluluğa geri dön (varsa) yoksa ana sayfa
    if (event.community_id) {
      router.push(`/community/${event.community_id}`)
    } else {
      router.push('/')
    }
    router.refresh()
  }

  const busy = loading || deleting

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
          disabled={busy}
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
          disabled={busy}
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
          disabled={busy}
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
          disabled={busy}
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
          disabled={busy}
        />
      </div>

      {error && (
        <p style={{ color: 'var(--seal)', fontSize: '0.9rem' }}>{error}</p>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <button type="submit" disabled={busy} className="btn-primary">
          {loading ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/event/${event.id}`)}
          disabled={busy}
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

      {/* Tehlike bölgesi — etkinliği iptal et */}
      <div style={{
        marginTop: '2rem',
        paddingTop: '1.5rem',
        borderTop: '1.5px dashed var(--border, rgba(0,0,0,0.15))',
      }}>
        <p style={{
          fontSize: '0.85rem',
          opacity: 0.7,
          marginBottom: '0.75rem',
          fontFamily: "'IBM Plex Mono', monospace",
        }}>
          etkinliği iptal etmek istersen
        </p>
        <button
          type="button"
          onClick={handleDelete}
          disabled={busy}
          style={{
            background: 'none',
            border: '1.5px solid var(--coral-deep, #B84330)',
            color: 'var(--coral-deep, #B84330)',
            padding: '10px 20px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: busy ? 'wait' : 'pointer',
            opacity: busy ? 0.5 : 1,
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          {deleting ? 'İptal ediliyor…' : 'Etkinliği iptal et'}
        </button>
      </div>
    </form>
  )
}
