'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { STEPS } from './wizard-context'
import type { ReactNode } from 'react'

export default function WizardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const activeIndex = STEPS.findIndex((s) => pathname?.startsWith(s.path))
  const activeStep = activeIndex >= 0 ? STEPS[activeIndex] : STEPS[0]

  return (
    <main
      style={{
        maxWidth: '1080px',
        margin: '0 auto',
        padding: '32px 24px 80px',
      }}
    >
      {/* Üst bar: geri linki + başlık */}
      <div style={{ marginBottom: '24px' }}>
        <Link
          href="/"
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '12.5px',
            color: 'var(--muted)',
            textDecoration: 'none',
            display: 'inline-block',
            marginBottom: '16px',
          }}
        >
          ← ana sayfaya dön
        </Link>
        <h1
          className="serif"
          style={{
            fontSize: 'clamp(24px, 3vw, 32px)',
            color: 'var(--ink)',
            margin: 0,
            fontWeight: 500,
          }}
        >
          Bir <span className="highlight-yellow">topluluk</span> kur
        </h1>
        <p
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '12.5px',
            color: 'var(--muted)',
            marginTop: '8px',
          }}
        >
          adım {Math.max(activeIndex, 0) + 1} / {STEPS.length} · {activeStep.label.toLowerCase()}
        </p>
      </div>

      {/* Progress bar */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          marginBottom: '32px',
        }}
      >
        {STEPS.map((step, i) => {
          const isDone = i < activeIndex
          const isActive = i === activeIndex
          return (
            <div
              key={step.key}
              style={{
                flex: 1,
                height: '4px',
                borderRadius: '999px',
                background: isActive || isDone
                  ? 'var(--ink)'
                  : 'rgba(30, 58, 43, 0.15)',
                transition: 'background 0.2s',
              }}
              aria-label={`${step.label} adımı ${isActive ? '(aktif)' : isDone ? '(tamamlandı)' : ''}`}
            />
          )
        })}
      </div>

      {/* İki sütun: form solda, ipucu sağda */}
      <div className="wizard-grid">
        <div className="wizard-form">{children}</div>
        <aside className="wizard-hint-slot" id="wizard-hint-slot">
          {/* Her adım kendi ipucu kartını buraya portal'layacak (veya inline) */}
        </aside>
      </div>

      <style>{`
        .wizard-grid {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 32px;
          align-items: start;
        }
        @media (max-width: 820px) {
          .wizard-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          .wizard-hint-slot {
            order: 2;
          }
          .wizard-form {
            order: 1;
          }
        }
      `}</style>
    </main>
  )
}
