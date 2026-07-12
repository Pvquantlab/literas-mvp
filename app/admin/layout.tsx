import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'

export const metadata = {
  title: 'Yönetici — literaslab',
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/admin')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_admin) {
    // Admin değilse ana sayfaya at
    redirect('/')
  }

  return (
    <div>
      <div style={{
        background: 'var(--ink)',
        color: 'var(--paper-cream, #FFFDF6)',
        padding: '10px 24px',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '12.5px',
      }}>
        <div style={{
          maxWidth: '1080px',
          margin: '0 auto',
          display: 'flex',
          gap: '20px',
          alignItems: 'center',
        }}>
          <span style={{ opacity: 0.7 }}>yönetici paneli ·</span>
          <Link href="/admin/topluluklar" style={{ color: 'inherit', textDecoration: 'none' }}>
            topluluklar
          </Link>
          <span style={{ marginLeft: 'auto', opacity: 0.5 }}>
            ← siteye dön: <Link href="/" style={{ color: 'inherit' }}>ana sayfa</Link>
          </span>
        </div>
      </div>
      {children}
    </div>
  )
}
