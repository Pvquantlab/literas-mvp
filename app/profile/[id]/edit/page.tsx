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
  if (!user) redirect('/login')
  if (user.id !== id) redirect(`/profile/${id}`)

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, bio, avatar_url')
    .eq('id', id)
    .single()

  if (!profile) notFound()

  return (
    <main style={{
      maxWidth: '560px',
      margin: '0 auto',
      padding: '32px 24px 80px',
    }}>
      <Link
        href={`/profile/${id}`}
        style={{
          color: 'var(--muted)',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '13px',
          fontWeight: 500,
          textDecoration: 'none',
          display: 'inline-block',
          marginBottom: '20px',
        }}
      >
        ← profile dön
      </Link>
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <h1 className="serif" style={{
          fontSize: 'clamp(30px, 4vw, 42px)',
          color: 'var(--ink)',
          margin: '0 0 12px',
        }}>
          Kendinden <span className="highlight-yellow">bahset</span>
        </h1>
        <p style={{
          fontFamily: "'IBM Plex Mono', monospace",
          color: 'var(--muted)',
          fontSize: '13.5px',
          lineHeight: 1.5,
          maxWidth: '380px',
          margin: '0 auto',
        }}>
          birkaç cümle yeter · neyi seversin, neyi merak edersin?
        </p>
      </div>
      <div className="auth-card" style={{ marginTop: '32px' }}>
        <EditProfileForm
          userId={profile.id}
          initialBio={profile.bio ?? ''}
          initialAvatarUrl={profile.avatar_url ?? null}
        />
      </div>
    </main>
  )
}