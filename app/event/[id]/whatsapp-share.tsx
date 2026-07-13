'use client'

import { useState } from 'react'

type Props = {
  title: string
  eventDateStr: string
  location: string
}

export default function WhatsappShare(props: Props) {
  const [copied, setCopied] = useState(false)

  const shareText =
    props.title +
    '\n\ntarih: ' +
    props.eventDateStr +
    '\nyer: ' +
    props.location

  function handleWhatsapp() {
    const fullText =
      shareText + '\n\n' + window.location.href
    const url =
      'https://wa.me/?text=' + encodeURIComponent(fullText)
    window.open(url, '_blank')
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(function () {
        setCopied(false)
      }, 2000)
    } catch (err) {
      console.error('kopyalanamadi', err)
    }
  }

  return (
    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
      <button
        type="button"
        onClick={handleWhatsapp}
        style={{
          background: '#25D366',
          color: '#ffffff',
          padding: '10px 18px',
          borderRadius: '999px',
          fontSize: '14px',
          fontWeight: 600,
          border: '1.5px solid #1DA851',
          cursor: 'pointer',
          fontFamily: "'IBM Plex Mono', monospace",
        }}
      >
        WhatsApp&apos;ta paylas
      </button>

      <button
        type="button"
        onClick={handleCopy}
        style={{
          background: 'transparent',
          color: 'var(--ink)',
          padding: '10px 18px',
          borderRadius: '999px',
          fontSize: '14px',
          fontWeight: 600,
          border: '1.5px solid var(--ink)',
          cursor: 'pointer',
          fontFamily: "'IBM Plex Mono', monospace",
        }}
      >
        {copied ? 'kopyalandi' : 'linki kopyala'}
      </button>
    </div>
  )
}