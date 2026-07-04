'use client'
import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

type Action = 'toggle-admin' | 'approve' | 'reject'

export default function MemberActions({
  memberId,
  action,
  currentRole,
}: {
  memberId: string
  action: Action
  currentRole?: 'member' | 'admin'
}) {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)

    const res = await fetch(
      `/api/community/${params.id}/member/${memberId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, currentRole }),
      }
    )

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      console.error('[member-actions] hata:', data.error)
      setLoading(false)
      return
    }

    router.refresh()
    setLoading(false)
  }

  const label =
    action === 'toggle-admin'
      ? currentRole === 'admin'
        ? 'yöneticilikten al'
        : 'yönetici yap'
      : action === 'approve'
      ? 'onayla'
      : 'reddet'

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        marginLeft: '0.75rem',
        fontFamily: 'Newsreader, serif',
        fontStyle: 'italic',
        fontSize: '0.85rem',
        color: action === 'reject' ? 'var(--seal)' : 'var(--ink)',
        opacity: loading ? 0.4 : 0.65,
        cursor: loading ? 'wait' : 'pointer',
        textDecoration: 'underline',
        textDecorationStyle: 'dotted',
      }}
    >
      {loading ? '...' : label}
    </button>
  )
}
