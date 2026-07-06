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
    <select
      id="city"
      value={activeCity}
      onChange={handleChange}
      style={{
        appearance: 'none',
        WebkitAppearance: 'none',
        background: `var(--paper-cream) url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24'><path d='m6 9 6 6 6-6' stroke='%231E3A2B' stroke-width='2.2' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>") no-repeat right 18px center`,
        border: '1.5px solid var(--border-mid)',
        borderRadius: '999px',
        padding: '0 44px 0 20px',
        height: '50px',
        fontFamily: 'inherit',
        fontSize: '15px',
        fontWeight: 600,
        color: 'var(--ink)',
        cursor: 'pointer',
        width: '100%',
      }}
    >
      <option value="">Tüm şehirler</option>
      {cities.map((c) => (
        <option key={c} value={c}>{c}</option>
      ))}
    </select>
  )
}