'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function EventActions({
  eventId,
  seriesId,
}: {
  eventId: string
  seriesId?: string | null
}) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uyari, setUyari] = useState<string | null>(null)
  const [kapsam, setKapsam] = useState<'tek' | 'sonrakiler' | 'tumu'>('tek')

  async function handleCancel() {
    setLoading(true)
    setError(null)
    setUyari(null)

    // API rotası üzerinden sil: yetki kontrolü, rate limit ve
    // katılımcılara iptal e-postası burada çalışır.
    // DELETE govdeyi okumuyor — kapsam query string'den gider.
    const res = await fetch(
      `/api/event/${eventId}${kapsam !== 'tek' ? `?kapsam=${kapsam}` : ''}`,
      { method: 'DELETE' }
    )

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'İptal edilemedi. Lütfen tekrar dene.')
      setLoading(false)
      return
    }

    // Toplu kapsamda o an baktığımız buluşma elle düzenlenmişse rota onu
    // atlar — yönlendirmeden önce bunu söylemek zorundayız, yoksa kullanıcı
    // az önce baktığı buluşmanın hâlâ yayında olduğunu bilmeden ayrılır.
    const data = await res.json().catch(() => ({}))
    if (data.bu_atlandi) {
      setUyari(
        `${data.silinen ?? 0} buluşma iptal edildi. Baktığın buluşma elle ` +
        `düzenlendiği için atlandı — onu tek tek iptal edebilirsin.`
      )
      setLoading(false)
      setConfirming(false)
      router.refresh()
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div style={{
      marginTop: '1.25rem',
      display: 'flex',
      gap: '0.75rem',
      flexWrap: 'wrap',
      alignItems: 'center',
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: '13px',
    }}>
      <Link
        href={`/event/${eventId}/edit`}
        style={{
          color: 'var(--ink)',
          textDecoration: 'underline',
          textUnderlineOffset: '3px',
        }}
      >
        düzenle
      </Link>

      <span style={{ color: 'var(--muted)' }}>·</span>

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            fontFamily: 'inherit',
            fontSize: 'inherit',
            color: 'var(--coral-deep)',
            cursor: 'pointer',
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
          }}
        >
          etkinliği iptal et
        </button>
      ) : (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--muted)' }}>emin misin? katılımcılara iptal maili gider</span>
          {seriesId && (
            <span style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontWeight: 600, color: 'var(--ink)' }}>Bu iptal neyi kapsasın?</span>
              {([
                ['tek', 'Yalnızca bu buluşma'],
                ['sonrakiler', 'Bu buluşma ve sonrakiler'],
                ['tumu', 'Serinin tüm gelecek buluşmaları'],
              ] as const).map(([deger, etiket]) => (
                <label
                  key={deger}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px' }}
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
            </span>
          )}
          <button
            onClick={handleCancel}
            disabled={loading}
            style={{
              background: 'var(--coral-deep)',
              color: 'var(--paper-soft)',
              border: 'none',
              padding: '5px 12px',
              borderRadius: '999px',
              fontFamily: 'inherit',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? 'siliniyor...' : 'evet, iptal et'}
          </button>
          <button
            onClick={() => {
              setConfirming(false)
              setKapsam('tek')
            }}
            disabled={loading}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              fontFamily: 'inherit',
              fontSize: 'inherit',
              color: 'var(--muted)',
              cursor: 'pointer',
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
            }}
          >
            vazgeç
          </button>
        </span>
      )}

      {error && (
        <p style={{ color: 'var(--coral-deep)', fontSize: '13px', width: '100%', marginTop: '8px' }}>{error}</p>
      )}
      {uyari && (
        <p style={{ color: 'var(--ink)', fontSize: '13px', width: '100%', marginTop: '8px' }}>{uyari}</p>
      )}
    </div>
  )
}