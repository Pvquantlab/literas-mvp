import './globals.css'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'

export const metadata = {
  title: 'literas — kendi topluluğunu kur',
  description: 'Kitap kulübü, yürüyüş, dil pratiği. Topluluk burada başlar.',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .single()
    profile = data
  }

  return (
    <html lang="tr">
      <body>
        <header style={{
          background: '#ffffff',
          borderBottom: '1px solid var(--border-soft)',
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '20px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
          }}>
            {/* Logo + wordmark */}
            <Link href="/" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              textDecoration: 'none',
            }}>
              <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true">
                <path d="M4 10 C4 5.6 7.6 2 12 2 L22 2 C26.4 2 30 5.6 30 10 L30 18 C30 22.4 26.4 26 22 26 L14 26 L7 32 C5.9 32.9 4 32.2 4 30.6 Z" fill="#1E4D2B" />
                <rect x="13" y="8" width="4.4" height="13" rx="2.2" fill="#ffffff" />
                <circle cx="22.5" cy="18.8" r="2.6" fill="#C4622D" />
              </svg>
              <span style={{
                fontSize: '26px',
                fontWeight: 800,
                letterSpacing: '-0.8px',
                color: 'var(--ink)',
              }}>
                literas
              </span>
            </Link>

            {/* Sağdaki menü */}
            <nav style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
            }}>
              {user ? (
                <>
                  <Link href="/community/new" className="btn-ghost">
                    Topluluk kur
                  </Link>
                  <Link href="/event/new" className="btn-ghost">
                    Etkinlik oluştur
                  </Link>
                  <Link href={`/profile/${user.id}`} style={{
                    fontWeight: 700,
                    color: 'var(--night)',
                    padding: '0.6rem 1rem',
                    fontSize: '0.95rem',
                  }}>
                    {profile?.name || 'Profilim'}
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/login" className="btn-ghost">
                    Giriş yap
                  </Link>
                  <Link href="/signup" className="btn-primary" style={{
                    fontSize: '0.95rem',
                    padding: '0.7rem 1.5rem',
                  }}>
                    Katıl
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  )
}