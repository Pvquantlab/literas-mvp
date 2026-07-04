import { createClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import EditProfileForm from './edit-profile-form'

export default async function EditProfilePage({
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

  if (user.id !== id) {
    redirect(`/profile/${id}`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, bio, avatar_url')
    .eq('id', id)
    .single()

  if (!profile) {
    notFound()
  }

  return (
    <main style={{ maxWidth: '640px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <Link
        href={`/profile/${id}`}
        style={{ fontSize: '0.9rem', opacity: 0.7, color: 'var(--ink)' }}
      >
        ← Profile dön
      </Link>
      <h1 style={{
        fontFamily: 'Newsreader, serif',
        fontStyle: 'italic',
        fontSize: '2rem',
        marginTop: '1.5rem',
        marginBottom: '0.5rem',
      }}>
        Kendinden bahset
      </h1>
      <p style={{ color: 'var(--seal)', fontSize: '0.95rem', marginBottom: '2rem' }}>
        Birkaç cümle yeter. Neyi seversin, neyi merak edersin?
      </p>
      <EditProfileForm
        userId={profile.id}
        initialBio={profile.bio ?? ''}
        initialAvatarUrl={profile.avatar_url ?? null}
      />
    </main>
  )
}
