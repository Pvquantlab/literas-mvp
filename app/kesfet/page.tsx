import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import EventCard from '@/components/event-card'
import CommunityCard from '@/components/community-card'
import KesfetTabs from './kesfet-tabs'
import KesfetCategoryStrip from './kesfet-category-strip'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 12

const CATS = [
  { n: 'Kitap',      slug: 'kitap' },
  { n: 'Doğa',       slug: 'doğa' },
  { n: 'Müzik',      slug: 'müzik' },
  { n: 'Lezzet',     slug: 'lezzet' },
  { n: 'Dil',        slug: 'dil' },
  { n: 'Spor',       slug: 'spor' },
  { n: 'Sanat',      slug: 'sanat' },
  { n: 'Oyun',       slug: 'oyun' },
  { n: 'Teknoloji',  slug: 'tech' },
  { n: 'Sinema',     slug: 'sinema' },
  { n: 'Fotoğraf',   slug: 'fotoğraf' },
  { n: 'Gönüllülük', slug: 'gönüllülük' },
  { n: 'Kariyer',    slug: 'kariyer' },
  { n: 'Sosyal',     slug: 'sosyal' },
]

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
  return normalized.replace(/['":&|!<>()]/g, ' ').split(/\s+/).filter(Boolean).join(' ')
}

// ilike'da wildcard yorumlanmaması için kullanıcı girdisini escape et
function escapeIlike(s: string): string {
  return s.replace(/[%_\\]/g, (m) => '\\' + m)
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
        .select('id, title, event_date, location, cover_image_url, max_attendees, rsvps(count), community:communities!inner(id, name, category, city, status)')
        .gte('event_date', new Date().toISOString())
        .eq('community.status', 'approved')
        .order('event_date', { ascending: true })
        .range(rangeFrom, rangeTo)

      if (communityIds) query = query.in('community_id', communityIds)
      // Şehir filtresi: yalnızca açıkça city parametresi geldiyse uygula
      if (params.city) query = query.ilike('community.city', escapeIlike(params.city))
      if (searchQuery) {
        const q = buildSearchQuery(searchQuery)
        if (q) query = query.textSearch('search_vector', q, { config: 'turkish', type: 'websearch' })
      }

      const { data, error } = await query
      if (error) console.error('kesfet arama hatasi:', error)
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
    // Şehir filtresi (etkinlikler sekmesiyle aynı kural)
    if (params.city) query = query.ilike('city', escapeIlike(params.city))
    if (searchQuery) {
      const q = buildSearchQuery(searchQuery)
      if (q) query = query.textSearch('search_vector', q, { config: 'turkish', type: 'websearch' })
    }

    const { data, error } = await query
    if (error) console.error('kesfet arama hatasi:', error)
    communities = (data ?? []).map((c: any) => ({
      ...c,
      memberCount: c.community_members?.[0]?.count ?? 0,
    }))
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

  const hasFilter = Boolean(activeCategory || searchQuery || params.city)

  return (
    <div className="min-h-screen">
      {/* Promo bandı */}
      <div className="border-b border-[#F3D9C8] bg-brand-tint">
        <div className="mx-auto flex max-w-[1120px] items-center gap-3.5 px-6 py-[9px]">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand text-[10px] font-black text-white">✳</span>
          <p className="min-w-0 flex-1 text-[14.5px] font-medium text-ink">
            Kendi topluluğunu oluştur ve etkinlik düzenlemeye bugün başla!
          </p>
          <Link
            href="/community/new"
            className="shrink-0 rounded-full bg-brand px-4 py-[7px] text-[13px] font-bold text-white transition hover:bg-brand-dark"
          >
            Şimdi başla
          </Link>
        </div>
      </div>

      {/* Sekmeler */}
      <div className="mx-auto max-w-[1120px] px-6 pt-7">
        <KesfetTabs activeTab={activeTab} activeCategory={activeCategory} />
      </div>

      {/* Başlık */}
      <div className="mx-auto max-w-[1120px] px-6 pt-[22px]">
        <h1 className="text-[30px] font-extrabold leading-[1.12] tracking-[-0.8px] text-ink min-[640px]:text-[40px] min-[640px]:tracking-[-1.2px]">
          <span className="text-brand">{city}</span>{' '}
          yakınındaki {activeTab === 'etkinlikler' ? 'etkinlikler' : 'topluluklar'}
        </h1>
      </div>

      {/* Kategori şeridi */}
      <div className="mx-auto max-w-[1120px] px-6 pt-6">
        <KesfetCategoryStrip
          cats={CATS}
          activeTab={activeTab}
          activeCategory={activeCategory}
        />
      </div>

      {/* Kart grid */}
      <div className="mx-auto max-w-[1120px] px-6 pb-16 pt-7">
        {activeTab === 'etkinlikler' ? (
          events.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {events.map((ev: any) => (
                  <EventCard key={ev.id} event={ev} showCommunityName={true} />
                ))}
              </div>
              {hasMore && (
                <div className="mt-10 flex justify-center">
                  <Link
                    href={buildNextPageHref()}
                    className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-[15px] font-bold text-white transition hover:-translate-y-px hover:bg-brand-dark hover:shadow-md"
                  >
                    Daha fazla göster
                  </Link>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#D9D0BE] bg-white px-6 py-16 text-center">
              <p className="mb-2 text-[17px] font-bold text-ink">
                {searchQuery
                  ? `"${searchQuery}" için sonuç bulunamadı.`
                  : activeCategory
                  ? 'Bu kategoride yaklaşan etkinlik yok.'
                  : 'Yaklaşan etkinlik yok.'}
              </p>
              <p className="mb-6 text-[14.5px] text-mute">
                {hasFilter
                  ? 'Filtreyi değiştirerek tekrar dene.'
                  : 'Takvim ilk etkinlikle dolacak — ilkini sen düzenleyebilirsin.'}
              </p>
              {!hasFilter && (
                <Link
                  href="/community/new"
                  className="inline-flex rounded-full bg-brand px-6 py-3 text-[15px] font-bold text-white transition hover:-translate-y-px hover:bg-brand-dark"
                >
                  Topluluk kur →
                </Link>
              )}
            </div>
          )
        ) : (
          communities.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {communities.map((c: any) => (
                  <CommunityCard key={c.id} community={c} />
                ))}
              </div>
              {hasMore && (
                <div className="mt-10 flex justify-center">
                  <Link
                    href={buildNextPageHref()}
                    className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-[15px] font-bold text-white transition hover:-translate-y-px hover:bg-brand-dark hover:shadow-md"
                  >
                    Daha fazla göster
                  </Link>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#D9D0BE] bg-white px-6 py-16 text-center">
              <p className="mb-2 text-[17px] font-bold text-ink">
                {searchQuery
                  ? `"${searchQuery}" için sonuç bulunamadı.`
                  : activeCategory
                  ? 'Bu kategoride topluluk yok.'
                  : 'Henüz topluluk yok.'}
              </p>
              <p className="mb-6 text-[14.5px] text-mute">
                {hasFilter
                  ? 'Filtreyi değiştirerek tekrar dene.'
                  : 'Bu sayfa ilk toplulukla dolmaya başlayacak — o sen olabilirsin.'}
              </p>
              {!hasFilter && (
                <Link
                  href="/community/new"
                  className="inline-flex rounded-full bg-brand px-6 py-3 text-[15px] font-bold text-white transition hover:-translate-y-px hover:bg-brand-dark"
                >
                  İlk topluluğu sen kur →
                </Link>
              )}
            </div>
          )
        )}
      </div>
    </div>
  )
}
