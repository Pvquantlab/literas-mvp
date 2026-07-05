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
    <main>
      {/* Hero */}
      <section style={{
        maxWidth: '820px',
        margin: '0 auto',
        padding: '64px 24px 72px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: '22px',
      }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--seal-soft)',
          color: 'var(--seal-deep)',
          fontSize: '14px',
          fontWeight: 700,
          padding: '8px 18px',
          borderRadius: '999px',
          letterSpacing: '0.2px',
        }}>
          <span style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: 'var(--seal)',
            display: 'inline-block',
          }} />
          Ücretsiz • Sınırsız üye
        </span>
        <h1 style={{
          fontSize: '62px',
          fontWeight: 800,
          lineHeight: 1.05,
          letterSpacing: '-2px',
          margin: 0,
          color: 'var(--night)',
        }}>
          İnsanların kendi topluluklarını kurduğu bir yer
        </h1>
        <p style={{
          fontSize: '19px',
          fontWeight: 500,
          lineHeight: 1.55,
          color: 'var(--muted)',
          margin: 0,
          maxWidth: '560px',
        }}>
          Kitap kulübü, yürüyüş, dil pratiği. Topluluk kurmak tamamen ücretsiz.
        </p>
        <div style={{
          display: 'flex',
          gap: '14px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          marginTop: '10px',
        }}>
          <Link href="/community/new" className="btn-primary" style={{ fontSize: '17px' }}>
            Topluluk kur
          </Link>
          <Link href="#topluluklar" className="btn-secondary" style={{ fontSize: '17px' }}>
            Toplulukları keşfet
          </Link>
        </div>
      </section>

      {/* Topluluklar bölümü */}
      <section id="topluluklar" style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 24px 80px',
      }}>
        <h2 style={{
          fontSize: '34px',
          fontWeight: 800,
          letterSpacing: '-1px',
          margin: '0 0 24px',
          color: 'var(--night)',
        }}>
          Topluluklar
        </h2>

        {/* Arama + şehir seçici */}
        <div style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: '20px',
        }}>
          <div style={{ flex: 1, minWidth: '260px' }}>
            <SearchBox initialQuery={activeQuery ?? ''} />
          </div>
          <div style={{ minWidth: '200px' }}>
            <CityFilter cities={cities} activeCity={activeCity ?? ''} />
          </div>
        </div>

        {/* Kategori chip'leri */}
        <div style={{
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          marginBottom: '32px',
        }}>
          <Link
            href={buildCategoryHref(null)}
            className={`filter-chip${!activeCategory ? ' active' : ''}`}
          >
            hepsi
          </Link>
          {CATEGORIES.map((cat) => (
            <Link
              key={cat}
              href={buildCategoryHref(cat)}
              className={`filter-chip${activeCategory === cat ? ' active' : ''}`}
            >
              {cat}
            </Link>
          ))}
        </div>

        {/* Kartlar veya boş durum */}
        {!communities || communities.length === 0 ? (
          <div style={{
            background: '#ffffff',
            padding: '3rem 2rem',
            borderRadius: '16px',
            textAlign: 'center',
            border: '1px solid var(--border-soft)',
          }}>
            {hasFilter ? (
              <>
                <p style={{ color: 'var(--night)', fontSize: '17px', fontWeight: 600, marginBottom: '1.5rem' }}>
                  Bu filtreye uyan topluluk yok — ama sen kurabilirsin.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Link href="/" className="btn-secondary">Filtreleri temizle</Link>
                  <Link href="/community/new" className="btn-primary">Topluluk kur</Link>
                </div>
              </>
            ) : (
              <>
                <p style={{ color: 'var(--night)', fontSize: '20px', fontWeight: 700, marginBottom: '0.5rem' }}>
                  Henüz kimse bir topluluk kurmadı.
                </p>
                <p style={{ color: 'var(--muted)', fontSize: '16px', marginBottom: '1.5rem' }}>
                  İlki sen ol.
                </p>
                <Link href="/community/new" className="btn-primary">Topluluk kur</Link>
              </>
            )}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '28px',
          }}>
            {communities.map((community: any) => {
              const memberCount = community.community_members?.[0]?.count ?? 0

              return (
                <Link
                  key={community.id}
                  href={`/community/${community.id}`}
                  className="card"
                >
                  {community.cover_image_url ? (
                    <div style={{
                      width: '100%',
                      aspectRatio: '16 / 9',
                      overflow: 'hidden',
                      background: 'var(--paper-soft)',
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
                  ) : (
                    <div style={{
                      width: '100%',
                      aspectRatio: '16 / 9',
                      background: 'var(--paper-soft)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--muted)',
                      fontSize: '0.9rem',
                    }}>
                      görsel yok
                    </div>
                  )}
                  <div style={{
                    padding: '18px 20px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}>
                    {community.category && (
                      <span className="cat-badge" style={{ alignSelf: 'flex-start' }}>
                        {community.category}
                      </span>
                    )}
                    <h3 style={{
                      fontSize: '19px',
                      fontWeight: 800,
                      letterSpacing: '-0.4px',
                      lineHeight: 1.25,
                      color: 'var(--night)',
                      margin: '2px 0 0',
                    }}>
                      {community.name}
                    </h3>
                    <p style={{
                      fontSize: '14.5px',
                      fontWeight: 600,
                      color: 'var(--muted)',
                      margin: 0,
                    }}>
                      {community.city}
                    </p>
                    <p style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: 'var(--ink)',
                      margin: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}>
                      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <circle cx="5.5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.6" />
                        <circle cx="11" cy="5.5" r="2" stroke="currentColor" strokeWidth="1.6" />
                        <path d="M1.5 13.5 C1.5 10.8 3.3 9.5 5.5 9.5 C7.7 9.5 9.5 10.8 9.5 13.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                        <path d="M11.5 9.8 C13.3 10 14.5 11.2 14.5 13.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                      {memberCount} üye
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