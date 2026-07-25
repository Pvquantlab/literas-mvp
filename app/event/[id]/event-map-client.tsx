'use client'

import dynamic from 'next/dynamic'

const EventMap = dynamic(() => import('./event-map'), {
  ssr: false,
  loading: () => (
    <div style={{ marginTop: '24px' }}>
      <div style={{
        width: '100%',
        height: '320px',
        borderRadius: '22px',
        border: '2px solid var(--ink)',
        background: 'var(--paper-cream)',
        display: 'grid',
        placeItems: 'center',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '13px',
        color: 'var(--muted)',
      }}>
        harita yükleniyor...
      </div>
    </div>
  ),
})

export default function EventMapClient(props: { location: string; city?: string }) {
  return <EventMap {...props} />
}
