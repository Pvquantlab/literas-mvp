import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const isOwnProfile = user?.id === id

  // Profil bilgisi
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, email, bio, created_at')
    .eq('id', id)
    .single()

  if (!profile) {
    notFound()
  }

  // Üye olduğu topluluklar (onaylı olanlar)
  const { data: memberships } = await supabase
    .from('community_members')
    .select('role, community:communities(id, name, city)')
    .eq('user_id', id)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })

  // Düzenlediği etkinlikler
  const { data: organizedEvents } = await supabase
    .from('events')
    .select('id, title, event_date, location')
    .eq('organizer_id', id)
    .order('event_date', { ascending: false })

  // RSVP yaptığı etkinlikler
  const { data: rsvps } = await supabase
    .from('rsvps')
    .select('event:events(id, title, event_date, location)')
    .eq('user_id', id)
    .order('created_at', { ascending: false })

  // Üyelik süresi hesabı
  const joinedDate = new Date(profile.created_at)
  const now = new Date()
  const diffMs = now.getTime() - joinedDate.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  let membershipText = ''
  if (diffDays < 1) {
    membershipText = 'bugün katıldı'
  } else if (diffDays < 30) {
    membershipText = `${diffDays} gündür Literas'ta`
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30)
    membershipText = `${months} aydır Literas'ta`
  } else {
    const years = Math.floor(diffDays / 365)
    membershipText = `${years} yıldır Literas'ta`
  }

  const roleLabel = (role: string) => {
    if (role === 'founder') return 'kurucu'
    if (role === 'admin') return 'yönetici'
    return 'üye'
  }

  return (
    <main style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Başlık */}
      <section style={{ marginBottom: '3rem', borderBottom: '1px solid var(--border)', paddingBottom: '2rem' }}>
        <p style={{ fontSize: '0.75rem', letterSpacing: '0.1em', color: 'var(--seal)', marginBottom: '0.5rem' }}>
          No. {profile.id.slice(0, 4).toUpperCase()}
        </p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
          <h1 style={{ fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontSize: '2.5rem', marginBottom: '0.5rem' }}>
            {profile.name}
          </h1>
          {isOwnProfile && (
            <Link
              href={`/profile/${profile.id}/edit`}
              style={{
                fontSize: '0.9rem',
                color: 'var(--seal)',
                textDecoration: 'underline',
                fontFamily: 'Newsreader, serif',
                fontStyle: 'italic',
              }}
            >
              düzenle
            </Link>
          )}
        </div>
        <p style={{ color: 'var(--seal)', fontSize: '0.9rem' }}>
          {membershipText}
        </p>
        {profile.bio && (
          <p style={{ marginTop: '1rem', fontStyle: 'italic', color: 'var(--ink)', lineHeight: '1.6' }}>
            "{profile.bio}"
          </p>
        )}
        {isOwnProfile && !profile.bio && (
          <p style={{ marginTop: '1rem', fontStyle: 'italic', color: 'var(--seal)', lineHeight: '1.6' }}>
            <Link href={`/profile/${profile.id}/edit`} style={{ color: 'var(--seal)', textDecoration: 'underline' }}>
              Kendinden bahset
            </Link> — birkaç cümle profile bir yüz katar.
          </p>
        )}
      </section>

      {/* Topluluklar */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontSize: '1.5rem', marginBottom: '1rem' }}>
          Toplulukları
        </h2>
        {memberships && memberships.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {memberships.map((m: any) => (
              <li key={m.community.id} style={{ marginBottom: '0.75rem' }}>
                <Link
                  href={`/community/${m.community.id}`}
                  style={{ color: 'var(--ink)', textDecoration: 'underline' }}
                >
                  {m.community.name}
                </Link>
                <span style={{ color: 'var(--seal)', fontSize: '0.85rem', marginLeft: '0.5rem' }}>
                  — {roleLabel(m.role)}
                  {m.community.city && ` · ${m.community.city}`}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ color: 'var(--seal)', fontStyle: 'italic' }}>Henüz bir topluluğa katılmadı.</p>
        )}
      </section>

      {/* Düzenlediği etkinlikler */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontSize: '1.5rem', marginBottom: '1rem' }}>
          Düzenlediği etkinlikler
        </h2>
        {organizedEvents && organizedEvents.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {organizedEvents.map((e: any) => (
              <li key={e.id} style={{ marginBottom: '0.75rem' }}>
                <Link
                  href={`/event/${e.id}`}
                  style={{ color: 'var(--ink)', textDecoration: 'underline' }}
                >
                  {e.title}
                </Link>
                <span style={{ color: 'var(--seal)', fontSize: '0.85rem', marginLeft: '0.5rem' }}>
                  — {new Date(e.event_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  {e.location && ` · ${e.location}`}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ color: 'var(--seal)', fontStyle: 'italic' }}>Henüz bir etkinlik düzenlemedi.</p>
        )}
      </section>

      {/* Katıldığı etkinlikler */}
      <section>
        <h2 style={{ fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontSize: '1.5rem', marginBottom: '1rem' }}>
          Katıldığı etkinlikler
        </h2>
        {rsvps && rsvps.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {rsvps.map((r: any) => (
              <li key={r.event.id} style={{ marginBottom: '0.75rem' }}>
                <Link
                  href={`/event/${r.event.id}`}
                  style={{ color: 'var(--ink)', textDecoration: 'underline' }}
                >
                  {r.event.title}
                </Link>
                <span style={{ color: 'var(--seal)', fontSize: '0.85rem', marginLeft: '0.5rem' }}>
                  — {new Date(r.event.event_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  {r.event.location && ` · ${r.event.location}`}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ color: 'var(--seal)', fontStyle: 'italic' }}>Henüz bir etkinliğe katılmadı.</p>
        )}
      </section>
    </main>
  )
}
