import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import CityFilter from './city-filter'
import SearchBox from './search-box'
import CategoryStrip from './category-strip'

export const dynamic = 'force-dynamic'

// v2 tasarımın 14 kategorisi
const CATS = [
  { n: 'Kitap',      slug: 'kitap',      bg: '#C9E8A0', ink: '#3E6B21', pt: 'stripes' },
  { n: 'Doğa',       slug: 'doğa',       bg: '#FFD09E', ink: '#A35A1E', pt: 'dots' },
  { n: 'Müzik',      slug: 'müzik',      bg: '#D5C3F5', ink: '#5B3EA6', pt: 'waves' },
  { n: 'Lezzet',     slug: 'lezzet',     bg: '#FFE382', ink: '#8A6A00', pt: 'checker' },
  { n: 'Dil',        slug: 'dil',        bg: '#B5D9F5', ink: '#2A5B8F', pt: 'stripes' },
  { n: 'Spor',       slug: 'spor',       bg: '#AEE3CB', ink: '#1F6E52', pt: 'dots' },
  { n: 'Sanat',      slug: 'sanat',      bg: '#F5BFDB', ink: '#A83A6E', pt: 'waves' },
  { n: 'Oyun',       slug: 'oyun',       bg: '#FFC2B0', ink: '#B04330', pt: 'checker' },
  { n: 'Tech',       slug: 'tech',       bg: '#BFD7E6', ink: '#33566B', pt: 'grid' },
  { n: 'Sinema',     slug: 'sinema',     bg: '#CDC5EA', ink: '#544A86', pt: 'stripes' },
  { n: 'Fotoğraf',   slug: 'fotoğraf',   bg: '#B5DEE8', ink: '#23697A', pt: 'dots' },
  { n: 'Gönüllülük', slug: 'gönüllülük', bg: '#FFC7B0', ink: '#A34A22', pt: 'waves' },
  { n: 'Kariyer',    slug: 'kariyer',    bg: '#C8DBBB', ink: '#46603A', pt: 'grid' },
  { n: 'Sosyal',     slug: 'sosyal',     bg: '#FFBFCB', ink: '#A8354F', pt: 'waves' },
]

// Pattern arka planı üretir
function patternStyle(pt: string, ink: string) {
  const b = ink + '38'
  if (pt === 'stripes') return { backgroundImage: `repeating-linear-gradient(45deg, ${b} 0px, ${b} 8px, transparent 8px, transparent 22px)` }
  if (pt === 'dots')    return { backgroundImage: `radial-gradient(${ink}59 2.4px, transparent 2.7px)`, backgroundSize: '19px 19px' }
  if (pt === 'waves')   return { backgroundImage: `radial-gradient(circle at 12px 0px, transparent 9px, ${b} 9.5px, ${b} 11.5px, transparent 12px)`, backgroundSize: '24px 15px' }
  if (pt === 'checker') return { backgroundImage: `conic-gradient(${b} 25%, transparent 0 50%, ${b} 0 75%, transparent 0)`, backgroundSize: '26px 26px' }
  return { backgroundImage: `linear-gradient(${b} 1.5px, transparent 1.5px), linear-gradient(90deg, ${b} 1.5px, transparent 1.5px)`, backgroundSize: '21px 21px' }
}

// Kategori ikonu — kartlar için
function CatIcon({ slug, size = 34 }: { slug: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    kitap: <><path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z" /><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z" /></>,
    doğa: <path d="m8 3 4 8 5-5 5 15H2L8 3z" />,
    müzik: <><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><path d="M12 19v3" /></>,
    lezzet: <><path d="M17 8h1a4 4 0 1 1 0 8h-1" /><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z" /><path d="M7 2v2" /><path d="M11 2v2" /></>,
    dil: <><path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2z" /><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1" /><path d="M9.5 6.5h.01M12 6.5h.01M7 6.5h.01" /></>,
    spor: <><path d="M12 14.5c-1.5-1.3-2.3-2.9-2.3-4.7 0-1.9.8-3.8 2.3-5.6 1.5 1.8 2.3 3.7 2.3 5.6 0 1.8-.8 3.4-2.3 4.7z" /><path d="M9.5 13.2c-2.2-.2-4-1.2-5.5-3 .8-1 1.9-1.7 3.2-2.1" /><path d="M14.5 13.2c2.2-.2 4-1.2 5.5-3-.8-1-1.9-1.7-3.2-2.1" /><path d="M3.5 16c2.6 1.7 5.4 2.3 8.5 1.7 3.1.6 5.9 0 8.5-1.7" /></>,
    sanat: <><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.7 1.6-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.7 1.6-1.7h2c3.1 0 5.6-2.5 5.6-5.6C22 6 17.5 2 12 2z" /><circle cx="7" cy="10.5" r="1" /><circle cx="11" cy="6.8" r="1" /><circle cx="16" cy="8.5" r="1" /></>,
    oyun: <><path d="M6 11h4" /><path d="M8 9v4" /><path d="M15 12h.01" /><path d="M18 10h.01" /><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" /></>,
    tech: <><rect x="3" y="5" width="18" height="12" rx="2" /><path d="M2 20h20" /></>,
    sinema: <><path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3z" /><path d="m6.2 5.3 3.1 3.9" /><path d="m12.4 3.4 3.1 4" /><path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>,
    fotoğraf: <><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></>,
    gönüllülük: <><path d="M11 14h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 16" /><path d="m7 20 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9" /><path d="m2 15 6 6" /><path d="M19.5 8.5c.7-.7 1.5-1.6 1.5-2.7A2.73 2.73 0 0 0 16 4a2.78 2.78 0 0 0-5 1.8c0 1.2.8 2 1.5 2.8L16 12Z" /></>,
    kariyer: <><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></>,
    sosyal: <><g transform="rotate(-14 6.5 10)"><path d="M2.5 3.5h8l-4 6z" /><path d="M6.5 9.5V17" /><path d="M4 17.5h5" /></g><g transform="rotate(14 17.5 10)"><path d="M13.5 3.5h8l-4 6z" /><path d="M17.5 9.5V17" /><path d="M15 17.5h5" /></g></>,
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[slug] || null}
    </svg>
  )
}

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

  const findCat = (slug: string | undefined) => {
    if (!slug) return null
    const s = slug.toLocaleLowerCase('tr')
    return CATS.find((c) => c.slug === s) || null
  }

  return (
    <main>
      {/* --- HERO --- */}
      <section style={{
        maxWidth: '1440px',
        margin: '0 auto',
        padding: '38px 20px 60px',
        display: 'flex',
        justifyContent: 'center',
        position: 'relative',
      }}>
        <svg style={{ position: 'absolute', left: '6%', top: '40%' }} width="64" height="26" viewBox="0 0 64 26" fill="none" aria-hidden="true">
          <path d="M3 20C13 6 22 4 31 11s18 8 30-4" stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="1 6" />
        </svg>
        <svg style={{ position: 'absolute', right: '6%', top: '60%' }} width="54" height="24" viewBox="0 0 54 24" fill="none" aria-hidden="true">
          <path d="M51 5C41 18 33 20 25 14S10 8 3 17" stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="1 6" />
        </svg>

        <div style={{ flex: '0 1 820px', maxWidth: '820px', textAlign: 'center', position: 'relative', padding: '10px 0' }}>
          <div className="badge-mono" style={{ marginBottom: '22px' }}>
            her zaman açık · herkese göre
          </div>

          <h1 style={{
            fontFamily: "'Schibsted Grotesk', system-ui, sans-serif",
            fontWeight: 800,
            fontSize: 'clamp(40px, 6vw, 84px)',
            lineHeight: 1.04,
            margin: '0 0 24px',
            color: 'var(--ink)',
            letterSpacing: '-0.03em',
          }}>
            Harflerden kelimeler,<br />
            insanlardan{' '}
            <span className="highlight-yellow">topluluklar</span>.
          </h1>

          {/* Sticky rozetler — başlığın altında, tek satır */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '14px',
            marginBottom: '28px',
          }}>
            <span className="sticky-note sticky-blue">kitap + kahve</span>
            <span className="sticky-note sticky-pink">photowalk</span>
            <span className="sticky-note sticky-green">dil pratiği</span>
          </div>

          <p style={{
            maxWidth: '520px',
            margin: '0 auto',
            fontSize: '17px',
            lineHeight: 1.65,
            color: 'var(--muted)',
          }}>
            Burada bir masa senin adına her zaman ayrılmış.
          </p>

          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '14px',
            marginTop: '30px',
          }}>
            <Link href="/community/new" className="btn-primary" style={{ fontSize: '18px', padding: '16px 34px' }}>
              Topluluk kur
            </Link>
            <Link href="/event/new" className="btn-secondary" style={{ fontSize: '18px', padding: '16px 30px' }}>
              Etkinlik paylaş
            </Link>
          </div>

          <div style={{ marginTop: '28px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '13.5px', color: 'rgba(30,58,43,.62)' }}>
            ✿ çevrimiçi başlar, çevrimdışı buluşur
          </div>
        </div>
      </section>

      {/* --- KATEGORİ STRIP'İ --- */}
      <section id="kesfet" style={{
        maxWidth: '1240px',
        margin: '0 auto',
        padding: '64px 8px 4px',
        textAlign: 'center',
        position: 'relative',
      }}>
        <h2 style={{
          fontSize: 'clamp(24px, 3vw, 34px)',
          fontWeight: 800,
          color: 'var(--ink)',
          margin: 0,
          letterSpacing: '-0.01em',
        }}>
          Ne ilgini çekiyor?
        </h2>
        <CategoryStrip
          cats={CATS}
          activeCategory={activeCategory}
          activeCity={activeCity}
          activeQuery={activeQuery}
        />
      </section>

      {/* --- TOPLULUKLAR --- */}
      <section id="topluluklar" style={{ maxWidth: '1240px', margin: '0 auto', padding: '52px 20px 72px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px' }}>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(26px, 3.4vw, 38px)',
            fontWeight: 800,
            color: 'var(--ink)',
            margin: 0,
          }}>
            <span className="highlight-yellow" style={{ color: 'var(--coral)' }}>
              {activeCity || 'İstanbul'}
            </span>{' '}
            yakınındaki topluluklar
          </h2>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '22px' }}>
          <div style={{ flex: '1 1 260px', minWidth: '220px' }}>
            <SearchBox initialQuery={activeQuery ?? ''} />
          </div>
          <div style={{ flex: '0 0 auto', minWidth: '180px' }}>
            <CityFilter cities={cities} activeCity={activeCity ?? ''} />
          </div>
        </div>

        {activeCategory && (
          <Link
            href={buildCategoryHref(null)}
            style={{
              display: 'inline-block',
              marginTop: '16px',
              background: 'var(--ink)',
              color: 'var(--lime)',
              borderRadius: '999px',
              padding: '7px 16px',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '12.5px',
              textDecoration: 'none',
            }}
          >
            {activeCategory} ✕
          </Link>
        )}

        {!communities || communities.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: '34px' }}>🌱</div>
            <div className="serif" style={{ fontSize: '24px', color: 'var(--ink)', marginTop: '10px' }}>
              {hasFilter ? 'Bu filtreye uyan topluluk yok.' : 'Henüz burada bir topluluk yok.'}
            </div>
            <div style={{ fontSize: '15px', color: 'var(--muted)', marginTop: '6px' }}>
              İlkini sen kurabilirsin — 2 dakika sürer.
            </div>
            <Link href="/community/new" className="btn-primary" style={{ marginTop: '18px' }}>
              Topluluk kur
            </Link>
          </div>
        ) : (
          <div className="grid-cards">
            {communities.map((community: any) => {
              const memberCount = community.community_members?.[0]?.count ?? 0
              const cat = findCat(community.category)
              const artStyle: React.CSSProperties = cat
                ? { height: '148px', backgroundColor: cat.bg, ...patternStyle(cat.pt, cat.ink), display: 'grid', placeItems: 'center', color: cat.ink, position: 'relative' }
                : { height: '148px', backgroundColor: 'var(--paper-soft)', display: 'grid', placeItems: 'center', color: 'var(--muted)', position: 'relative' }

              return (
                <Link key={community.id} href={`/community/${community.id}`} className="card">
                  {community.cover_image_url ? (
                    <div style={{ width: '100%', height: '148px', overflow: 'hidden', background: 'var(--paper-soft)', position: 'relative' }}>
                      <img
                        src={community.cover_image_url}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                      <span style={{
                        position: 'absolute', top: '10px', right: '10px',
                        background: 'var(--lime-soft)', border: '1.5px solid var(--ink)',
                        color: 'var(--ink)', fontSize: '11.5px', fontWeight: 700,
                        padding: '2px 9px', borderRadius: '999px',
                      }}>
                        Açık
                      </span>
                    </div>
                  ) : (
                    <div style={artStyle}>
                      <span style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(255,253,246,.85)', display: 'grid', placeItems: 'center', color: cat?.ink }}>
                        {cat ? <CatIcon slug={cat.slug} size={34} /> : <span style={{ fontSize: '12px' }}>görsel yok</span>}
                      </span>
                      <span style={{
                        position: 'absolute', top: '10px', right: '10px',
                        background: 'var(--lime-soft)', border: '1.5px solid var(--ink)',
                        color: 'var(--ink)', fontSize: '11.5px', fontWeight: 700,
                        padding: '2px 9px', borderRadius: '999px',
                      }}>
                        Açık
                      </span>
                    </div>
                  )}

                  <div style={{ padding: '14px 16px 12px', flex: 1 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                      {community.category && cat && (
                        <span style={{
                          background: cat.bg, color: cat.ink,
                          fontSize: '12px', fontWeight: 700,
                          padding: '3px 10px', borderRadius: '999px',
                        }}>
                          {cat.n}
                        </span>
                      )}
                      {community.city && (
                        <span className="pill-city">📍 {community.city}</span>
                      )}
                    </div>
                    <h3 style={{
                      fontSize: '20px', fontWeight: 800, margin: '8px 0 4px',
                      color: 'var(--ink)', letterSpacing: '-0.01em',
                    }}>
                      {community.name}
                    </h3>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--ink)' }}>
                      👥 {memberCount} üye
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* --- ALT CTA --- */}
      <section style={{ maxWidth: '1240px', margin: '8px auto 0', padding: '0 20px' }}>
        <div style={{
          background: 'var(--ink)',
          borderRadius: '28px',
          padding: 'clamp(44px, 6vw, 72px) 28px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <svg style={{ position: 'absolute', top: '22px', left: '5%' }} width="60" height="26" viewBox="0 0 60 26" fill="none" aria-hidden="true">
            <path d="M3 20C13 6 21 4 30 12s17 8 27-6" stroke="var(--lime)" strokeWidth="2" strokeLinecap="round" strokeDasharray="1 6" />
          </svg>

         <h2 className="serif" style={{
            fontSize: 'clamp(30px, 4.4vw, 52px)',
            color: 'var(--paper-soft)',
            margin: 0,
            lineHeight: 1.15,
          }}>
            Bir <em>masa</em> aç.<br />
            Gerisini birlikte kuralım.
          </h2>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '13.5px',
            color: 'var(--lime)',
            marginTop: '14px',
          }}>
            topluluk kurmak 2 dakika sürer · başlaman yeter
          </div>
          <Link href="/community/new" className="btn-primary" style={{
            marginTop: '28px',
            fontSize: '17px',
            padding: '15px 32px',
          }}>
            Topluluk kur
          </Link>
        </div>
      </section>
    </main>
  )
}