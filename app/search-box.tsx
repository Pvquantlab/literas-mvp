'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function SearchBox({ initialQuery }: { initialQuery: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(initialQuery)

  // Debounce: 300ms boyunca tuşa basılmazsa URL'i güncelle
  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      const trimmed = value.trim()
      if (trimmed) {
        params.set('q', trimmed)
      } else {
        params.delete('q')
      }
      const qs = params.toString()
      const next = qs ? `/?${qs}` : '/'
      router.push(next)
    }, 300)

    return () => clearTimeout(t)
    // searchParams'ı bilerek bağımlılığa koymuyoruz — sadece value değiştiğinde tetiklensin
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <div style={{ marginBottom: '1rem' }}>
      <input
        type="text"
        placeholder="topluluk ara…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        style={{
          fontFamily: 'Newsreader, serif',
          fontStyle: 'italic',
          fontSize: '1rem',
        }}
      />
    </div>
  )
}
