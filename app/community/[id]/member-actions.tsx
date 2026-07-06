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

  const buttonStyle: React.CSSProperties = {
    background: isDestructive
      ? 'var(--paper-cream)'
      : isNeutral
      ? 'var(--paper-cream)'
      : 'var(--lime)',
    color: isDestructive
      ? 'var(--coral-deep)'
      : isNeutral
      ? 'var(--muted)'
      : 'var(--ink)',
    border: isDestructive
      ? '1.5px solid rgba(176, 67, 48, .35)'
      : isNeutral
      ? '1.5px solid var(--border-mid)'
      : '2px solid var(--ink)',
    borderRadius: '999px',
    padding: '6px 14px',
    fontFamily: 'inherit',
    fontSize: '13px',
    fontWeight: 700,
    cursor: loading ? 'wait' : 'pointer',
    opacity: loading ? 0.5 : 1,
    boxShadow: !isDestructive && !isNeutral ? '2px 3px 0 var(--ink)' : 'none',
    transition: 'transform 0.15s ease, opacity 0.15s ease',
  }

  return (
    <button onClick={handleClick} disabled={loading} style={buttonStyle}>
      {loading ? '...' : label}
    </button>
  )
}