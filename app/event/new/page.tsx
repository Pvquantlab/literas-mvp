import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import NewEventForm from './new-event-form'

export default async function NewEventPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <main className="container" style={{ maxWidth: '560px' }}>
      <section style={{ padding: '2.5rem 0 1.5rem' }}>
        <p className="catalog-number" style={{ marginBottom: '0.5rem' }}>Yeni katalog girişi</p>
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

      <NewEventForm userId={user.id} />
    </main>
  )
}
