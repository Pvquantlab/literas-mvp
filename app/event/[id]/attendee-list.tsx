'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient as createRealtimeClient } from '@supabase/supabase-js'

type Attendee = {
  id: string
  user: { id: string; name: string | null; avatar_url: string | null } | null
}

/**
 * Katılımcı bölümü.
 *
 * Gizlilik modeli: SAYI herkese görünür, İSİMLER sadece giriş yapmışlara.
 * `rsvps` tablosu anon rolüne kapatıldı (kimin nereye kayıtlı olduğu
 * dışarıdan dökülebiliyordu).
 *
 * Realtime notu: eskiden `rsvps` dinleniyordu ve "anon rolü yeterli"
 * varsayımına dayanıyordu — o varsayım artık geçersiz. Bunun yerine
 * `events` tablosu dinleniyor: rsvp değişince trigger
 * events.attendee_count'u güncelliyor, biz de o güncellemeyi yakalıyoruz.
 * Sayı canlı kalıyor, isimler hiç yayınlanmıyor.
 */
export default function AttendeeList({
  eventId,
  initialAttendees,
  initialCount,
  canSeeNames,
  maxAttendees,
}: {
  eventId: string
  initialAttendees: Attendee[]
  /** events.attendee_count — anon kullanıcıda tek doğru kaynak. */
  initialCount: number
  /** Kullanıcı giriş yapmış mı. */
  canSeeNames: boolean
  maxAttendees: number | null
}) {
  const [attendees, setAttendees] = useState<Attendee[]>(initialAttendees)
  const [count, setCount] = useState<number>(initialCount)

  useEffect(() => {
    const supabase = createRealtimeClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    )

    const channel = supabase
      .channel(`event-count-${eventId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${eventId}` },
        (payload) => {
          const row = payload.new as { attendee_count?: number | null }
          if (typeof row.attendee_count === 'number') setCount(row.attendee_count)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId])

  const showNames = canSeeNames && attendees.length > 0

  return (
    <div style={{ marginTop: '40px' }}>
      <h3
        style={{
          fontFamily: "'Schibsted Grotesk', system-ui, sans-serif",
          fontSize: '18px',
          fontWeight: 700,
          color: 'var(--ink)',
          marginBottom: '16px',
        }}
      >
        Katılımcılar
        <span
          style={{
            marginLeft: '10px',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--muted)',
          }}
        >
          {count}
          {maxAttendees ? ` / ${maxAttendees}` : ''}
        </span>
      </h3>

      {count === 0 ? (
        <p style={{ fontSize: '14px', color: 'var(--muted)', fontStyle: 'italic' }}>
          Henüz katılan yok — sen ilk ol.
        </p>
      ) : showNames ? (
        <ul
          style={{
            listStyle: 'none',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            padding: 0,
            margin: 0,
          }}
        >
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
        <p style={{ fontSize: '14px', color: 'var(--muted)' }}>
          {count} kişi geliyor.{' '}
          <Link href="/login" style={{ color: 'var(--ink)', textDecoration: 'underline' }}>
            Kimler olduğunu görmek için giriş yap
          </Link>
          .
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
