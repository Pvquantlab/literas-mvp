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
        <nav style={{
          background: 'white',
          borderBottom: '1px solid var(--border)',
          padding: '1rem 1.5rem',
        }}>
          <div style={{
            maxWidth: '760px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <Link href="/" style={{
              fontFamily: 'Newsreader, serif',
              fontSize: '1.5rem',
              fontStyle: 'italic',
              color: 'var(--ink)',
              fontWeight: 500,
            }}>
              literas
            </Link>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              {user ? (
                <>
                <Link href="/community/new" className="btn-secondary" style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}>
                Topluluk kur
                </Link>
                  <Link href="/event/new" className="btn-secondary" style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}>
                    Etkinlik oluştur
                  </Link>
                  <Link href="/profile" style={{
                    fontFamily: 'Newsreader, serif',
                    fontStyle: 'italic',
                    color: 'var(--ink)',
                  }}>
                    {profile?.name || 'Profilim'}
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/login" style={{ color: 'var(--night)' }}>
                    Giriş yap
                  </Link>
                  <Link href="/signup" className="btn-primary" style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}>
                    Katıl
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  )
}
