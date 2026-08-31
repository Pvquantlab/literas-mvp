import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import EventCard from '@/components/event-card'
import CommunityCard from '@/components/community-card'
import KesfetTabs from './kesfet-tabs'
import KesfetCategoryStrip from './kesfet-category-strip'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 12

/**
 * Kategori adlari. RENKLER KALDIRILDI: her kategoriye bir `soft` pastel ve bir
 * `ink` vurgu rengi atanmisti -- 14 kategori x 2 = 28 sabit renk, yesilden
 * mora dagilmis. Olculen DNA tek vurgu rengi soyluyor; ayrim renkle degil
 * zemin tonu ve tipografiyle kuruluyor. `ink` zaten olu koddu (serit
 * lib/categories.ts'e gecmisti), `soft` yalnizca topluluk kart kapaginda
 * kullaniliyordu ve o kart artik ortak bilesene devredildi.
 */
const CATS = [
  { n: 'Kitap',      slug: 'kitap' },
  { n: 'Doğa',       slug: 'doğa' },
  { n: 'Müzik',      slug: 'müzik' },
  { n: 'Lezzet',     slug: 'lezzet' },
  { n: 'Dil',        slug: 'dil' },
  { n: 'Spor',       slug: 'spor' },
  { n: 'Sanat',      slug: 'sanat' },
  { n: 'Oyun',       slug: 'oyun' },
  { n: 'Tech',       slug: 'tech' },
  { n: 'Sinema',     slug: 'sinema' },
  { n: 'Fotoğraf',   slug: 'fotoğraf' },
  { n: 'Gönüllülük', slug: 'gönüllülük' },
  { n: 'Kariyer',    slug: 'kariyer' },
  { n: 'Sosyal',     slug: 'sosyal' },
]

// Şehir karşılaştırması için: Türkçe harfleri ASCII'ye indir, küçült.
// DB'deki communities.city_key sütunuyla birebir aynı mantık.
const TR_MAP: Record<string, string> = {
  'İ': 'i', 'I': 'i', 'ı': 'i', 'Ş': 's', 'ş': 's', 'Ğ': 'g', 'ğ': 'g',
  'Ü': 'u', 'ü': 'u', 'Ö': 'o', 'ö': 'o', 'Ç': 'c', 'ç': 'c',
}
function cityKey(s: string): string {
  return s.replace(/[İIıŞşĞğÜüÖöÇç]/g, (m) => TR_MAP[m]).toLowerCase().trim()
}

// textSearch için websearch formatına çevir — kullanıcı boşlukla ayırırsa AND ile arar.
// DİKKAT: aksan SİLİNMEZ. search_vector orijinal metinden üretiliyor;
// 'doğa' -> 'dok', 'doga' -> 'dogu' köküne iniyor, eşleşmiyorlar.
function buildSearchQuery(q: string): string {
  // Postgres websearch operatörlerini escape et (', ", :, &, |, !, <, >, (, ))
  return q.replace(/['":&|!<>()]/g, ' ').split(/\s+/).filter(Boolean).join(' ')
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
  // Şehir yalnızca params.city geldiğinde sorguya uygulanıyor (aşağıda).
  // Başlık da bunu izlemeli; eskiden filtre yokken "İstanbul yakınındaki"
  // yazıp tüm Türkiye'yi listeliyordu.
  const city = params.city?.trim() || null
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
        .from('etkinlik_vitrin')
        .select('id, title, event_date, location, cover_image_url, series_id, seri_disina_alindi_at, community:communities!inner(id, name, category, city, status)')
        .gte('event_date', new Date().toISOString())
        .eq('community.status', 'approved')
        .order('event_date', { ascending: true })
        // Bir fazlasını iste: "daha fazla var mı" sorusunu satır sayısıyla
        // değil, fazladan gelen satırla cevaplıyoruz. Eskiden son sayfa tam
        // 12 kayıtla dolduğunda buton görünüyor, tıklayınca boş sayfa geliyordu.
        .range(rangeFrom, rangeTo + 1)

      if (communityIds) query = query.in('community_id', communityIds)
      // Şehir filtresi: yalnızca açıkça city parametresi geldiyse uygula
      if (city) {
        const ck = cityKey(city)
        if (ck) query = query.ilike('community.city_key', `%${escapeIlike(ck)}%`)
      }
      if (searchQuery) {
        const q = buildSearchQuery(searchQuery)
        if (q) query = query.textSearch('search_vector', q, { config: 'turkish', type: 'websearch' })
      }

      const { data, error } = await query
      if (error) console.error('kesfet arama hatasi:', error)
      const rows = data ?? []
      hasMore = rows.length > PAGE_SIZE
      events = rows.slice(0, PAGE_SIZE)
    }
  } else {
    let query = supabase
      .from('communities')
      .select('id, name, category, description, cover_image_url, city, created_at, community_members(count)')
      .eq('status', 'approved')
      .eq('community_members.status', 'approved')
      .order('created_at', { ascending: false })
      .range(rangeFrom, rangeTo + 1)

    if (activeCategory) query = query.eq('category', activeCategory)
    // Şehir filtresi (etkinlikler sekmesiyle aynı kural)
    if (city) {
      const ck = cityKey(city)
      if (ck) query = query.ilike('city_key', `%${escapeIlike(ck)}%`)
    }
    if (searchQuery) {
      const q = buildSearchQuery(searchQuery)
      if (q) query = query.textSearch('search_vector', q, { config: 'turkish', type: 'websearch' })
    }

    const { data, error } = await query
    if (error) console.error('kesfet arama hatasi:', error)
    const rows = data ?? []
    hasMore = rows.length > PAGE_SIZE
    communities = rows.slice(0, PAGE_SIZE)
  }

  // Seri rozeti: görüntülenen etkinliklerin ait olduğu serilerin kalan
  // buluşma sayısı, tek round-trip'te. Dizi boşsa RPC hiç çağrılmaz.
  const seriIdler = [...new Set(events.map((e) => e.series_id).filter(Boolean))]
  const { data: kalanRows, error: kalanError } = (seriIdler.length
    ? await supabase.rpc('seri_kalanlar', { p_series_ids: seriIdler })
    : { data: [], error: null }) as {
      data: { series_id: string; kalan: number; frekans: string }[] | null
      error: { message: string } | null
    }
  if (kalanError) console.error('[kesfet] seri kalanlar alinamadi:', kalanError)
  const kalanMap = new Map<string, { kalan: number; frekans: string }>(
    (kalanRows ?? []).map((r) => [r.series_id, { kalan: r.kalan, frekans: r.frekans }])
  )

  // "Daha fazla göster" için sonraki sayfanın URL'i (mevcut parametreleri koru)
  const buildNextPageHref = () => {
    const p = new URLSearchParams()
    if (activeTab === 'topluluklar') p.set('tab', 'topluluklar')
    if (activeCategory) p.set('kategori', activeCategory)
    if (searchQuery) p.set('q', searchQuery)
    if (city) p.set('city', city)
    p.set('page', String(activePage + 1))
    return `/kesfet?${p.toString()}`
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      {/* Promo bandı — eski hâli #E9F4C2 zemin, #D9E8A6 çizgi, #54702F yıldızdı;
          üçü de Temmuz'un lime paletinden ve sayfanın ilk gördüğün şeyiydi. */}
      <div style={{ background: 'var(--paper-cream)' }}>
        <div style={{
          maxWidth: '1320px',
          margin: '0 auto',
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}>
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '10px',
            letterSpacing: '.16em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
            flex: '0 0 auto',
          }}>
            Duyuru
          </span>
          <p style={{ margin: 0, flex: '1 1 auto', fontSize: '16px', minWidth: 0, color: 'var(--night)' }}>
            Kendi topluluğunu oluştur ve etkinlik düzenlemeye bugün başla.
          </p>
          <Link href="/community/new" className="btn-secondary btn-sm" style={{ flex: '0 0 auto' }}>
            Şimdi başla
          </Link>
        </div>
      </div>

      {/* Sekmeler */}
      <div style={{ maxWidth: '1320px', margin: '0 auto', padding: '28px 24px 0' }}>
        <KesfetTabs
          activeTab={activeTab}
          activeCategory={activeCategory}
          query={params.q ?? null}
          city={city}
        />
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
        {/* Serif / 600 / -0.5px ve .highlight-yellow bandı kaldırıldı.
            Etkinlik detayındaki başlıkla aynı ölçü: sayfanın öznesi olduğu
            için 24px'i aşıyor, ağırlık ve harf aralığı DNA'dan. */}
        <h1 style={{
          margin: 0,
          fontFamily: 'var(--font-serif), Georgia, serif',
          fontWeight: 400,
          fontSize: 'clamp(26px, 3.2vw, 40px)',
          lineHeight: 1.16,
          letterSpacing: '.02em',
          color: 'var(--ink)',
        }}>
          {city
            ? `${city} yakınındaki ${activeTab === 'etkinlikler' ? 'etkinlikler' : 'topluluklar'}`
            : `Tüm ${activeTab === 'etkinlikler' ? 'etkinlikler' : 'topluluklar'}`}
        </h1>
      </div>

      {/* Kategori şeridi */}
      <div style={{ maxWidth: '1320px', margin: '0 auto', padding: '24px 24px 0' }}>
        <KesfetCategoryStrip
          cats={CATS}
          activeTab={activeTab}
          activeCategory={activeCategory}
          query={params.q ?? null}
          city={city}
        />
      </div>

      {/* Kart grid */}
      <div style={{ maxWidth: '1320px', margin: '0 auto', padding: '28px 24px 64px' }}>
        {activeTab === 'etkinlikler' ? (
          events.length > 0 ? (
            <>
              <div className="kesfet-grid" style={{ display: 'grid', gap: '24px' }}>
                {events.map((ev: any) => (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    showCommunityName={true}
                    seriKalan={ev.seri_disina_alindi_at ? null : kalanMap.get(ev.series_id)?.kalan}
                    frekans={ev.seri_disina_alindi_at ? null : kalanMap.get(ev.series_id)?.frekans}
                  />
                ))}
              </div>
              {hasMore && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
                  <Link href={buildNextPageHref()} className="btn-secondary">
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
                {/* Bu blok components/community-card.tsx'in ikinci, elle yazilmis
                    kopyasiydi: 14px kose, 800 agirlik, negatif harf araligi.
                    Ana sayfadaki karti DNA'ya hizaladigimda buraya hic
                    ulasmamisti -- iki kopya kacinilmaz olarak ayrisiyor.
                    Artik tek bilesen; bir duzeltme her iki yuzeyi de kapsiyor.
                    founder_name / upcoming_count bu sorguda yok, ikisi de
                    istege bagli: rozetler sessizce gizleniyor. */}
                {communities.map((c: any) => (
                  <CommunityCard
                    key={c.id}
                    community={{
                      id: c.id,
                      name: c.name,
                      city: c.city,
                      category: c.category,
                      cover_image_url: c.cover_image_url,
                      member_count: c.community_members?.[0]?.count ?? 0,
                    }}
                  />
                ))}
              </div>
              {hasMore && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
                  <Link href={buildNextPageHref()} className="btn-secondary">
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
