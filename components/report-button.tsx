'use client'

import { useState } from 'react'

type TargetType = 'event' | 'community' | 'user'

type Props = {
  targetType: TargetType
  targetId: string
  label?: string
}

const REASONS = [
  { value: 'spam', label: 'Spam veya reklam' },
  { value: 'rahatsiz_edici', label: 'Rahatsız edici içerik' },
  { value: 'yanlis_bilgi', label: 'Yanlış bilgi' },
  { value: 'sahte_hesap', label: 'Sahte hesap veya etkinlik' },
  { value: 'nefret_soylemi', label: 'Nefret söylemi veya şiddet' },
  { value: 'diger', label: 'Diğer' },
]

export default function ReportButton(props: Props) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const label = props.label || 'Raporla'

  function handleClose() {
    setOpen(false)
    setReason('')
    setDescription('')
    setError('')
    setSent(false)
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!reason) {
      setError('Lütfen bir sebep seç')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_type: props.targetType,
          target_id: props.targetId,
          reason,
          description: description || undefined,
        }),
      })

      const data = await res.json().catch(function () {
        return {}
      })

      if (!res.ok) {
        setError(data.error || 'Rapor gönderilemedi')
        setLoading(false)
        return
      }

      setSent(true)
      setLoading(false)
    } catch (err) {
      setError('Bağlantı hatası. Tekrar dene.')
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={function () {
          setOpen(true)
        }}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--muted)',
          fontSize: '13px',
          cursor: 'pointer',
          textDecoration: 'underline',
          textUnderlineOffset: '3px',
          fontFamily: "'IBM Plex Mono', monospace",
          padding: 0,
        }}
      >
        {label}
      </button>

      {open && (
        <div
          onClick={handleClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(30, 58, 43, 0.5)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            onClick={function (e) {
              e.stopPropagation()
            }}
            style={{
              background: 'var(--paper-cream)',
              borderRadius: '18px',
              maxWidth: '480px',
              width: '100%',
              padding: '28px',
              border: '1.5px solid var(--border)',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
          >
            {sent ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>
                  ✿
                </div>
                <h2
                  className="serif"
                  style={{
                    fontSize: '22px',
                    color: 'var(--ink)',
                    margin: '0 0 10px',
                  }}
                >
                  Raporun alındı
                </h2>
                <p
                  style={{
                    color: 'var(--muted)',
                    fontSize: '14.5px',
                    lineHeight: 1.55,
                    marginBottom: '20px',
                  }}
                >
                  Ekibimiz kısa süre içinde inceleyecek. Teşekkürler.
                </p>
                <button
                  type="button"
                  onClick={handleClose}
                  className="btn-primary"
                >
                  Kapat
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <h2
                  className="serif"
                  style={{
                    fontSize: '24px',
                    color: 'var(--ink)',
                    margin: '0 0 8px',
                  }}
                >
                  Bu içeriği raporla
                </h2>
                <p
                  style={{
                    color: 'var(--muted)',
                    fontSize: '13.5px',
                    lineHeight: 1.5,
                    marginBottom: '20px',
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}
                >
                  Raporunu ekip inceleyecek. Kötüye kullanım hesap kapatmayla sonuçlanabilir.
                </p>

                <div style={{ marginBottom: '16px' }}>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '10px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--ink)',
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}
                  >
                    Sebep
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    {REASONS.map(function (r) {
                      return (
                        <label
                          key={r.value}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 14px',
                            border: '1.5px solid var(--border)',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            background:
                              reason === r.value
                                ? 'var(--lime-soft, rgba(214, 255, 63, 0.2))'
                                : 'transparent',
                            fontSize: '14px',
                            color: 'var(--ink)',
                          }}
                        >
                          <input
                            type="radio"
                            name="reason"
                            value={r.value}
                            checked={reason === r.value}
                            onChange={function (e) {
                              setReason(e.target.value)
                            }}
                            style={{ margin: 0 }}
                          />
                          {r.label}
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '6px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--ink)',
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}
                  >
                    Açıklama <span style={{ opacity: 0.5, fontWeight: 400 }}>(isteğe bağlı)</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={function (e) {
                      setDescription(e.target.value)
                    }}
                    rows={3}
                    maxLength={500}
                    placeholder="Detay eklemek istersen..."
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>

                {error && (
                  <div
                    style={{
                      background: 'rgba(176, 67, 48, .1)',
                      border: '1.5px solid rgba(176, 67, 48, .3)',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      color: 'var(--coral-deep)',
                      fontSize: '14px',
                      fontWeight: 600,
                      marginBottom: '16px',
                    }}
                  >
                    {error}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary"
                    style={{ flex: 1 }}
                  >
                    {loading ? 'Gönderiliyor...' : 'Raporu gönder'}
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={loading}
                    className="btn-secondary"
                  >
                    Vazgeç
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
