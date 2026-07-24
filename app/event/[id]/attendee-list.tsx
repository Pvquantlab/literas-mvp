'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient as createRealtimeClient } from '@supabase/supabase-js'

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
    // Realtime için ayrı, düz supabase-js client (createBrowserClient/ssr realtime'da olay teslim etmiyor).
    // rsvps SELECT herkese açık olduğundan anon rolü yeterli.
    const supabase = createRealtimeClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    )
    const channel = supabase
      .channel(`rsvps-${eventId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'rsvps' },
          async (payload) => {
            if (payload.eventType === 'DELETE') {
              const oldRow = payload.old as { id: string }
              setAttendees((prev) => prev.filter((a) => a.id !== oldRow.id))
              return
            }
            // INSERT (UPDATE de buraya düşer ama rsvps'te önemsiz)
            const row = payload.new as { id: string; event_id: string; user_id: string | null }
            if (String(row.event_id) !== String(eventId)) return
            setAttendees((prev) => {
              if (prev.some((a) => a.id === row.id)) return prev
              return [...prev, { id: row.id, user: null }]
            })
            if (row.user_id) {
              // Herkese açık profil vitrini (anon rol de okuyabilir)
              const { data: profile } = await supabase
                .from('public_profiles')
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
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId])

  const count = attendees.length

  return (
    <div className="mt-10">
      <h3 className="mb-4 text-lg font-bold text-ink">
        Katılımcılar
        <span className="ml-2.5 text-[13px] font-medium text-mute">
          {count}{maxAttendees ? ` / ${maxAttendees}` : ''}
        </span>
      </h3>
      {count > 0 ? (
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {attendees.map((r) => (
            <li key={r.id}>
              {r.user?.id ? (
                <Link
                  href={`/profile/${r.user.id}`}
                  className="inline-block rounded-full border border-line bg-white px-3.5 py-1.5 text-[13.5px] font-bold text-ink transition hover:border-brand hover:text-brand"
                >
                  {r.user.name}
                </Link>
              ) : (
                <span className="inline-block rounded-full border border-line bg-white px-3.5 py-1.5 text-[13.5px] font-bold text-mute">
                  Yeni katılımcı
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm italic text-mute">
          Henüz katılan yok — sen ilk ol.
        </p>
      )}
    </div>
  )
}
