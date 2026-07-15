import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import EventCard from '@/components/event-card'
import KesfetTabs from './kesfet-tabs'
import KesfetCategoryStrip from './kesfet-category-strip'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 12

const CATS = [
  { n: 'Kitap',      slug: 'kitap',      soft: '#F5E9D0', ink: '#3E6B21' },
  { n: 'Doğa',       slug: 'doğa',       soft: '#DDE9D5', ink: '#A35A1E' },
  { n: 'Müzik',      slug: 'müzik',      soft: '#E7DBEB', ink: '#5B3EA6' },
  { n: 'Lezzet',     slug: 'lezzet',     soft: '#F3D8CE', ink: '#8A6A00' },
  { n: 'Dil',        slug: 'dil',        soft: '#DCE4EE', ink: '#2A5B8F' },
  { n: 'Spor',       slug: 'spor',       soft: '#E5E0D2', ink: '#1F6E52' },
  { n: 'Sanat',      slug: 'sanat',      soft: '#EFD9DC', ink: '#A83A6E' },
  { n: 'Oyun',       slug: 'oyun',       soft: '#DFE8DE', ink: '#B04330' },
  { n: 'Tech',       slug: 'tech',       soft: '#DAE0E6', ink: '#33566B' },
  { n: 'Sinema',     slug: 'sinema',     soft: '#E4DED4', ink: '#544A86' },
  { n: 'Fotoğraf',   slug: 'fotoğraf',   soft: '#E0DEDC', ink: '#23697A' },
  { n: 'Gönüllülük', slug: 'gönüllülük', soft: '#E1EBDA', ink: '#A34A22' },
  { n: 'Kariyer',    slug: 'kariyer',    soft: '#E5DED0', ink: '#46603A' },
  { n: 'Sosyal',     slug: 'sosyal',     soft: '#EBDFD3', ink: '#A8354F' },
]

const DEFAULT_SOFT = '#E8E4D8'

// Türkçe karakter/aksan normalize — arama sorgusu için
function normalizeQuery(q: string): string {
  return q
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

// textSearch için websearch formatına çevir — kullanıcı boşlukla ayırırsa AND ile arar
function buildSearchQuery(q: string): string {
  const normalized = normalizeQuery(q)
  // Postgres websearch operatörlerini escape et (', ", :, &, |, !, <, >, (, ))
  return normalized.replace(/['":&|!<>()]/g, ' ').split(/\s+/).filter(Boolean).join(' & ')
}

function CatIcon({ slug, size = 72 }: { slug: string; size?: number }) {
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

export default async function KesfetPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; kategori?: string; q?: string; city?: string; page?: string }>
}) {
  const params = await searchParams
  const activeTab = params.tab === 'topluluklar' ? 'topluluklar' : 'etkinlikler'
  const activeCategory = params.kategori || null
  const searchQuery = params.q || null
  const city = params.city || 'İstanbul'
  const pageParam = parseInt(params.page || '1', 10)
  const activePage = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1

  const rangeFrom = (activePage - 1) * PAGE_SIZE
  const rangeTo = activePage * PAGE_SIZE - 1

  const supabase = await createClient()

  let events: any[] = []
  let communities: any[] = []
  let hasMore = false

  if (activeTab === 'etkinlikler') {
    // Kategori seçiliyse önce o kategorideki onaylı toplulukların id'lerini çek
    let communityIds: string[] | null = null
    if (activeCategory) {
      const { data: cats } = await supabase
        .from('communities')
        .select('id')
        .eq('category', activeCategory)
        .eq('status', 'approved')
      communityIds = (cats ?? []).map((c: any) => c.id)
      // Kategoride hiç topluluk yoksa boş dönelim
      if (communityIds.length === 0) {
        events = []
        hasMore = false
      }
    }

    if (!activeCategory || (communityIds && communityIds.length > 0)) {
      let query = supabase
        .from('events')
        .select('id, title, event_date, location, cover_image_url, community:communities!inner(id, name, category, city, status)')
        .gte('event_date', new Date().toISOString())
        .eq('community.status', 'approved')
        .order('event_date', { ascending: true })
        .range(rangeFrom, rangeTo)

      if (communityIds) query = query.in('community_id', communityIds)
      if (searchQuery) {
        const q = buildSearchQuery(searchQuery)
        if (q) query = query.textSearch('search_vector', q, { config: 'simple' })
      }

      const { data } = await query
      events = data ?? []
      hasMore = events.length === PAGE_SIZE
    }
  } else {
    let query = supabase
      .from('communities')
      .select('id, name, category, description, cover_image_url, city, created_at, community_members(count)')
      .eq('status', 'approved')
      .eq('community_members.status', 'approved')
      .order('created_at', { ascending: false })
      .range(rangeFrom, rangeTo)

    if (activeCategory) query = query.eq('category', activeCategory)
    if (searchQuery) {
      const q = buildSearchQuery(searchQuery)
      if (q) query = query.textSearch('search_vector', q, { config: 'simple' })
    }

    const { data } = await query
    communities = data ?? []
    hasMore = communities.length === PAGE_SIZE
  }

  // "Daha fazla göster" için sonraki sayfanın URL'i (mevcut parametreleri koru)
  const buildNextPageHref = () => {
    const p = new URLSearchParams()
    if (activeTab === 'topluluklar') p.set('tab', 'topluluklar')
    if (activeCategory) p.set('kategori', activeCategory)
    if (searchQuery) p.set('q', searchQuery)
    if (params.city) p.set('city', params.city)
    p.set('page', String(activePage + 1))
    return `/kesfet?${p.toString()}`
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      {/* Promo bandı */}
      <div style={{
        background: '#E9F4C2',
        borderBottom: '1px solid #D9E8A6',
      }}>
        <div style={{
          maxWidth: '1320px',
          margin: '0 auto',
          padding: '9px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}>
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '12px',
            color: '#54702F',
          }}>
            ✳
          </span>
          <p style={{ margin: 0, flex: '1 1 auto', fontSize: '14.5px', fontWeight: 500, minWidth: 0, color: 'var(--ink)' }}>
            Kendi topluluğunu oluştur ve etkinlik düzenlemeye bugün başla!
          </p>
          <Link href="/community/new" style={{
            flex: '0 0 auto',
            display: 'inline-flex',
            alignItems: 'center',
            background: 'var(--ink)',
            color: 'var(--paper-cream)',
            textDecoration: 'none',
            fontSize: '13px',
            fontWeight: 600,
            padding: '7px 16px',
            borderRadius: '999px',
          }}>
            Şimdi başla
          </Link>
        </div>
      </div>

      {/* Sekmeler */}
      <div style={{ maxWidth: '1320px', margin: '0 auto', padding: '28px 24px 0' }}>
        <KesfetTabs activeTab={activeTab} activeCategory={activeCategory} />
      </div>

      {/* Başlık */}
      <div style={{
        maxWidth: '1320px',
        margin: '0 auto',
        padding: '22px 24px 0',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: '18px',
      }}>
        <h1 className="serif" style={{
          margin: 0,
          fontWeight: 600,
          fontSize: 'clamp(30px, 4vw, 44px)',
          lineHeight: 1.12,
          letterSpacing: '-0.5px',
          color: 'var(--ink)',
        }}>
          <span className="highlight-yellow">{city}</span>{' '}
          yakınındaki {activeTab === 'etkinlikler' ? 'etkinlikler' : 'topluluklar'}
        </h1>
      </div>

      {/* Kategori şeridi */}
      <div style={{ maxWidth: '1320px', margin: '0 auto', padding: '24px 24px 0' }}>
        <KesfetCategoryStrip
          cats={CATS}
          activeTab={activeTab}
          activeCategory={activeCategory}
        />
      </div>

      {/* Kart grid */}
      <div style={{ maxWidth: '1320px', margin: '0 auto', padding: '28px 24px 64px' }}>
        {activeTab === 'etkinlikler' ? (
          events.length > 0 ? (
            <>
              <div className="kesfet-grid" style={{ display: 'grid', gap: '24px' }}>
                {events.map((ev: any) => (
                  <EventCard key={ev.id} event={ev} showCommunityName={true} />
                ))}
              </div>
              {hasMore && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
                  <Link href={buildNextPageHref()} style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'var(--lime)',
                    color: 'var(--ink)',
                    border: '1.5px solid var(--ink)',
                    textDecoration: 'none',
                    fontSize: '15px',
                    fontWeight: 700,
                    padding: '12px 24px',
                    borderRadius: '999px',
                    boxShadow: '4px 5px 0 var(--ink)',
                  }}>
                    Daha fazla göster
                  </Link>
                </div>
              )}
            </>
          ) : (
            <p style={{ color: 'var(--muted)', fontSize: '15px', padding: '40px 0' }}>
              {searchQuery
                ? `"${searchQuery}" için sonuç bulunamadı.`
                : activeCategory
                ? 'Bu kategoride yaklaşan etkinlik yok.'
                : 'Yaklaşan etkinlik yok.'}
            </p>
          )
        ) : (
          communities.length > 0 ? (
            <>
              <div className="kesfet-grid" style={{ display: 'grid', gap: '24px' }}>
                {communities.map((c: any) => {
                  const cat = findCat(c.category)
                  const memberCount = c.community_members?.[0]?.count ?? 0
                  return (
                    <Link
                      key={c.id}
                      href={`/community/${c.id}`}
                      className="community-card-link"
                      style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
                    >
                      <article style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
                        <div style={{
                          position: 'relative',
                          aspectRatio: '16 / 9',
                          overflow: 'hidden',
                          borderRadius: '14px',
                          background: c.cover_image_url ? 'transparent' : (cat?.soft ?? DEFAULT_SOFT),
                        }}>
                          {c.cover_image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={c.cover_image_url}
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
                            {c.name}
                          </h3>
                          <p style={{
                            fontSize: '13.5px',
                            color: 'var(--muted)',
                            margin: '4px 0 0',
                            lineHeight: 1.4,
                          }}>
                            {cat ? cat.n : ''}{cat && c.city ? ' · ' : ''}{c.city}
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
              {hasMore && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
                  <Link href={buildNextPageHref()} style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'var(--lime)',
                    color: 'var(--ink)',
                    border: '1.5px solid var(--ink)',
                    textDecoration: 'none',
                    fontSize: '15px',
                    fontWeight: 700,
                    padding: '12px 24px',
                    borderRadius: '999px',
                    boxShadow: '4px 5px 0 var(--ink)',
                  }}>
                    Daha fazla göster
                  </Link>
                </div>
              )}
            </>
          ) : (
            <p style={{ color: 'var(--muted)', fontSize: '15px', padding: '40px 0' }}>
              {searchQuery
                ? `"${searchQuery}" için sonuç bulunamadı.`
                : activeCategory
                ? 'Bu kategoride topluluk yok.'
                : 'Henüz topluluk yok.'}
            </p>
          )
        )}

        <style>{`
          .kesfet-grid { grid-template-columns: 1fr; }
          @media (min-width: 640px) {
            .kesfet-grid { grid-template-columns: repeat(2, 1fr); }
          }
          @media (min-width: 1000px) {
            .kesfet-grid { grid-template-columns: repeat(3, 1fr); }
          }
          @media (min-width: 1280px) {
            .kesfet-grid { grid-template-columns: repeat(4, 1fr); }
          }
          .community-card-link:hover .community-title {
            text-decoration: underline;
            text-decoration-thickness: 2px;
            text-underline-offset: 3px;
          }
        `}</style>
      </div>
    </div>
  )
}
