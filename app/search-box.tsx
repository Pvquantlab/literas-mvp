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
      gap: '10px',
      background: 'var(--paper-cream)',
      border: '1.5px solid var(--border-mid)',
      borderRadius: '999px',
      padding: '0 20px',
      height: '50px',
      transition: 'all 0.18s ease',
    }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="7" stroke="var(--ink)" strokeWidth="2" />
        <path d="m20 20-3.5-3.5" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
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
          fontSize: '15px',
          fontWeight: 500,
          color: 'var(--ink)',
          width: '100%',
          height: '100%',
          padding: 0,
        }}
      />
    </div>
  )
}