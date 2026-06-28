'use client'
import { useRouter, useSearchParams } from 'next/navigation'

export default function CityFilter({ cities, activeCity }: { cities: string[]; activeCity: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString())
    if (e.target.value) {
      params.set('city', e.target.value)
    } else {
      params.delete('city')
    }
    const qs = params.toString()
    router.push(qs ? `/?${qs}` : '/')
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      marginBottom: '1rem',
      fontFamily: 'Newsreader, serif',
      fontStyle: 'italic',
    }}>
      <label htmlFor="city" style={{ color: 'var(--ink)', opacity: 0.7 }}>
        şehir:
      </label>
      <select
        id="city"
        value={activeCity}
        onChange={handleChange}
        style={{ width: 'auto', minWidth: '180px' }}
      >
        <option value="">tümü</option>
        {cities.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    </div>
  )
}
