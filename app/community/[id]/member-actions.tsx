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
      ? 'Onayla'
      : 'Reddet'

  const isDestructive = action === 'reject'
  const isNeutral = action === 'toggle-admin'

  const buttonStyle = {
    background: isDestructive ? '#ffffff' : isNeutral ? '#ffffff' : 'var(--ink)',
    color: isDestructive ? 'var(--seal-deep)' : isNeutral ? 'var(--muted)' : '#ffffff',
    border: isDestructive
      ? '1px solid rgba(196, 98, 45, 0.35)'
      : isNeutral
      ? '1px solid var(--border-soft)'
      : 'none',
    borderRadius: '999px',
    padding: '6px 14px',
    fontFamily: 'inherit',
    fontSize: '13px',
    fontWeight: 700,
    cursor: loading ? 'wait' : 'pointer',
    opacity: loading ? 0.5 : 1,
    transition: 'opacity 0.15s ease',
  }

  return (
    <button onClick={handleClick} disabled={loading} style={buttonStyle}>
      {loading ? '...' : label}
    </button>
  )
}