'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function JoinButton({
  communityId,
}: {
  communityId: string
  userId?: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleJoin() {
    setLoading(true)
    setError(null)

    const res = await fetch(`/api/community/${communityId}/join`, {
      method: 'POST',
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'İstek gönderilemedi.')
      setLoading(false)
      return
    }

    router.refresh()
    setLoading(false)
  }

  return (
    <div>
      <button
        onClick={handleJoin}
        disabled={loading}
        className="btn-primary"
        style={{ fontSize: '16px', padding: '13px 28px' }}
      >
        {loading ? 'Gönderiliyor…' : 'Topluluğa katıl'}
      </button>
      {error && (
        <div style={{
          marginTop: '12px',
          background: 'rgba(176, 67, 48, .1)',
          border: '1.5px solid rgba(176, 67, 48, .3)',
          borderRadius: '12px',
          padding: '10px 14px',
          color: 'var(--coral-deep)',
          fontSize: '13.5px',
          fontWeight: 600,
        }}>
          {error}
        </div>
      )}
    </div>
  )
}