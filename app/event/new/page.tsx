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
    .filter(Boolean)

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
        Etkinlik oluştur
      </h1>
      <p style={{
        color: 'var(--muted)',
        fontSize: '15px',
        fontWeight: 500,
        lineHeight: 1.55,
        marginBottom: '32px',
      }}>
        Topluluğunla ne yapacaksın? Birkaç satır yeter.
      </p>

      {communities.length === 0 ? (
        <div style={{
          background: '#ffffff',
          padding: '32px 24px',
          borderRadius: '16px',
          textAlign: 'center',
          border: '1px solid var(--border-soft)',
        }}>
          <p style={{
            color: 'var(--night)',
            fontSize: '15.5px',
            fontWeight: 500,
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
        <NewEventForm userId={user.id} communities={communities} />
      )}
    </main>
  )
}