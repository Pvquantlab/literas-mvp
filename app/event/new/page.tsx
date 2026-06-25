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

  // Kullanıcının founder veya admin olduğu, onaylı üyelikleri çek
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
    <main className="container" style={{ maxWidth: '560px' }}>
      <section style={{ padding: '2.5rem 0 1.5rem' }}>
        <p className="catalog-number" style={{ marginBottom: '0.5rem' }}>
          Yeni katalog girişi
        </p>
        <h1 className="serif" style={{
          fontSize: '2rem',
          color: 'var(--ink)',
          fontWeight: 500,
        }}>
          Etkinlik oluştur
        </h1>
        <p style={{ opacity: 0.7, marginTop: '0.5rem' }}>
          Topluluğunla ne yapacaksın? Birkaç satır yeter.
        </p>
      </section>

      {communities.length === 0 ? (
        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '8px',
          textAlign: 'center',
          border: '1px solid var(--border)',
        }}>
          <p style={{ color: 'var(--night)', opacity: 0.75, marginBottom: '1rem', lineHeight: 1.6 }}>
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
