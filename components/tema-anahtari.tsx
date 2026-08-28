'use client'

import { useEffect, useState } from 'react'

/**
 * Üç tema varyantı arasında canlı geçiş — KARAR ARACI, ürün özelliği değil.
 *
 * Yalnızca geliştirmede render edilir (app/page.tsx içinde
 * process.env.NODE_ENV kapısı var). Varyant seçildikten sonra kazanan
 * :root'a taşınacak ve bu dosya silinecek.
 *
 * Tema <html data-tema="..."> üzerinden çalışıyor; globals.css'teki
 * [data-tema="..."] blokları token'ları eziyor.
 */

const TEMALAR = [
  { id: 'kagit', ad: 'A · Kağıt', not: 'koyu zemin · düz nesne · kağıt kart' },
  { id: 'murekkep', ad: 'B · Mürekkep', not: 'açık zemin · parlak nesne · koyu kart' },
  { id: 'sayfa', ad: 'C · Sayfa', not: 'siyah metin · mavi = tıklanabilir' },
] as const

const ANAHTAR = 'literas-tema'

export default function TemaAnahtari() {
  const [aktif, setAktif] = useState<string>('murekkep')

  // Sayfa açılışında son seçimi geri yükle.
  useEffect(() => {
    let kayitli: string | null = null
    try {
      kayitli = localStorage.getItem(ANAHTAR)
    } catch {
      // Gizli sekmede localStorage erişimi hata atabiliyor — tema yine çalışsın.
    }
    const baslangic = kayitli && TEMALAR.some((t) => t.id === kayitli) ? kayitli : 'murekkep'
    setAktif(baslangic)
    document.documentElement.setAttribute('data-tema', baslangic)
  }, [])

  function sec(id: string) {
    setAktif(id)
    document.documentElement.setAttribute('data-tema', id)
    try {
      localStorage.setItem(ANAHTAR, id)
    } catch {
      // Yazamazsak da tema bu oturumda çalışmaya devam eder.
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: 16,
        bottom: 16,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: 10,
        borderRadius: 14,
        background: 'var(--paper-cream)',
        border: '1.5px solid var(--border-mid)',
        boxShadow: '0 10px 30px -12px rgba(22, 22, 15, .35)',
      }}
    >
      <div
        style={{
          font: "600 10px 'IBM Plex Mono', monospace",
          letterSpacing: '.09em',
          textTransform: 'lowercase',
          color: 'var(--muted)',
          paddingBottom: 2,
        }}
      >
        tema denemesi
      </div>

      {TEMALAR.map((t) => {
        const secili = aktif === t.id
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => sec(t.id)}
            aria-pressed={secili}
            style={{
              textAlign: 'left',
              padding: '7px 11px',
              borderRadius: 9,
              cursor: 'pointer',
              border: `1.5px solid ${secili ? 'var(--ink)' : 'var(--border)'}`,
              background: secili ? 'var(--ink)' : 'transparent',
              color: secili ? '#fff' : 'var(--night)',
              transition: 'background .18s var(--ease), border-color .18s var(--ease)',
            }}
          >
            <div style={{ fontSize: 12.5, fontWeight: 700 }}>{t.ad}</div>
            <div
              style={{
                fontSize: 10.5,
                opacity: secili ? 0.85 : 0.6,
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              {t.not}
            </div>
          </button>
        )
      })}
    </div>
  )
}
