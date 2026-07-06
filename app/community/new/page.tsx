import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import NewCommunityForm from './new-community-form'

export default async function NewCommunityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <main style={{
      maxWidth: '560px',
      margin: '0 auto',
      padding: '48px 24px 80px',
    }}>
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <h1 className="serif" style={{
          fontSize: 'clamp(32px, 4.4vw, 46px)',
          color: 'var(--ink)',
          margin: '0 0 12px',
        }}>
          Bir <span className="highlight-yellow">topluluk</span> kur
        </h1>
        <p style={{
          fontFamily: "'IBM Plex Mono', monospace",
          color: 'var(--muted)',
          fontSize: '13.5px',
          lineHeight: 1.5,
          maxWidth: '380px',
          margin: '0 auto',
        }}>
          bir araya gelmek için bir bahane yeter · 2 dakika sürer
        </p>
      </div>

      <div className="auth-card" style={{ marginTop: '32px' }}>
        <NewCommunityForm />
      </div>
    </main>
  )
}