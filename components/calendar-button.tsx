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

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={function () {
          setOpen(!open)
        }}
        className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-line bg-white px-[18px] py-2.5 text-sm font-semibold text-ink transition hover:bg-warm"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" x2="16" y1="2" y2="6" />
          <line x1="8" x2="8" y1="2" y2="6" />
          <line x1="3" x2="21" y1="10" y2="10" />
        </svg>
        Takvime ekle
      </button>

      {open ? (
        <div>
          <div
            onClick={function () {
              setOpen(false)
            }}
            className="fixed inset-0 z-[100]"
          />
          <div className="absolute left-0 top-[calc(100%+6px)] z-[101] flex min-w-[180px] flex-col gap-[2px] rounded-xl border border-line bg-white p-1.5 shadow-[0_4px_20px_rgba(0,0,0,.08)]">
            <button
              type="button"
              onClick={handleGoogle}
              className="w-full cursor-pointer rounded-lg px-3.5 py-2.5 text-left text-[13.5px] font-medium text-ink transition hover:bg-warm"
            >
              Google Takvim
            </button>
            <button
              type="button"
              onClick={handleIcs}
              className="w-full cursor-pointer rounded-lg px-3.5 py-2.5 text-left text-[13.5px] font-medium text-ink transition hover:bg-warm"
            >
              Apple / Outlook (.ics)
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
