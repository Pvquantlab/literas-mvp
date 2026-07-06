import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import NewEventForm from './new-event-form'

export default async function NewEventPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: memberships } = await supabase
    .from('community_members')
    .select('community:communities(id, name)')
    .eq('user_id', user.id)
    .eq('status', 'approved')
    .in('role', ['founder', 'admin'])

  const communities = (memberships ?? [])
    .map((m: any) => m.community)
    .filter(Boolean) as { id: string; name: string }[]

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
          Bir <span className="highlight-yellow">buluşma</span> planla
        </h1>
        <p style={{
          fontFamily: "'IBM Plex Mono', monospace",
          color: 'var(--muted)',
          fontSize: '13.5px',
          lineHeight: 1.5,
          maxWidth: '380px',
          margin: '0 auto',
        }}>
          topluluğunla ne yapacaksın · birkaç satır yeter
        </p>
      </div>

      {communities.length === 0 ? (
        <div className="auth-card" style={{ marginTop: '32px', textAlign: 'center' }}>
          <p style={{
            color: 'var(--ink)',
            fontSize: '15.5px',
            lineHeight: 1.6,
            marginBottom: '20px',
          }}>
            Etkinlik düzenlemek için önce bir topluluğun olmalı.
            <br />
            Bir bahane bulup başla.
          </p>
          <Link href="/community/new" className="btn-primary">
            Topluluk kur
          </Link>
        </div>
      ) : (
        <div className="auth-card" style={{ marginTop: '32px' }}>
          <NewEventForm userId={user.id} communities={communities} />
        </div>
      )}
    </main>
  )
}