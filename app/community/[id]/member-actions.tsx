'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

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
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)

    if (action === 'toggle-admin') {
      const newRole = currentRole === 'admin' ? 'member' : 'admin'
      const { error } = await supabase
        .from('community_members')
        .update({ role: newRole })
        .eq('id', memberId)
      if (error) {
        console.error(error)
        setLoading(false)
        return
      }
    }

    if (action === 'approve') {
      const { error } = await supabase
        .from('community_members')
        .update({ status: 'approved' })
        .eq('id', memberId)
      if (error) {
        console.error(error)
        setLoading(false)
        return
      }
    }

    if (action === 'reject') {
      const { error } = await supabase
        .from('community_members')
        .delete()
        .eq('id', memberId)
      if (error) {
        console.error(error)
        setLoading(false)
        return
      }
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
