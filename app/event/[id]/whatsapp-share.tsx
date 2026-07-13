'use client'

import { useState } from 'react'

export default function WhatsappShare({
  title,
  eventDateStr,
  location,
}: {
  title: string
  eventDateStr: string
  location: string
}) {
  const [copied, setCopied] = useState(false)

  const url = typeof window !== 'undefined' ? window.location.href : ''
  const shareText = `${title}\n📅 ${eventDateStr}\n📍 ${location}\n\n${url}`
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Link kopyalanamadi:', err)
    }
  }

  return (
    <div style={{
      display: 'flex',
      gap: '10px',
      flexWrap: 'wrap',
    }}>
      
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: '#25D366',
          color: '#fff',
          padding: '10px 18px',
          borderRadius: '999px',
          fontSize: '14px',
          fontWeight: 600,
          textDecoration: 'none',
          fontFamily: "'IBM Plex Mono', monospace",
          border: '1.5px solid #1DA851',
        }}
      >
        <span>💬</span>
        WhatsApp'ta paylaş
      </a>

      <button
        onClick={handleCopyLink}
        type="button"
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
        {copied ? '✓ Kopyalandı' : '🔗 Linki kopyala'}
      </button>
    </div>
  )
}
