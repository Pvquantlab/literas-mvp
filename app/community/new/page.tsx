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
      padding: '48px 24px 64px',
    }}>
      <h1 style={{
        fontSize: '32px',
        fontWeight: 800,
        letterSpacing: '-0.8px',
        color: 'var(--night)',
        margin: '0 0 10px',
      }}>
        Bir topluluk kur
      </h1>
      <p style={{
        color: 'var(--muted)',
        fontSize: '15px',
        fontWeight: 500,
        lineHeight: 1.55,
        marginBottom: '32px',
      }}>
        Bir araya gelmek için bir bahane yeter. Topluluğunu kur,
        insanlar etrafında toplansın.
      </p>

      <NewCommunityForm />
    </main>
  )
}