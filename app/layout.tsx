import './globals.css'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import Footer from '@/components/footer'

export const metadata = {
  title: 'literaslab — kendi topluluğunu kur',
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
          background: 'var(--paper)',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{
            maxWidth: '1340px',
            margin: '0 auto',
            padding: '18px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
          }}>
            {/* Logo + wordmark */}
            <Link href="/" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              textDecoration: 'none',
            }}>
              <svg width="30" height="30" viewBox="0 0 34 34" fill="none" aria-hidden="true">
                <path
                  d="M4 10 C4 5.6 7.6 2 12 2 L22 2 C26.4 2 30 5.6 30 10 L30 18 C30 22.4 26.4 26 22 26 L14 26 L7 32 C5.9 32.9 4 32.2 4 30.6 Z"
                  fill="var(--ink)"
                />
                <rect x="13" y="8" width="4.4" height="13" rx="2.2" fill="var(--paper-soft)" />
                <circle cx="22.5" cy="18.8" r="2.6" fill="var(--coral)" />
              </svg>
              <span style={{
                fontFamily: 'system-ui, sans-serif',
                fontSize: '23px',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: 'var(--ink)',
              }}>
                literaslab
              </span>
            </Link>

            {/* Sağdaki menü */}
            <nav style={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              flexWrap: 'wrap',
            }}>
              <Link
                href="/#kesfet"
                style={{
                  color: 'var(--ink)',
                  textDecoration: 'none',
                  fontSize: '15px',
                  fontWeight: 500,
                }}
              >
                Keşfet
              </Link>

              {user ? (
                <>
                  <Link
                    href="/community/new"
                    style={{
                      color: 'var(--ink)',
                      textDecoration: 'none',
                      fontSize: '15px',
                      fontWeight: 500,
                    }}
                  >
                    Topluluk kur
                  </Link>
                  <Link
                    href="/event/new"
                    style={{
                      color: 'var(--ink)',
                      textDecoration: 'none',
                      fontSize: '15px',
                      fontWeight: 500,
                    }}
                  >
                    Etkinlik oluştur
                  </Link>
                  <Link
                    href={`/profile/${user.id}`}
                    className="btn-nav"
                  >
                    {profile?.name || 'Profilim'}
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    style={{
                      color: 'var(--ink)',
                      textDecoration: 'none',
                      fontSize: '15px',
                      fontWeight: 500,
                    }}
                  >
                    Giriş yap
                  </Link>
                  <Link href="/signup" className="btn-nav">
                    Katıl
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>
        {children}
        <Footer />
      </body>
    </html>
  )
}