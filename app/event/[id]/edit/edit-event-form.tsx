'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { isoToLocalInput, localInputToISO } from '@/lib/date'

export default function EditEventForm({ event }: { event: any }) {
  const router = useRouter()
  const [title, setTitle] = useState(event.title)
  const [description, setDescription] = useState(event.description ?? '')
  const [location, setLocation] = useState(event.location)
  const [eventDate, setEventDate] = useState(isoToLocalInput(event.event_date))
  const [maxAttendees, setMaxAttendees] = useState(
    event.max_attendees ? String(event.max_attendees) : ''
  )
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [kapsam, setKapsam] = useState<'tek' | 'sonrakiler' | 'tumu'>('tek')
  const [sonuc, setSonuc] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSonuc('')

    const res = await fetch(`/api/event/${event.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description: description || null,
        location,
        event_date: localInputToISO(eventDate),
        max_attendees: maxAttendees ? parseInt(maxAttendees) : null,
        kapsam,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Kaydedilemedi. Lütfen tekrar dene.')
      setLoading(false)
      return
    }

    // Toplu kapsamda kaç satır güncellendi, kaçı atlandı — kullanıcı bilmeli.
    if (kapsam !== 'tek') {
      const data = await res.json().catch(() => ({}))
      const atlanan = data.atlanan ?? 0
      setSonuc(
        `${data.guncellenen ?? 0} buluşma güncellendi` +
          (atlanan > 0 ? `, elle düzenlendiği için ${atlanan} buluşma atlandı` : '') +
          (data.yeni_series_id ? '. Bu buluşma ve sonrakiler ayrı bir seri oldu.' : '') +
          (data.ayrildi > 0 ? '. Bu buluşma seriden ayrıldı.' : '') +
          // Kullanicinin o an baktigi bulusma elle duzenlenmisse toplu
          // guncelleme TAM DA ONU atliyor; sayfa degismemis gorunur.
          (data.bu_atlandi ? '. Baktığın buluşma elle düzenlendiği için atlandı — onu tek tek güncelleyebilirsin.' : '')
      )
      setLoading(false)
      router.refresh()
      return
    }

    router.push(`/event/${event.id}`)
    router.refresh()
  }

  async function handleDelete() {
    // Kaydet için secilen kapsam burada da gecerli: kullanici "tumu"
    // secip iptale basarsa serinin tamami silinecegini gormeli — aksi
    // halde kaydetmek icin secip unuttugu kapsamla ters yonde surpriz olur.
    const kapsamMetni =
      kapsam === 'tumu' ? '\n\nSerinin TÜM gelecek buluşmaları iptal edilecek.'
      : kapsam === 'sonrakiler' ? '\n\nBu buluşma ve sonraki buluşmalar iptal edilecek.'
      : ''
    const confirmed = confirm(
      `"${event.title}" etkinliğini iptal etmek istediğine emin misin?${kapsamMetni}\n\nKatılımcılara iptal maili gidecek. Bu işlem geri alınamaz.`
    )
    if (!confirmed) return

    setDeleting(true)
    setError('')

    const res = await fetch(
      `/api/event/${event.id}${kapsam !== 'tek' ? `?kapsam=${kapsam}` : ''}`,
      { method: 'DELETE' }
    )

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
          disabled={busy || kapsam !== 'tek'}
        />
      </div>

      {event.series_id && (
        <div style={groupStyle}>
          <span style={labelStyle}>Bu değişiklik neyi kapsasın?</span>
          {([
            ['tek', 'Yalnızca bu buluşma'],
            ['sonrakiler', 'Bu buluşma ve sonrakiler'],
            ['tumu', 'Serinin tüm gelecek buluşmaları'],
          ] as const).map(([deger, etiket]) => (
            <label
              key={deger}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px' }}
            >
              <input
                type="radio"
                name="kapsam"
                value={deger}
                checked={kapsam === deger}
                onChange={() => setKapsam(deger)}
                style={{ width: '16px', height: '16px', padding: 0, margin: 0, flex: '0 0 auto' }}
              />
              {etiket}
            </label>
          ))}
          {kapsam !== 'tek' && (
            <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
              Toplu düzenlemede tarih değiştirilemez — serinin ritmini
              değiştirmek ayrı bir işlem. Elle düzenlenmiş buluşmalar atlanır.
            </span>
          )}
        </div>
      )}

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
      {sonuc && (
        <p style={{ color: 'var(--ink)', fontSize: '0.9rem' }}>{sonuc}</p>
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
            fontFamily: 'var(--font-serif), Georgia, serif',
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
