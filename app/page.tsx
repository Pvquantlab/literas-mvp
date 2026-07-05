import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import CityFilter from './city-filter'
import SearchBox from './search-box'

export const dynamic = 'force-dynamic'

const CATEGORIES = ['kitap', 'yürüyüş', 'yoga', 'dil', 'sanat', 'sohbet', 'sinema']

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; city?: string; q?: string }>
}) {
  const { category: activeCategory, city: activeCity, q: activeQuery } = await searchParams
  const supabase = await createClient()

  const { data: cityRows } = await supabase
    .from('communities')
    .select('city')
    .order('city', { ascending: true })

  const cities = Array.from(
    new Set((cityRows ?? []).map((r: any) => r.city).filter(Boolean))
  ) as string[]

  let query = supabase
    .from('communities')
    .select(`
      id,
      name,
      description,
      city,
      category,
      cover_image_url,
      created_at,
      founder:profiles!founder_id(name),
      community_members(count)
    `)
    .eq('community_members.status', 'approved')
    .order('created_at', { ascending: false })

  if (activeCategory) query = query.eq('category', activeCategory)
  if (activeCity) query = query.eq('city', activeCity)
  if (activeQuery) query = query.ilike('name', `%${activeQuery}%`)

  const { data: communities } = await query

  const hasFilter = Boolean(activeCategory || activeCity || activeQuery)

  const buildCategoryHref = (cat: string | null) => {
    const params = new URLSearchParams()
    if (cat) params.set('category', cat)
    if (activeCity) params.set('city', activeCity)
    if (activeQuery) params.set('q', activeQuery)
    const qs = params.toString()
    return qs ? `/?${qs}` : '/'
  }

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
          marginBottom: '1rem',
          fontWeight: 500,
        }}>
          Topluluklar
        </h2>

        <SearchBox initialQuery={activeQuery ?? ''} />
        <CityFilter cities={cities} activeCity={activeCity ?? ''} />

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem 1.25rem',
          marginBottom: '1.5rem',
          fontSize: '1rem',
        }}>
          <Link
            href={buildCategoryHref(null)}
            className={`filter-link${!activeCategory ? ' active' : ''}`}
          >
            hepsi
          </Link>
          {CATEGORIES.map((cat) => (
            <Link
              key={cat}
              href={buildCategoryHref(cat)}
              className={`filter-link${activeCategory === cat ? ' active' : ''}`}
            >
              {cat}
            </Link>
          ))}
        </div>

        {!communities || communities.length === 0 ? (
          <div style={{
            background: 'var(--old-paper)',
            padding: '2.5rem 2rem',
            borderRadius: '8px',
            textAlign: 'center',
            border: '1px solid var(--border)',
          }}>
            {hasFilter ? (
              <>
                <p style={{ color: 'var(--ink)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                  Bu filtreye uyan topluluk yok — ama sen kurabilirsin.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Link href="/" style={{
                    padding: '0.75rem 1.25rem',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: 'var(--ink)',
                    textDecoration: 'none',
                    background: 'white',
                    display: 'inline-block',
                  }}>
                    Filtreleri temizle
                  </Link>
                  <Link href="/community/new" className="btn-primary">
                    Topluluk kur
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p style={{ color: 'var(--ink)', marginBottom: '0.5rem', lineHeight: '1.6' }}>
                  Henüz kimse bir topluluk kurmadı.
                </p>
                <p style={{ color: 'var(--seal)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                  İlki sen ol.
                </p>
                <Link href="/community/new" className="btn-primary">
                  Topluluk kur
                </Link>
              </>
            )}
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
                  className="card"
                  style={{ padding: 0, overflow: 'hidden' }}
                >
                  {community.cover_image_url && (
                    <div style={{
                      width: '100%',
                      aspectRatio: '16 / 9',
                      overflow: 'hidden',
                      background: 'var(--old-paper)',
                    }}>
                      <img
                        src={community.cover_image_url}
                        alt=""
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                    </div>
                  )}
                  <div style={{ padding: '1.5rem' }}>
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
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      flexWrap: 'wrap',
                    }}>
                      <span>{community.city} · {memberCount} üye</span>
                      {community.category && (
                        <span className={`cat-badge ${community.category}`}>
                          {community.category}
                        </span>
                      )}
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
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}