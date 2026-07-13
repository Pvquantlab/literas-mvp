import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import EventCard from '@/components/event-card'
import CategoryStrip from './category-strip'
import SearchBox from './search-box'
import CityFilter from './city-filter'

export const dynamic = 'force-dynamic'

const CATS = [
  { n: 'Kitap',      slug: 'kitap',      bg: '#C9E8A0', soft: '#F5E9D0', ink: '#3E6B21', pt: 'stripes' },
  { n: 'Doğa',       slug: 'doğa',       bg: '#FFD09E', soft: '#DDE9D5', ink: '#A35A1E', pt: 'dots' },
  { n: 'Müzik',      slug: 'müzik',      bg: '#D5C3F5', soft: '#E7DBEB', ink: '#5B3EA6', pt: 'waves' },
  { n: 'Lezzet',     slug: 'lezzet',     bg: '#FFE382', soft: '#F3D8CE', ink: '#8A6A00', pt: 'checker' },
  { n: 'Dil',        slug: 'dil',        bg: '#B5D9F5', soft: '#DCE4EE', ink: '#2A5B8F', pt: 'stripes' },
  { n: 'Spor',       slug: 'spor',       bg: '#AEE3CB', soft: '#E5E0D2', ink: '#1F6E52', pt: 'dots' },
  { n: 'Sanat',      slug: 'sanat',      bg: '#F5BFDB', soft: '#EFD9DC', ink: '#A83A6E', pt: 'waves' },
  { n: 'Oyun',       slug: 'oyun',       bg: '#FFC2B0', soft: '#DFE8DE', ink: '#B04330', pt: 'checker' },
  { n: 'Tech',       slug: 'tech',       bg: '#BFD7E6', soft: '#DAE0E6', ink: '#33566B', pt: 'grid' },
  { n: 'Sinema',     slug: 'sinema',     bg: '#CDC5EA', soft: '#E4DED4', ink: '#544A86', pt: 'stripes' },
  { n: 'Fotoğraf',   slug: 'fotoğraf',   bg: '#B5DEE8', soft: '#E0DEDC', ink: '#23697A', pt: 'dots' },
  { n: 'Gönüllülük', slug: 'gönüllülük', bg: '#FFC7B0', soft: '#E1EBDA', ink: '#A34A22', pt: 'waves' },
  { n: 'Kariyer',    slug: 'kariyer',    bg: '#C8DBBB', soft: '#E5DED0', ink: '#46603A', pt: 'grid' },
  { n: 'Sosyal',     slug: 'sosyal',     bg: '#FFBFCB', soft: '#EBDFD3', ink: '#A8354F', pt: 'waves' },
]

const DEFAULT_SOFT = '#E8E4D8'

function CatIcon({ slug, size = 34 }: { slug: string; size?: number }) {
  const common = {
    width: size, height: size, viewBox: '0 0 24 24',
    fill: 'none', stroke: 'currentColor', strokeWidth: 1.7,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  }
  switch (slug) {
    case 'kitap':      return <svg {...common}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
    case 'doğa':       return <svg {...common}><path d="M8 19v2"/><path d="M8 15v-3"/><path d="M12 21V11"/><path d="M16 21v-4"/><path d="M12 11 6 5l6-2 6 2z"/><path d="M18 12a3 3 0 1 0 3-3"/></svg>
    case 'müzik':      return <svg {...common}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
    case 'lezzet':     return <svg {...common}><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/></svg>
    case 'dil':        return <svg {...common}><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>
    case 'spor':       return <svg {...common}><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
    case 'sanat':      return <svg {...common}><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
    case 'oyun':       return <svg {...common}><line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><line x1="15" x2="15.01" y1="12" y2="12"/><line x1="18" x2="18.01" y1="10" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/></svg>
    case 'tech':       return <svg {...common}><rect width="18" height="12" x="3" y="4" rx="2"/><line x1="2" x2="22" y1="20" y2="20"/></svg>
    case 'sinema':     return <svg {...common}><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/></svg>
    case 'fotoğraf':   return <svg {...common}><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
    case 'gönüllülük': return <svg {...common}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
    case 'kariyer':    return <svg {...common}><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
    case 'sosyal':     return <svg {...common}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    default:           return <svg {...common}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
  }
}

function findCat(s: string | null) {
  if (!s) return null
  return CATS.find((c) => c.slug === s) || null
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; city?: string; q?: string }>
}) {
  const params = await searchParams
  const activeCategory = params.category ?? null
  const activeCity = params.city ?? null
  const activeQuery = params.q ?? null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Kullanıcı verileri (giriş yapmışsa)
  let profile: any = null
  let myCommunities: any[] = []
  let myRsvps: any[] = []
  let suggestedEvents: any[] = []

  if (user) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('id, name, avatar_url')
      .eq('id', user.id)
      .maybeSingle()
    profile = prof

    const { data: memberships } = await supabase
      .from('community_members')
      .select('community:communities(id, name, category, city)')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .limit(5)
    myCommunities = (memberships ?? []).map((m: any) => m.community).filter(Boolean)

    const { data: rsvps } = await supabase
      .from('rsvps')
      .select('event:events(id, title, event_date, location)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)
    myRsvps = (rsvps ?? []).map((r: any) => r.event).filter(Boolean)

    // Öneriler: yaklaşan etkinlikler
    const { data: upcoming } = await supabase
      .from('events')
      .select('id, title, event_date, location, cover_image_url, community:communities(name, category)')
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true })
      .limit(8)
    suggestedEvents = upcoming ?? []
  }

  // Şehir listesi
  const { data: cityRows } = await supabase
    .from('communities')
    .select('city')
    .eq('status', 'approved')
    .order('city', { ascending: true })
  const cities = Array.from(
    new Set((cityRows ?? []).map((r: any) => r.city).filter(Boolean))
  ) as string[]

  // Topluluk listesi
  let query = supabase
    .from('communities')
    .select(`
      id, name, description, city, category, cover_image_url, created_at,
      founder:profiles!founder_id(name),
      community_members(count)
    `)
    .eq('status', 'approved')
    .eq('community_members.status', 'approved')
    .order('created_at', { ascending: false })

  if (activeCategory) query = query.eq('category', activeCategory)
  if (activeCity) query = query.eq('city', activeCity)
  if (activeQuery) query = query.ilike('name', `%${activeQuery}%`)

  const { data: communities } = await query
  const hasFilter = Boolean(activeCategory || activeCity || activeQuery)

  const buildCategoryHref = (cat: string | null) => {
    const p = new URLSearchParams()
    if (cat) p.set('category', cat)
    if (activeCity) p.set('city', activeCity)
    if (activeQuery) p.set('q', activeQuery)
    const s = p.toString()
    return s ? `/?${s}` : '/'
  }

  // ===== GİRİŞ YAPMIŞ KULLANICI =====
  if (user && profile) {
    const initials = profile.name
      ? profile.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
      : '?'

    return (
      <div style={{
        maxWidth: '1360px',
        margin: '0 auto',
        padding: '26px 24px 64px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '24px',
        alignItems: 'flex-start',
      }}>
        {/* SOL SIDEBAR */}
        <aside className="home-sidebar" style={{
          flex: '1 1 280px',
          maxWidth: '320px',
          minWidth: '260px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          {/* Profil kartı */}
          <Link href={`/profile/${profile.id}`} className="sidebar-card" style={{
            textDecoration: 'none',
            background: 'var(--paper-cream)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            transition: 'box-shadow .15s ease',
          }}>
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" style={{
                width: '46px', height: '46px', borderRadius: '50%', objectFit: 'cover',
              }} />
            ) : (
              <span style={{
                width: '46px', height: '46px', borderRadius: '50%',
                background: 'var(--paper-soft)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '15px', fontWeight: 600, color: 'var(--ink)',
              }}>
                {initials}
              </span>
            )}
            <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '15.5px', fontWeight: 700, color: 'var(--ink)' }}>
                {profile.name}
              </span>
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '12px',
                color: 'var(--muted)',
              }}>
                İstanbul
              </span>
            </span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto' }}>
              <path d="M10 6l6 6-6 6" />
            </svg>
          </Link>

          {/* Katıldığın etkinlikler */}
          <div style={{
            background: 'var(--paper-cream)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '16px',
          }}>
            <h2 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 700, color: 'var(--ink)' }}>
              Gidiyorum
            </h2>
            {myRsvps.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {myRsvps.map((ev: any) => (
                  <Link key={ev.id} href={`/event/${ev.id}`} className="sidebar-link" style={{
                    textDecoration: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    padding: '8px',
                    borderRadius: '10px',
                  }}>
                    <span style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '11px',
                      color: 'var(--coral)',
                    }}>
                      {new Date(ev.event_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                    </span>
                    <span className="serif" style={{
                      fontSize: '14.5px',
                      fontWeight: 600,
                      lineHeight: 1.3,
                      color: 'var(--ink)',
                    }}>
                      {ev.title}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 8px 8px' }}>
                <p style={{ margin: '0 0 16px', fontSize: '14px', color: 'var(--muted)' }}>
                  Henüz bir etkinliğe katılmadın.
                </p>
                <Link href="/kesfet" className="btn-primary" style={{
                  display: 'inline-flex',
                  textDecoration: 'none',
                  fontSize: '13.5px',
                  padding: '9px 18px',
                }}>
                  Etkinlikleri bul
                </Link>
              </div>
            )}
          </div>

          {/* Toplulukların */}
          <div style={{
            background: 'var(--paper-cream)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--ink)' }}>
                Toplulukların
              </h2>
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '11px',
                padding: '1px 8px',
                borderRadius: '999px',
                background: 'var(--paper-soft)',
                color: 'var(--muted)',
              }}>
                {myCommunities.length}
              </span>
            </div>

            {myCommunities.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '10px' }}>
                {myCommunities.map((c: any) => (
                  <Link key={c.id} href={`/community/${c.id}`} className="sidebar-link" style={{
                    textDecoration: 'none',
                    padding: '8px',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--ink)',
                  }}>
                    {c.name}
                  </Link>
                ))}
              </div>
            ) : (
              <>
                <p style={{ margin: '12px 0 14px', fontSize: '13.5px', lineHeight: 1.5, color: 'var(--muted)' }}>
                  Tutkularını paylaşan insanlarla aynı masaya otur.
                </p>
                <Link href="/kesfet" className="btn-secondary" style={{
                  display: 'inline-flex',
                  textDecoration: 'none',
                  fontSize: '13.5px',
                  padding: '9px 18px',
                }}>
                  Toplulukları keşfet
                </Link>
              </>
            )}
          </div>
        </aside>

        {/* SAĞ ANA ALAN */}
        <main style={{ flex: '3 1 440px', minWidth: 0 }}>
          {/* Senin için */}
          {suggestedEvents.length > 0 && (
            <section style={{ marginBottom: '40px' }}>
              <h2 className="serif" style={{
                margin: '0 0 18px',
                fontSize: '27px',
                fontWeight: 600,
                letterSpacing: '-0.3px',
                color: 'var(--ink)',
              }}>
                Senin için
              </h2>
              <div className="suggest-grid" style={{ display: 'grid', gap: '20px' }}>
                {suggestedEvents.slice(0, 4).map((ev: any) => (
                  <EventCard key={ev.id} event={ev} showCommunityName={true} />
                ))}
              </div>
              <style>{`
                .suggest-grid { grid-template-columns: 1fr; }
                @media (min-width: 640px) {
                  .suggest-grid { grid-template-columns: repeat(2, 1fr); }
                }
              `}</style>
            </section>
          )}

          {/* Topluluklar */}
          <section>
            <h2 className="serif" style={{
              margin: '0 0 18px',
              fontSize: '27px',
              fontWeight: 600,
              letterSpacing: '-0.3px',
              color: 'var(--ink)',
            }}>
              {activeCity ? `${activeCity} yakınındaki topluluklar` : 'Topluluklar'}
            </h2>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <SearchBox defaultValue={activeQuery ?? ''} />
              <CityFilter cities={cities} activeCity={activeCity} />
            </div>

            {communities && communities.length > 0 ? (
              <div className="community-grid" style={{ display: 'grid', gap: '20px' }}>
                {communities.map((community: any) => {
                  const cat = findCat(community.category)
                  const memberCount = community.community_members?.[0]?.count ?? 0
                  return (
                    <Link
                      key={community.id}
                      href={`/community/${community.id}`}
                      className="community-card-link"
                      style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
                    >
                      <article style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
                        <div style={{
                          position: 'relative',
                          aspectRatio: '16 / 9',
                          overflow: 'hidden',
                          borderRadius: '14px',
                          background: community.cover_image_url ? 'transparent' : (cat?.soft ?? DEFAULT_SOFT),
                        }}>
                          {community.cover_image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={community.cover_image_url}
                              alt=""
                              loading="lazy"
                              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            />
                          ) : (
                            <div style={{
                              position: 'absolute',
                              inset: 0,
                              display: 'grid',
                              placeItems: 'center',
                              color: 'var(--ink)',
                              opacity: 0.85,
                            }}>
                              {cat ? <CatIcon slug={cat.slug} size={72} /> : null}
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 2px' }}>
                          <h3 className="community-title" style={{
                            fontSize: '17px',
                            fontWeight: 800,
                            lineHeight: 1.25,
                            color: 'var(--ink)',
                            margin: 0,
                            letterSpacing: '-0.01em',
                          }}>
                            {community.name}
                          </h3>
                          <p style={{
                            fontSize: '13.5px',
                            color: 'var(--muted)',
                            margin: '4px 0 0',
                            lineHeight: 1.4,
                          }}>
                            {cat ? cat.n : ''}{cat && community.city ? ' · ' : ''}{community.city}
                          </p>
                          <p style={{
                            fontSize: '13.5px',
                            color: 'var(--ink)',
                            fontWeight: 600,
                            margin: '6px 0 0',
                          }}>
                            {memberCount} üye
                          </p>
                        </div>
                      </article>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <p style={{ color: 'var(--muted)', fontSize: '15px' }}>
                {hasFilter ? 'Bu filtreye uygun topluluk bulunamadı.' : 'Henüz topluluk yok.'}
              </p>
            )}

            <style>{`
              .community-grid { grid-template-columns: 1fr; }
              @media (min-width: 640px) {
                .community-grid { grid-template-columns: repeat(2, 1fr); }
              }
              @media (min-width: 1000px) {
                .community-grid { grid-template-columns: repeat(3, 1fr); }
              }
              .community-card-link:hover .community-title {
                text-decoration: underline;
                text-decoration-thickness: 2px;
                text-underline-offset: 3px;
              }
              .sidebar-card:hover {
                box-shadow: 0 8px 20px rgba(30,58,43,.10);
              }
              .sidebar-link:hover {
                background: var(--paper-soft);
              }
              @media (max-width: 780px) {
                .home-sidebar {
                  max-width: none !important;
                  flex: 1 1 100% !important;
                }
              }
            `}</style>
          </section>
        </main>
      </div>
    )
  }

  // ===== GİRİŞ YAPMAMIŞ =====
  return (
    <main>
      {/* Hero */}
      <section style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '64px 24px 48px',
        textAlign: 'center',
      }}>
        <span style={{
          display: 'inline-block',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '13px',
          color: 'var(--coral)',
          border: '1px solid var(--coral)',
          padding: '5px 14px',
          borderRadius: '999px',
          marginBottom: '28px',
        }}>
          ● her zaman açık · herkese göre
        </span>

        <h1 style={{
          fontSize: 'clamp(38px, 6vw, 64px)',
          fontWeight: 800,
          lineHeight: 1.08,
          letterSpacing: '-0.03em',
          color: 'var(--ink)',
          margin: '0 0 20px',
        }}>
          Harflerden kelimeler,<br />
          insanlardan{' '}
          <span className="highlight-yellow">topluluklar</span>.
        </h1>

        <p style={{ fontSize: '17px', color: 'var(--muted)', marginBottom: '32px' }}>
          Burada bir masa senin adına her zaman ayrılmış.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/community/new" className="btn-primary">Topluluk kur</Link>
          <Link href="/event/new" className="btn-secondary">Etkinlik paylaş</Link>
        </div>
      </section>

      {/* Kategoriler */}
      <section style={{ maxWidth: '1360px', margin: '0 auto', padding: '0 24px 48px' }}>
        <h2 className="serif" style={{
          textAlign: 'center',
          fontSize: 'clamp(24px, 3vw, 32px)',
          color: 'var(--ink)',
          marginBottom: '28px',
        }}>
          Ne ilgini çekiyor?
        </h2>
        <CategoryStrip cats={CATS} activeCategory={activeCategory ?? undefined} activeCity={activeCity ?? undefined} activeQuery={activeQuery ?? undefined} />
      </section>

      {/* Topluluklar */}
      <section style={{ maxWidth: '1360px', margin: '0 auto', padding: '0 24px 64px' }}>
        <h2 className="serif" style={{
          fontSize: 'clamp(24px, 3vw, 34px)',
          color: 'var(--ink)',
          marginBottom: '24px',
        }}>
          <span className="highlight-yellow">{activeCity ?? 'İstanbul'}</span> yakınındaki topluluklar
        </h2>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <SearchBox defaultValue={activeQuery ?? ''} />
          <CityFilter cities={cities} activeCity={activeCity} />
        </div>

        {communities && communities.length > 0 ? (
          <div className="community-grid-guest" style={{ display: 'grid', gap: '20px' }}>
            {communities.map((community: any) => {
              const cat = findCat(community.category)
              const memberCount = community.community_members?.[0]?.count ?? 0
              return (
                <Link
                  key={community.id}
                  href={`/community/${community.id}`}
                  className="community-card-link"
                  style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
                >
                  <article style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
                    <div style={{
                      position: 'relative',
                      aspectRatio: '16 / 9',
                      overflow: 'hidden',
                      borderRadius: '14px',
                      background: community.cover_image_url ? 'transparent' : (cat?.soft ?? DEFAULT_SOFT),
                    }}>
                      {community.cover_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={community.cover_image_url}
                          alt=""
                          loading="lazy"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      ) : (
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'grid',
                          placeItems: 'center',
                          color: 'var(--ink)',
                          opacity: 0.85,
                        }}>
                          {cat ? <CatIcon slug={cat.slug} size={72} /> : null}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 2px' }}>
                      <h3 className="community-title" style={{
                        fontSize: '17px',
                        fontWeight: 800,
                        lineHeight: 1.25,
                        color: 'var(--ink)',
                        margin: 0,
                        letterSpacing: '-0.01em',
                      }}>
                        {community.name}
                      </h3>
                      <p style={{
                        fontSize: '13.5px',
                        color: 'var(--muted)',
                        margin: '4px 0 0',
                        lineHeight: 1.4,
                      }}>
                        {cat ? cat.n : ''}{cat && community.city ? ' · ' : ''}{community.city}
                      </p>
                      <p style={{
                        fontSize: '13.5px',
                        color: 'var(--ink)',
                        fontWeight: 600,
                        margin: '6px 0 0',
                      }}>
                        {memberCount} üye
                      </p>
                    </div>
                  </article>
                </Link>
              )
            })}
          </div>
        ) : (
          <p style={{ color: 'var(--muted)', fontSize: '15px' }}>
            {hasFilter ? 'Bu filtreye uygun topluluk bulunamadı.' : 'Henüz topluluk yok.'}
          </p>
        )}

        <style>{`
          .community-grid-guest { grid-template-columns: 1fr; }
          @media (min-width: 640px) {
            .community-grid-guest { grid-template-columns: repeat(2, 1fr); }
          }
          @media (min-width: 1000px) {
            .community-grid-guest { grid-template-columns: repeat(4, 1fr); }
          }
          .community-card-link:hover .community-title {
            text-decoration: underline;
            text-decoration-thickness: 2px;
            text-underline-offset: 3px;
          }
        `}</style>
      </section>

      {/* CTA */}
      <section style={{ maxWidth: '1360px', margin: '0 auto', padding: '0 24px 64px' }}>
        <div style={{
          background: 'var(--ink)',
          borderRadius: '24px',
          padding: '56px 32px',
          textAlign: 'center',
        }}>
          <h2 className="serif" style={{
            fontSize: 'clamp(30px, 4vw, 46px)',
            color: 'var(--paper-cream)',
            margin: '0 0 12px',
            lineHeight: 1.2,
          }}>
            Bir <em>masa</em> aç.<br />Gerisini birlikte kuralım.
          </h2>
          <p style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '13px',
            color: 'var(--lime)',
            marginBottom: '28px',
          }}>
            topluluk kurmak 2 dakika sürer · başlaman yeter
          </p>
          <Link href="/community/new" className="btn-primary">Topluluk kur</Link>
        </div>
      </section>
    </main>
  )
}
