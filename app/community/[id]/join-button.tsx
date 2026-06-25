'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function JoinButton({
  communityId,
  userId,
}: {
  communityId: string
  userId: string
}) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleJoin() {
    setLoading(true)
    setError(null)

    const { error } = await supabase
      .from('community_members')
      .insert({
        community_id: communityId,
        user_id: userId,
        role: 'member',
        status: 'pending',
      })

    if (error) {
      setError('İstek gönderilemedi.')
      console.error(error)
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
