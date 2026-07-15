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
  return iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

export default function CalendarButton(props: Props) {
  const [open, setOpen] = useState(false)

  function buildGoogleUrl(): string {
    const start = new Date(props.eventDateIso)
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
    const startStr = toGoogleDate(start.toISOString())
    const endStr = toGoogleDate(end.toISOString())

    return (
      'https://www.google.com/calendar/render?action=TEMPLATE' +
      '&text=' + encodeURIComponent(props.title) +
      '&dates=' + startStr + '/' + endStr +
      '&details=' + encodeURIComponent(props.description || '') +
      '&location=' + encodeURIComponent(props.location) +
      '&sf=true&output=xml'
    )
  }

  function handleGoogle() {
    window.open(buildGoogleUrl(), '_blank', 'noopener,noreferrer')
    setOpen(false)
  }

  function handleIcs() {
    window.location.href = '/api/event/' + props.eventId + '/ics'
    setOpen(false)
  }

  const dropdownItemStyle = {
    padding: '10px 14px',
    borderRadius: '8px',
    background: 'transparent',
    border: 'none',
    color: 'var(--ink)',
    fontSize: '13.5px',
    fontFamily: "'IBM Plex Mono', monospace",
    cursor: 'pointer',
    textAlign: 'left' as const,
    width: '100%',
  }

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

      {open ? (
        <div>
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
            <button type="button" onClick={handleGoogle} style={dropdownItemStyle}>
              Google Takvim
            </button>
            <button type="button" onClick={handleIcs} style={dropdownItemStyle}>
              Apple / Outlook (.ics)
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
