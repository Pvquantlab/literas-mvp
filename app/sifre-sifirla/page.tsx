'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function SifreSifirlaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sessionReady, setSessionReady] = useState(false)

  // Supabase, email linkindeki token'ı otomatik oturuma çevirir
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true)
      } else {
        setError('Bu link geçersiz veya süresi dolmuş. Lütfen tekrar sıfırlama iste.')
      }
    })
  }, [supabase.auth])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Parola en az 8 karakter olmalı.')
      return
    }
    if (password !== passwordConfirm) {
      setError('Parolalar eşleşmiyor.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError('Parola güncellenemedi. Lütfen tekrar dene.')
      setLoading(false)
    } else {
      // Başarılı — kullanıcıyı ana sayfaya yönlendir
      router.push('/')
      router.refresh()
    }
  }

  return (
    <main style={{ maxWidth: '440px', margin: '0 auto', padding: '56px 24px 80px' }}>
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <h1 className="serif" style={{
          fontSize: 'clamp(28px, 4vw, 38px)',
          color: 'var(--ink)',
          margin: '0 0 10px',
        }}>
          Yeni bir parola belirle
        </h1>
        <p style={{
          fontFamily: "'IBM Plex Mono', monospace",
          color: 'var(--muted)',
          fontSize: '13.5px',
        }}>
          en az 8 karakter olsun
        </p>
      </div>

      <div className="auth-card">
        {!sessionReady && !error ? (
          <p style={{
            textAlign: 'center',
            color: 'var(--muted)',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '14px',
            padding: '20px 0',
          }}>
            yükleniyor...
          </p>
        ) : !sessionReady && error ? (
          <div style={{
            textAlign: 'center',
            padding: '10px 0',
          }}>
            <p style={{
              color: 'var(--coral-deep)',
              fontSize: '14.5px',
              lineHeight: 1.55,
              marginBottom: '20px',
              fontWeight: 600,
            }}>
              {error}
            </p>
            <Link href="/sifremi-unuttum" className="btn-primary" style={{ display: 'inline-block' }}>
              Yeni link iste
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Yeni parola</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="••••••••"
              />
            </div>
            <div>
              <label style={labelStyle}>Yeni parola (tekrar)</label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
                minLength={8}
                placeholder="••••••••"
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
              {loading ? 'Güncelleniyor...' : 'Parolayı güncelle'}
            </button>
          </form>
        )}
      </div>
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
