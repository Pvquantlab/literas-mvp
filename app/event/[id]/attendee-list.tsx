'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

type Attendee = {
  id: string
  user: { id: string; name: string | null; avatar_url: string | null } | null
}

export default function AttendeeList({
  eventId,
  initialAttendees,
  maxAttendees,
}: {
  eventId: string
  initialAttendees: Attendee[]
  maxAttendees: number | null
}) {
  const [attendees, setAttendees] = useState<Attendee[]>(initialAttendees)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`rsvps:${eventId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'rsvps', filter: `event_id=eq.${eventId}` },
        async (payload) => {
          const row = payload.new as { id: string; user_id: string | null }
          setAttendees((prev) => {
            if (prev.some((a) => a.id === row.id)) return prev
            return [...prev, { id: row.id, user: null }]
          })
          // Profil bilgisini ayrıca çek (RLS: sadece giriş yapan görebilir; başarısızsa placeholder kalır)
          if (row.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, name, avatar_url')
              .eq('id', row.user_id)
              .maybeSingle()
            if (profile) {
              setAttendees((prev) =>
                prev.map((a) => (a.id === row.id ? { ...a, user: profile } : a))
              )
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'rsvps' },
        (payload) => {
          const oldRow = payload.old as { id: string }
          setAttendees((prev) => prev.filter((a) => a.id !== oldRow.id))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId])

  const count = attendees.length

  return (
    <div style={{ marginTop: '40px' }}>
      <h3 style={{
        fontFamily: "'Schibsted Grotesk', system-ui, sans-serif",
        fontSize: '18px',
        fontWeight: 700,
        color: 'var(--ink)',
        marginBottom: '16px',
      }}>
        Katılımcılar
        <span style={{
          marginLeft: '10px',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--muted)',
        }}>
          {count}{maxAttendees ? ` / ${maxAttendees}` : ''}
        </span>
      </h3>
      {count > 0 ? (
        <ul style={{
          listStyle: 'none',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          padding: 0,
          margin: 0,
        }}>
          {attendees.map((r) => (
            <li key={r.id}>
              {r.user?.id ? (
                <Link href={`/profile/${r.user.id}`} style={rsvpChipStyle}>
                  {r.user.name}
                </Link>
              ) : (
                <span style={rsvpChipStyle}>Yeni katılımcı</span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p style={{
          fontSize: '14px',
          color: 'var(--muted)',
          fontStyle: 'italic',
        }}>
          Henüz katılan yok — sen ilk ol.
        </p>
      )}
    </div>
  )
}

const rsvpChipStyle: React.CSSProperties = {
  display: 'inline-block',
  background: 'var(--paper-cream)',
  padding: '6px 14px',
  borderRadius: '999px',
  border: '1.5px solid var(--border-mid)',
  fontSize: '13.5px',
  fontWeight: 700,
  color: 'var(--ink)',
  textDecoration: 'none',
}
