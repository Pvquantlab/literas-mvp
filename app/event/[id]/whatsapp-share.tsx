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
      {/* Marka yeşili (#25D366) kaldırıldı: sayfadaki tek palet dışı renkti ve
          sitedeki en gürültülü öğe hâline gelmişti. Tanınırlık artık renkten
          değil işaretten geliyor — DNA'nın kuralı da bu: tek vurgu rengi. */}
      <button type="button" onClick={handleWhatsapp} className="btn-secondary btn-sm">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24a8.2 8.2 0 0 1 5.83 2.42 8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.13-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.44.13-.14.17-.24.25-.41.08-.16.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.84-.2-.49-.4-.42-.55-.43l-.47-.01c-.16 0-.43.06-.65.31-.23.24-.86.84-.86 2.05s.88 2.38 1 2.54c.13.16 1.74 2.65 4.2 3.72.59.25 1.05.4 1.4.52.59.19 1.13.16 1.55.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.11-.23-.17-.48-.29Z"/>
        </svg>
        WhatsApp&apos;ta paylaş
      </button>

      <button type="button" onClick={handleCopy} className="btn-secondary btn-sm">
        {copied ? 'Kopyalandı' : 'Linki kopyala'}
      </button>
    </div>
  )
}