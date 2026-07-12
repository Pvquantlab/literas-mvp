'use client'

import { useState, useTransition } from 'react'
import { approveCommunity, rejectCommunity } from '../actions'

export default function ReviewButtons({ communityId, communityName }: { communityId: string; communityName: string }) {
  const [isPending, startTransition] = useTransition()
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectNote, setRejectNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleApprove() {
    if (!confirm(`"${communityName}" onaylansın mı?`)) return
    setError(null)
    startTransition(async () => {
      try {
        await approveCommunity(communityId)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Hata')
      }
    })
  }

  function handleReject() {
    setError(null)
    startTransition(async () => {
      try {
        await rejectCommunity(communityId, rejectNote)
        setShowRejectForm(false)
        setRejectNote('')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Hata')
      }
    })
  }

  return (
    <>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          type="button"
          onClick={handleApprove}
          disabled={isPending}
          style={{
            padding: '8px 16px',
            borderRadius: '999px',
            background: 'var(--lime, #D6FF3F)',
            color: 'var(--ink)',
            border: '1.5px solid var(--ink)',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          {isPending ? '…' : '✓ Onayla'}
        </button>
        <button
          type="button"
          onClick={() => setShowRejectForm((s) => !s)}
          disabled={isPending}
          style={{
            padding: '8px 14px',
            borderRadius: '999px',
            background: 'transparent',
            color: 'var(--coral-deep, #b04330)',
            border: '1.5px solid rgba(176, 67, 48, 0.3)',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          Reddet
        </button>
      </div>

      {showRejectForm && (
        <div style={{
          marginTop: '10px',
          width: '100%',
          padding: '12px',
          borderRadius: '10px',
          background: 'rgba(176, 67, 48, 0.05)',
          border: '1.5px solid rgba(176, 67, 48, 0.2)',
        }}>
          <textarea
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="Ret sebebi (opsiyonel — kurucuya iletilir)"
            rows={2}
            style={{ width: '100%', fontSize: '13px' }}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={handleReject}
              disabled={isPending}
              style={{
                padding: '6px 14px',
                borderRadius: '999px',
                background: 'var(--coral-deep, #b04330)',
                color: 'white',
                border: 'none',
                fontSize: '12.5px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {isPending ? '…' : 'Reddi onayla'}
            </button>
            <button
              type="button"
              onClick={() => setShowRejectForm(false)}
              style={{
                padding: '6px 12px',
                background: 'transparent',
                border: 'none',
                fontSize: '12.5px',
                color: 'var(--muted)',
                cursor: 'pointer',
              }}
            >
              iptal
            </button>
          </div>
        </div>
      )}

      {error && (
        <p style={{ color: 'var(--coral-deep, #b04330)', fontSize: '12.5px', marginTop: '8px' }}>
          {error}
        </p>
      )}
    </>
  )
}
