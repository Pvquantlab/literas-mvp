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
        background: `var(--paper-soft) url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8'><path d='M1 1l5 5 5-5' stroke='%23212121' stroke-width='2' fill='none' stroke-linecap='round'/></svg>") no-repeat right 20px center`,
        border: 'none',
        borderRadius: '999px',
        padding: '0 48px 0 24px',
        height: '58px',
        fontFamily: 'inherit',
        fontSize: '16px',
        fontWeight: 700,
        color: 'var(--night)',
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