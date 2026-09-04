'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function SifremiUnuttumPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/sifre-sifirla`,
    })

    if (error) {
      setError('Bir şeyler ters gitti. Lütfen tekrar dene.')
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

  return (
    <main className="sayfa-panel" style={{ maxWidth: '440px', margin: '8px auto 0', padding: '56px 24px 80px' }}>
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <h1 className="serif" style={{
          fontSize: 'clamp(28px, 4vw, 38px)',
          color: 'var(--ink)',
          margin: '0 0 10px',
        }}>
          Parolanı mı unuttun?
        </h1>
        <p style={{
          fontFamily: "'IBM Plex Mono', monospace",
          color: 'var(--muted)',
          fontSize: '13.5px',
        }}>
          e-postanı gir, sıfırlama linki gönderelim
        </p>
      </div>

      <div className="auth-card">
        {sent ? (
          <div style={{
            textAlign: 'center',
            padding: '20px 0',
          }}>
            <div style={{
              marginBottom: '12px',
              display: 'flex',
              justifyContent: 'center',
            }}>
              <svg width="44" height="44" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="22" fill="var(--lime)" />
                <path d="M13 22.5 L19.5 29 L31 17" fill="none" stroke="var(--ink)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="serif" style={{
              fontSize: '22px',
              color: 'var(--ink)',
              margin: '0 0 10px',
            }}>
              E-posta yolda
            </h2>
            <p style={{
              color: 'var(--muted)',
              fontSize: '14.5px',
              lineHeight: 1.55,
              marginBottom: '20px',
            }}>
              <strong style={{ color: 'var(--ink)' }}>{email}</strong> adresine
              parola sıfırlama linki gönderdik. Gelen kutunu (ve spam klasörünü) kontrol et.
            </p>
            <Link href="/login" style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '13px',
              color: 'var(--ink)',
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
            }}>
              ← girişe dön
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={labelStyle}>E-posta</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="adin@ornek.com"
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(176, 67, 48, .1)',
                border: '1.5px solid rgba(176, 67, 48, .3)',
                borderRadius: '12px',
                padding: '12px 16px',
                color: 'var(--coral-deep)',
                fontSize: '14px',
                fontWeight: 600,
                textAlign: 'center',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', marginTop: '8px', textAlign: 'center' }}
            >
              {loading ? 'Gönderiliyor...' : 'Sıfırlama linki gönder'}
            </button>
          </form>
        )}
      </div>

      {!sent && (
        <p style={{
          textAlign: 'center',
          marginTop: '24px',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '13px',
          color: 'var(--muted)',
        }}>
          hatırladın mı?{' '}
          <Link href="/login" style={{
            color: 'var(--ink)',
            fontWeight: 700,
            textDecoration: 'underline',
          }}>
            giriş yap
          </Link>
        </p>
      )}
    </main>
  )
}

const labelStyle = {
  display: 'block',
  marginBottom: '6px',
  fontSize: '13px',
  fontWeight: 600,
  color: 'var(--ink)',
  fontFamily: "'IBM Plex Mono', monospace",
}
