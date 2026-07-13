'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('E-posta veya parola hatalı.')
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  async function handleGoogleLogin() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      setError('Google ile giriş başarısız. Tekrar dene.')
      setLoading(false)
    }
  }

  return (
    <main style={{ maxWidth: '440px', margin: '0 auto', padding: '56px 24px 80px' }}>
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <h1 className="serif" style={{
          fontSize: 'clamp(30px, 4vw, 42px)',
          color: 'var(--ink)',
          margin: '0 0 10px',
        }}>
          Tekrar hoş geldin
        </h1>
        <p style={{
          fontFamily: "'IBM Plex Mono', monospace",
          color: 'var(--muted)',
          fontSize: '13.5px',
        }}>
          devam etmek için giriş yap
        </p>
      </div>

      <div className="auth-card">
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="btn-google"
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Google ile giriş yap
        </button>

        <div className="divider">veya</div>

        <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
          <div>
            <label style={labelStyle}>Parola</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          <div style={{ textAlign: 'right', marginTop: '-6px' }}>
            <Link href="/sifremi-unuttum" style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '12.5px',
              color: 'var(--muted)',
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
            }}>
              parolamı unuttum
            </Link>
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
            {loading ? 'Giriş yapılıyor...' : 'Giriş yap'}
          </button>
        </form>
      </div>

      <p style={{
        textAlign: 'center',
        marginTop: '24px',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '13px',
        color: 'var(--muted)',
      }}>
        hesabın yok mu?{' '}
        <Link href="/signup" style={{
          color: 'var(--ink)',
          fontWeight: 700,
          textDecoration: 'underline',
        }}>
          katıl
        </Link>
      </p>
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
