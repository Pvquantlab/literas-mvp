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
      console.error('kopyalanamadı', err)
    }
  }

  return (
    <div className="flex flex-wrap gap-2.5">
      <button
        type="button"
        onClick={handleWhatsapp}
        className="rounded-full border-[1.5px] border-[#1DA851] bg-[#25D366] px-[18px] py-2.5 text-sm font-semibold text-white transition hover:bg-[#1FB959]"
      >
        WhatsApp&apos;ta paylaş
      </button>

      <button
        type="button"
        onClick={handleCopy}
        className="rounded-full border-[1.5px] border-line bg-white px-[18px] py-2.5 text-sm font-semibold text-ink transition hover:bg-warm"
      >
        {copied ? 'Kopyalandı ✓' : 'Linki kopyala'}
      </button>
    </div>
  )
}
