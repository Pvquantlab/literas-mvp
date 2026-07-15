'use client'

import { useState } from 'react'

type Props = {
  eventId: string
  title: string
  description: string
  location: string
  eventDateIso: string
}

function toGoogleDate(iso: string): string {
  // Google Calendar formati: 20260714T193000Z
  return iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

export default function CalendarButton(props: Props) {
  const [open, setOpen] = useState(false)

  const start = new Date(props.eventDateIso)
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)

  const startStr = toGoogleDate(start.toISOString())
  const endStr = toGoogleDate(end.toISOString())

  const googleUrl =
    'https://www.google.com/calendar/render?action=TEMPLATE' +
    '&text=' + encodeURIComponent(props.title) +
    '&dates=' + startStr + '/' + endStr +
    '&details=' + encodeURIComponent(props.description || '') +
    '&location=' + encodeURIComponent(props.location) +
    '&sf=true&output=xml'

  const icsUrl = '/api/event/' + props.eventId + '/ics'

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={function () {
          setOpen(!open)
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'transparent',
          color: 'var(--ink)',
          padding: '10px 18px',
          borderRadius: '999px',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: "'IBM Plex Mono', monospace",
          border: '1.5px solid var(--ink)',
        }}
      >
        Takvime ekle
      </button>

      {open && (
        <>
          <div
            onClick={function () {
              setOpen(false)
            }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              background: 'var(--paper-cream)',
              border: '1.5px solid var(--border)',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              padding: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              zIndex: 101,
              minWidth: '180px',
            }}
          >
            
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={function () {
                setOpen(false)
              }}
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                textDecoration: 'none',
                color: 'var(--ink)',
                fontSize: '13.5px',
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              Google Takvim
            </a>
            
              href={icsUrl}
              onClick={function () {
                setOpen(false)
              }}
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                textDecoration: 'none',
                color: 'var(--ink)',
                fontSize: '13.5px',
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              Apple / Outlook (.ics)
            </a>
          </div>
        </>
      )}
    </div>
  )
}
