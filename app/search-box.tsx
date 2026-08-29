'use client'
import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export default function SearchBox({ initialQuery }: { initialQuery: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(initialQuery)
  const ilkRender = useRef(true)

  useEffect(() => {
    // İlk mount'ta gezinme yapma: değer zaten URL'den geldi. Eskiden her sayfa
    // açılışında gereksiz bir navigasyon tetikleniyordu.
    if (ilkRender.current) {
      ilkRender.current = false
      return
    }

    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      const trimmed = value.trim()
      if (trimmed) {
        params.set('q', trimmed)
      } else {
        params.delete('q')
      }
      // Hedef sabit '/' değil, bulunulan sayfa: bileşen /kesfet'te de
      // kullanılabilsin, kullanıcı ana sayfaya fırlatılmasın.
      const qs = params.toString()
      router.push(qs ? `${pathname}?${qs}` : pathname)
    }, 300)

    return () => clearTimeout(t)
    // searchParams bilinçli olarak bağımlılıkta değil: URL her değiştiğinde
    // yeniden tetiklenirse döngü olur. Sadece kullanıcının yazması tetikler.

  }, [value])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      background: 'var(--paper-cream)',
      // Hap köşe (999px) kaldırıldı: sitenin baskın köşesi 4px ve bu iki
      // denetim ızgaranın hemen üstünde duruyor; yan yana durdukları
      // kartlarla aynı dili konuşmaları gerekiyor.
      borderRadius: 'var(--r-md)',
      padding: '0 16px',
      height: '46px',
      flex: '1 1 260px',
      minWidth: 0,
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