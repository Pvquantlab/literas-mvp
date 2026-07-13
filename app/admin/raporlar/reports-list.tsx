'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const REASON_LABELS: Record<string, string> = {
  spam: 'Spam veya reklam',
  rahatsiz_edici: 'Rahatsız edici içerik',
  yanlis_bilgi: 'Yanlış bilgi',
  sahte_hesap: 'Sahte hesap veya etkinlik',
  nefret_soylemi: 'Nefret söylemi veya şiddet',
  diger: 'Diğer',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Bekliyor',
  reviewed: 'İncelendi',
  dismissed: 'Reddedildi',
  actioned: 'İşlem yapıldı',
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#B8541A',
  reviewed: '#1E3A2B',
  dismissed: '#666',
  actioned: '#B84330',
}

function targetLink(type: string, id: string): string {
  if (type === 'event') return '/event/' + id
  if (type === 'community') return '/community/' + id
  if (type === 'user') return '/profile/' + id
  return '#'
}

function targetTypeLabel(type: string): string {
  if (type === 'event') return 'Etkinlik'
  if (type === 'community') return 'Topluluk'
  if (type === 'user') return 'Kullanıcı'
  return type
}

export default function ReportsList({ reports }: { reports: any[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed'>('pending')
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const filtered = reports.filter(function (r) {
    if (filter === 'all') return true
    if (filter === 'pending') return r.status === 'pending'
    if (filter === 'reviewed') return r.status !== 'pending'
    return true
  })

  async function handleAction(reportId: string, newStatus: string) {
    const note = prompt('Admin notu (isteğe bağlı):') || undefined

    setLoadingId(reportId)
    try {
      const res = await fetch('/api/report/' + reportId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, admin_note: note }),
      })
      if (!res.ok) {
        const data = await res.json().catch(function () {
          return {}
        })
        alert(data.error || 'Güncellenemedi')
      } else {
        router.refresh()
      }
    } catch (err) {
      alert('Bağlantı hatası')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {(['pending', 'reviewed', 'all'] as const).map(function (f) {
          return (
            <button
              key={f}
              type="button"
              onClick={function () {
                setFilter(f)
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '999px',
                border: '1.5px solid var(--ink)',
                background: filter === f ? 'var(--ink)' : 'transparent',
                color: filter === f ? 'var(--paper-cream)' : 'var(--ink)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              {f === 'pending' ? 'Bekleyen' : f === 'reviewed' ? 'İncelenen' : 'Hepsi'}
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <div style={{
          padding: '48px 24px',
          textAlign: 'center',
          color: 'var(--muted)',
          fontSize: '15px',
          background: 'var(--paper-cream)',
          borderRadius: '18px',
          border: '1.5px dashed var(--border)',
        }}>
          {filter === 'pending' ? 'Bekleyen rapor yok. Tebrikler.' : 'Rapor bulunamadı.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filtered.map(function (r) {
            const isProcessing = loadingId === r.id
            const isPending = r.status === 'pending'
            return (
              <div
                key={r.id}
                style={{
                  background: 'var(--paper-cream)',
                  border: '1.5px solid var(--border)',
                  borderRadius: '16px',
                  padding: '20px',
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '12px',
                  marginBottom: '12px',
                  flexWrap: 'wrap',
                }}>
                  <div>
                    <div style={{
                      display: 'inline-block',
                      padding: '2px 10px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#fff',
                      background: STATUS_COLORS[r.status] || '#666',
                      marginBottom: '8px',
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}>
                      {STATUS_LABELS[r.status] || r.status}
                    </div>
                    <h3 style={{
                      fontSize: '16px',
                      color: 'var(--ink)',
                      margin: '0 0 4px',
                      fontWeight: 700,
                    }}>
                      {targetTypeLabel(r.target_type)} · {REASON_LABELS[r.reason] || r.reason}
                    </h3>
                    <p style={{
                      fontSize: '12.5px',
                      color: 'var(--muted)',
                      margin: 0,
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}>
                      {new Date(r.created_at).toLocaleString('tr-TR')} · Rapor eden: {r.reporter?.name || 'anonim'}
                    </p>
                  </div>
                  <Link
                    href={targetLink(r.target_type, r.target_id)}
                    target="_blank"
                    style={{
                      fontSize: '13px',
                      color: 'var(--ink)',
                      textDecoration: 'underline',
                      textUnderlineOffset: '3px',
                      fontFamily: "'IBM Plex Mono', monospace",
                      whiteSpace: 'nowrap',
                    }}
                  >
                    İçeriği gör →
                  </Link>
                </div>

                {r.description && (
                  <p style={{
                    fontSize: '14px',
                    color: 'var(--ink)',
                    background: 'var(--paper-soft)',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    margin: '0 0 12px',
                    lineHeight: 1.5,
                  }}>
                    {r.description}
                  </p>
                )}

                {r.admin_note && (
                  <p style={{
                    fontSize: '13px',
                    color: 'var(--muted)',
                    fontStyle: 'italic',
                    margin: '0 0 12px',
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}>
                    Admin notu: {r.admin_note}
                  </p>
                )}

                {isPending && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={function () {
                        handleAction(r.id, 'actioned')
                      }}
                      disabled={isProcessing}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid var(--coral-deep)',
                        background: 'var(--coral-deep)',
                        color: '#fff',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: isProcessing ? 'wait' : 'pointer',
                        opacity: isProcessing ? 0.5 : 1,
                      }}
                    >
                      İşlem yapıldı
                    </button>
                    <button
                      type="button"
                      onClick={function () {
                        handleAction(r.id, 'reviewed')
                      }}
                      disabled={isProcessing}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid var(--ink)',
                        background: 'transparent',
                        color: 'var(--ink)',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: isProcessing ? 'wait' : 'pointer',
                        opacity: isProcessing ? 0.5 : 1,
                      }}
                    >
                      İncelendi
                    </button>
                    <button
                      type="button"
                      onClick={function () {
                        handleAction(r.id, 'dismissed')
                      }}
                      disabled={isProcessing}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid var(--muted)',
                        background: 'transparent',
                        color: 'var(--muted)',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: isProcessing ? 'wait' : 'pointer',
                        opacity: isProcessing ? 0.5 : 1,
                      }}
                    >
                      Reddet
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
