import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = await createClient()

  // Toplulukları çek, kurucu adı ve onaylı üye sayısı ile birlikte
  const { data: communities } = await supabase
    .from('communities')
    .select(`
      id,
      name,
      description,
      city,
      cover_image_url,
      created_at,
      founder:profiles!founder_id(name),
      community_members(count)
    `)
    .eq('community_members.status', 'approved')
    .order('created_at', { ascending: false })

  return (
    <main className="container">
      <section style={{ padding: '3rem 0 2rem', textAlign: 'center' }}>
        <p className="catalog-number" style={{ marginBottom: '1rem' }}>No. 0001</p>
        <h1 className="serif" style={{
          fontSize: '2.5rem',
          fontWeight: 500,
          color: 'var(--ink)',
          marginBottom: '1rem',
          lineHeight: 1.2,
        }}>
          İnsanların kendi topluluklarını kurduğu bir yer
        </h1>
        <p style={{
          color: 'var(--night)',
          opacity: 0.75,
          fontSize: '1.1rem',
          maxWidth: '480px',
          margin: '0 auto',
        }}>
          Kitap kulübü, yürüyüş, dil pratiği. Bir araya gelmek için bir bahane yeter.
        </p>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2 className="serif" style={{
          fontSize: '1.5rem',
          color: 'var(--ink)',
          marginBottom: '1.5rem',
          fontWeight: 500,
        }}>
          Topluluklar
        </h2>

        {!communities || communities.length === 0 ? (
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '8px',
            textAlign: 'center',
            border: '1px solid var(--border)',
          }}>
            <p style={{ color: 'var(--night)', opacity: 0.6, marginBottom: '1rem' }}>
              Henüz hiç topluluk kurulmadı.
            </p>
            <Link href="/community/new" className="btn-primary">
              İlk topluluğu sen kur
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {communities.map((community: any, i: number) => {
              const memberCount = community.community_members?.[0]?.count ?? 0
              const num = String(i + 1).padStart(4, '0')
              const founderName = community.founder?.name ?? 'biri'

              return (
                <Link
                  key={community.id}
                  href={`/community/${community.id}`}
                  style={{
                    display: 'block',
                    background: 'white',
                    padding: '1.5rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    transition: 'border-color 0.2s',
                  }}
                >
                  <p className="catalog-number" style={{ marginBottom: '0.5rem' }}>
                    No. {num}
                  </p>
                  <h3 className="serif" style={{
                    fontSize: '1.4rem',
                    color: 'var(--ink)',
                    marginBottom: '0.5rem',
                    fontWeight: 500,
                  }}>
                    {community.name}
                  </h3>
                  <p style={{
                    color: 'var(--night)',
                    opacity: 0.75,
                    fontSize: '0.95rem',
                    marginBottom: '0.5rem',
                  }}>
                    {community.city} · {memberCount} üye
                  </p>
                  {community.description && (
                    <p style={{
                      color: 'var(--night)',
                      opacity: 0.7,
                      fontSize: '0.95rem',
                      marginBottom: '0.5rem',
                    }}>
                      {community.description}
                    </p>
                  )}
                  <p style={{
                    fontFamily: 'Newsreader, serif',
                    fontStyle: 'italic',
                    color: 'var(--night)',
                    opacity: 0.6,
                    fontSize: '0.9rem',
                    marginTop: '0.5rem',
                  }}>
                    {founderName} kurdu
                  </p>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
