'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function SearchBox({ initialQuery }: { initialQuery: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(initialQuery)

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      background: '#ffffff',
      border: '2px solid var(--border)',
      borderRadius: '999px',
      padding: '0 22px',
      height: '58px',
    }}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="9" cy="9" r="6.5" stroke="var(--muted)" strokeWidth="2" />
        <path d="M14 14 L18 18" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        type="text"
        placeholder="Topluluk ara..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        style={{
          border: 'none',
          outline: 'none',
          background: 'transparent',
          fontFamily: 'inherit',
          fontSize: '16px',
          fontWeight: 600,
          color: 'var(--night)',
          width: '100%',
          height: '100%',
          padding: 0,
        }}
      />
    </div>
  )
}