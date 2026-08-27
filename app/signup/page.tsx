'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const searchParams = useSearchParams()
  // Giriş sayfasından taşınan ?next= hedefi — kayıt sonrası oraya dön.
  const nextParam = searchParams.get('next')
  const safeNext =
    nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')
      ? nextParam
      : '/'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // Doğrulama maili gönderildiyse formu bırakıp "postanı kontrol et" ekranına geç.
  const [dogrulamaBekliyor, setDogrulamaBekliyor] = useState(false)
  const [tekrarDurumu, setTekrarDurumu] = useState<'bos' | 'gonderiliyor' | 'gonderildi'>('bos')

  const dogrulamaDonusU = () =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`

  async function handleEmailSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password.length < 6) {
      setError('Parola en az 6 karakter olmalı.')
      setLoading(false)
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        // Doğrulama bağlantısı buraya dönsün; yoksa Supabase'in varsayılan
        // Site URL'ine gider ve ?next hedefi kaybolur.
        emailRedirectTo: dogrulamaDonusU(),
      },
    })

    if (error) {
      if (error.message.includes('already')) {
        setError('Bu e-posta zaten kayıtlı. Giriş yapmayı denersin.')
      } else {
        setError('Kayıt başarısız. Tekrar dene.')
      }
      setLoading(false)
      return
    }

    // Supabase, kullanıcı sayımını sızdırmamak için var olan bir e-postada da
    // "başarılı" döner; ayırt etmenin yolu boş identities dizisi.
    if (data.user && data.user.identities?.length === 0) {
      setError('Bu e-posta zaten kayıtlı. Giriş yapmayı denersin.')
      setLoading(false)
      return
    }

    // Doğrulama açıkken session gelmez: kullanıcı HENÜZ giriş yapmadı.
    // Eskiden burada doğrudan yönlendiriliyordu; kullanıcı kendini çıkış
    // yapmış hâlde ana sayfada buluyor ve neden olduğunu anlamıyordu.
    if (!data.session) {
      setDogrulamaBekliyor(true)
      setLoading(false)
      return
    }

    router.push(safeNext)
    router.refresh()
  }

  async function handleTekrarGonder() {
    setTekrarDurumu('gonderiliyor')
    setError('')
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: dogrulamaDonusU() },
    })
    if (error) {
      setError('Mail tekrar gönderilemedi. Birkaç dakika sonra dene.')
      setTekrarDurumu('bos')
    } else {
      setTekrarDurumu('gonderildi')
    }
  }

  async function handleGoogleSignup() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
      },
    })
    if (error) {
      setError('Google ile kayıt başarısız. Tekrar dene.')
      setLoading(false)
    }
  }

  if (dogrulamaBekliyor) {
    return (
      <main style={{ maxWidth: '440px', margin: '0 auto', padding: '56px 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: '10px' }}>
          <h1 className="serif" style={{
            fontSize: 'clamp(28px, 4vw, 38px)',
            color: 'var(--ink)',
            margin: '0 0 10px',
          }}>
            Postanı kontrol et
          </h1>
          <p style={{
            fontFamily: "'IBM Plex Mono', monospace",
            color: 'var(--muted)',
            fontSize: '13.5px',
          }}>
            son bir adım kaldı
          </p>
        </div>

        <div className="auth-card">
          <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--ink)', margin: '0 0 14px' }}>
            <strong>{email}</strong> adresine bir doğrulama bağlantısı gönderdik.
            Bağlantıya tıkladığında hesabın açılır ve giriş yapmış olursun.
          </p>
          <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--muted)', margin: '0 0 20px' }}>
            Mail birkaç dakika içinde gelmezse spam klasörüne bakmayı unutma.
          </p>

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
              marginBottom: '14px',
            }}>
              {error}
            </div>
          )}

          {tekrarDurumu === 'gonderildi' ? (
            <p role="status" style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '13px',
              color: 'var(--ink)',
              textAlign: 'center',
              margin: 0,
            }}>
              yeni bağlantı gönderildi
            </p>
          ) : (
            <button
              type="button"
              onClick={handleTekrarGonder}
              disabled={tekrarDurumu === 'gonderiliyor'}
              className="btn-primary"
              style={{ width: '100%', textAlign: 'center' }}
            >
              {tekrarDurumu === 'gonderiliyor' ? 'Gönderiliyor...' : 'Maili tekrar gönder'}
            </button>
          )}
        </div>

        <p style={{
          textAlign: 'center',
          marginTop: '24px',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '13px',
          color: 'var(--muted)',
        }}>
          yanlış adres mi yazdın?{' '}
          <button
            type="button"
            onClick={() => { setDogrulamaBekliyor(false); setTekrarDurumu('bos'); setError('') }}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              font: 'inherit',
              color: 'var(--ink)',
              fontWeight: 700,
              textDecoration: 'underline',
              cursor: 'pointer',
            }}
          >
            geri dön
          </button>
        </p>
      </main>
    )
  }

  return (
    <main style={{ maxWidth: '440px', margin: '0 auto', padding: '56px 24px 80px' }}>
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <h1 className="serif" style={{
          fontSize: 'clamp(30px, 4vw, 42px)',
          color: 'var(--ink)',
          margin: '0 0 10px',
        }}>
          Aramıza katıl
        </h1>
        <p style={{
          fontFamily: "'IBM Plex Mono', monospace",
          color: 'var(--muted)',
          fontSize: '13.5px',
        }}>
          etkinliklere katıl · kendi topluluğunu kur
        </p>
      </div>

      <div className="auth-card">
        <button
          onClick={handleGoogleSignup}
          disabled={loading}
          className="btn-google"
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Google ile devam et
        </button>

        <div className="divider">veya</div>

        <form onSubmit={handleEmailSignup} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={labelStyle}>Adın</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Adın soyadın"
            />
          </div>
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
              placeholder="En az 6 karakter"
              minLength={6}
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
            {loading ? 'Kaydoluyor...' : 'Aramıza katıl'}
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
        zaten hesabın var mı?{' '}
        <Link href={nextParam ? `/login?next=${encodeURIComponent(safeNext)}` : '/login'} style={{
          color: 'var(--ink)',
          fontWeight: 700,
          textDecoration: 'underline',
        }}>
          giriş yap
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