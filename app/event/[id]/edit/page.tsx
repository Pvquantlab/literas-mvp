import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import EditEventForm from './edit-event-form'

export const dynamic = 'force-dynamic'

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single()

  if (!event) {
    notFound()
  }

  // Yetki kontrolü: organizatör mü, yoksa topluluğun founder/admin'i mi?
  let canManage = user.id === event.organizer_id
  if (!canManage && event.community_id) {
    const { data: membership } = await supabase
      .from('community_members')
      .select('role, status')
      .eq('community_id', event.community_id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (
      membership?.status === 'approved' &&
      (membership.role === 'founder' || membership.role === 'admin')
    ) {
      canManage = true
    }
  }

  if (!canManage) {
    redirect(`/event/${id}`)
  }

  return (
    <main className="container" style={{ maxWidth: '560px' }}>
      <section style={{ padding: '2.5rem 0 1.5rem' }}>
        <p className="catalog-number" style={{ marginBottom: '0.5rem' }}>
          Düzenleme
        </p>
        <h1 className="serif" style={{
          fontSize: '2rem',
          color: 'var(--ink)',
          fontWeight: 500,
        }}>
          Etkinliği düzenle
        </h1>
        <p style={{ opacity: 0.7, marginTop: '0.5rem' }}>
          Tarihi, konumu, açıklamayı değiştirebilirsin.
        </p>
      </section>

      <EditEventForm event={event} />
    </main>
  )
}
