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
    <main style={{
      maxWidth: '560px',
      margin: '0 auto',
      padding: '32px 24px 64px',
    }}>
      <Link
        href={`/profile/${id}`}
        style={{
          color: 'var(--muted)',
          fontSize: '14px',
          fontWeight: 600,
          textDecoration: 'none',
          display: 'inline-block',
          marginBottom: '20px',
        }}
      >
        ← Profile dön
      </Link>
      <h1 style={{
        fontSize: '32px',
        fontWeight: 800,
        letterSpacing: '-0.8px',
        color: 'var(--night)',
        margin: '0 0 8px',
      }}>
        Kendinden bahset
      </h1>
      <p style={{
        color: 'var(--muted)',
        fontSize: '15px',
        fontWeight: 500,
        lineHeight: 1.55,
        marginBottom: '32px',
      }}>
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