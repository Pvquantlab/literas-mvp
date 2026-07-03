'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function JoinButton({
  communityId,
}: {
  communityId: string
  userId?: string  // artık kullanılmıyor ama eski çağrıları kırmayalım
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
    <div style={{ marginBottom: '1.5rem' }}>
      <button
        onClick={handleJoin}
        disabled={loading}
        className="btn-primary"
      >
        {loading ? 'Gönderiliyor…' : 'Topluluğa katıl'}
      </button>
      {error && (
        <p style={{
          color: 'var(--seal)',
          fontSize: '0.9rem',
          marginTop: '0.5rem',
        }}>
          {error}
        </p>
      )}
    </div>
  )
}
