import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { CATEGORIES, bySlug, sanitizeQuery } from '@/lib/categories'
import CategoryIcon from '@/components/category-icon'
import CommunityCard, { type CommunitySummary } from '@/components/community-card'
import UpcomingEvents, { type EventSummary } from '@/components/upcoming-events'
import EventCard from '@/components/event-card'
import SearchBox from './search-box'
import CityFilter from './city-filter'

export const revalidate = 60

type SearchParams = { category?: string; city?: string; q?: string }

/* ---------------------------------------------------------------------- */

function CategoryStrip({
  activeSlug,
  buildHref,
}: {
  activeSlug: string | null
  buildHref: (slug: string | null) => string
}) {
  return (
    <nav className="cat-strip" aria-label="Kategoriler">
      <Link href={buildHref(null)} className="cat-chip" aria-current={!activeSlug}>
        Tümü
      </Link>
      {CATEGORIES.map((c) => (
        <Link
          key={c.slug}
          href={buildHref(c.slug)}
          className="cat-chip"
          aria-current={activeSlug === c.slug}
        >
          <CategoryIcon slug={c.slug} size={17} />
          {c.label}
        </Link>
      ))}
    </nav>
  )
}

function SectionHead({
  title,
  href,
  linkLabel,
}: {
  title: React.ReactNode
  href?: string
  linkLabel?: string
}) {
  return (
    <div
      className="row"
      style={{ justifyContent: 'space-between', gap: 'var(--s-4)', marginBottom: 'var(--s-5)' }}
    >
      <h2 className="h-section">{title}</h2>
      {href && (
        <Link href={href} style={{ fontSize: 'var(--t-sm)', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
          {linkLabel} →
        </Link>
      )}
    </div>
  )
}

/* ---------------------------------------------------------------------- */

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const activeSlug = params.category ?? null
  const activeCategory = bySlug(activeSlug)
  const activeCity = params.city ?? null
  const activeQuery = sanitizeQuery(params.q)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const buildHref = (slug: string | null) => {
    const p = new URLSearchParams()
    if (slug) p.set('category', slug)
    if (activeCity) p.set('city', activeCity)
    if (params.q) p.set('q', params.q)
    const s = p.toString()
    return s ? `/?${s}` : '/'
  }

  /* --- Topluluk sorgusu --------------------------------------------- */

  let communityQuery = supabase
    .from('communities')
    .select('id, name, city, category, cover_image_url, member_count')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(24)

  if (activeCategory) communityQuery = communityQuery.eq('category', activeCategory.value)
  if (activeCity) communityQuery = communityQuery.eq('city', activeCity)
  if (activeQuery) communityQuery = communityQuery.ilike('name', `%${activeQuery}%`)

  /* --- Etkinlik sorgusu ---------------------------------------------
     Bu sorgu eskiden sadece giriş yapmış kullanıcı için çalışıyordu.
     Artık herkes için çalışıyor — ana sayfanın asıl içeriği bu.        */

  /**
   * !inner önemli: normal (left) join'de şehir filtresi ana satırları
   * elemez, sadece ilişkili satırı null yapar. !inner ile gerçek filtre olur.
   *
   * price sütunu şemanda yoksa select'ten çıkar — Supabase bilinmeyen
   * sütunda hata döndürür, sessizce boş liste değil.
   */
  let eventQuery = supabase
    .from('events')
    .select(
      'id, title, event_date, location, cover_image_url, community:communities!inner(name, category, city)'
    )
    .gte('event_date', new Date().toISOString())
    .order('event_date', { ascending: true })
    .limit(12)

  if (activeCity) eventQuery = eventQuery.eq('community.city', activeCity)

  /* --- Sorguları paralel çalıştır ------------------------------------
     Eskiden art arda await ediliyordu; her biri diğerini bekliyordu.   */

  const [communityRes, eventRes, cityRes] = await Promise.all([
    communityQuery,
    eventQuery,
    supabase.from('communities').select('city').eq('status', 'approved').not('city', 'is', null),
  ])

  // Sorgu hatasini yut ma. Eskiden hata olsa bile bos liste gorunuyordu
  // ve ekranda "veri yok" yaziyordu — gercekte sorgu patlamis oluyordu.
  if (communityRes.error) console.error('[anasayfa] topluluk sorgusu:', communityRes.error.message)
  if (eventRes.error) console.error('[anasayfa] etkinlik sorgusu:', eventRes.error.message)
  if (cityRes.error) console.error('[anasayfa] sehir sorgusu:', cityRes.error.message)

  const communities = (communityRes.data ?? []) as CommunitySummary[]
  const events = (eventRes.data ?? []) as unknown as EventSummary[]
  const cities = Array.from(new Set((cityRes.data ?? []).map((r) => r.city as string))).sort(
    (a, b) => a.localeCompare(b, 'tr')
  )

  const cityLabel = activeCity ?? 'İstanbul'
  const hasFilter = Boolean(activeSlug || activeCity || activeQuery)

  /* =================================================================
     GİRİŞ YAPMIŞ KULLANICI
     ================================================================= */

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, name, avatar_url')
      .eq('id', user.id)
      .maybeSingle()

    const [membershipRes, rsvpRes] = await Promise.all([
      supabase
        .from('community_members')
        .select('community:communities(id, name)')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .limit(6),
      supabase
        .from('rsvps')
        .select('event:events(id, title, event_date)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    const myCommunities = (membershipRes.data ?? [])
      .map((m) => m.community as unknown as { id: string; name: string })
      .filter(Boolean)
    const myRsvps = (rsvpRes.data ?? [])
      .map((r) => r.event as unknown as { id: string; title: string; event_date: string })
      .filter(Boolean)

    const initials = profile?.name
      ? profile.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
      : '?'

    return (
      <main id="content" className="container" style={{ maxWidth: 'var(--w-page)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s-6)', alignItems: 'flex-start' }}>
          {/* ---- Kenar çubuğu ---- */}
          <aside
            className="home-sidebar stack"
            style={{ flex: '1 1 260px', maxWidth: 300, minWidth: 240, gap: 'var(--s-4)' }}
          >
            <Link
              href={`/profile/${user.id}`}
              className="card row"
              style={{ gap: 'var(--s-3)', padding: 'var(--s-4)', flexDirection: 'row' }}
            >
              <span
                aria-hidden="true"
                className="mono"
                style={{
                  width: 42, height: 42, borderRadius: '50%',
                  background: 'var(--paper-soft)',
                  display: 'grid', placeItems: 'center',
                  fontSize: 14, color: 'var(--ink)', flexShrink: 0,
                  backgroundImage: profile?.avatar_url ? `url(${profile.avatar_url})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                {profile?.avatar_url ? '' : initials}
              </span>
              <span className="stack" style={{ minWidth: 0 }}>
                <span style={{ fontSize: 'var(--t-md)', fontWeight: 600, color: 'var(--ink)' }}>
                  {profile?.name ?? 'Profilim'}
                </span>
                <span className="eyebrow">Profili gör</span>
              </span>
            </Link>

            <div className="card" style={{ padding: 'var(--s-4)' }}>
              <h2 style={{ fontSize: 'var(--t-md)', fontWeight: 600, marginBottom: 'var(--s-3)' }}>
                Gidiyorum
              </h2>
              {myRsvps.length > 0 ? (
                <ul className="stack" style={{ listStyle: 'none', gap: 'var(--s-3)' }}>
                  {myRsvps.map((ev) => (
                    <li key={ev.id}>
                      <Link href={`/event/${ev.id}`} className="stack" style={{ gap: 2 }}>
                        <span className="mono" style={{ fontSize: 'var(--t-2xs)', color: 'var(--coral)' }}>
                          {new Date(ev.event_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.3 }}>{ev.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <>
                  <p style={{ fontSize: 'var(--t-sm)', color: 'var(--muted)', marginBottom: 'var(--s-4)' }}>
                    Henüz bir etkinliğe katılmadın.
                  </p>
                  <Link href="/kesfet" className="btn-primary btn-sm">Etkinlikleri bul</Link>
                </>
              )}
            </div>

            <div className="card" style={{ padding: 'var(--s-4)' }}>
              <h2 style={{ fontSize: 'var(--t-md)', fontWeight: 600, marginBottom: 'var(--s-3)' }}>
                Toplulukların
              </h2>
              {myCommunities.length > 0 ? (
                <ul className="stack" style={{ listStyle: 'none', gap: 'var(--s-2)' }}>
                  {myCommunities.map((c) => (
                    <li key={c.id}>
                      <Link href={`/community/${c.id}`} style={{ fontSize: 14, fontWeight: 500 }}>
                        {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <>
                  <p style={{ fontSize: 'var(--t-sm)', color: 'var(--muted)', marginBottom: 'var(--s-4)' }}>
                    Tutkularını paylaşan insanlarla aynı masaya otur.
                  </p>
                  <Link href="/kesfet" className="btn-secondary btn-sm">Toplulukları keşfet</Link>
                </>
              )}
            </div>
          </aside>

          {/* ---- Ana alan ---- */}
          <div style={{ flex: '3 1 460px', minWidth: 0 }}>
            {events.length > 0 && (
              <section style={{ marginBottom: 'var(--s-8)' }}>
                <SectionHead title="Senin için" href="/kesfet" linkLabel="Tümünü gör" />
                <div className="grid-communities">
                  {events.slice(0, 4).map((ev) => (
                    <EventCard key={ev.id} event={{ ...ev, location: ev.location || "" }} showCommunityName />
                  ))}
                </div>
              </section>
            )}

            <section>
              <SectionHead title="Topluluklar" />
              <div className="row" style={{ gap: 'var(--s-3)', marginBottom: 'var(--s-5)', flexWrap: 'wrap' }}>
                <SearchBox initialQuery={params.q ?? ''} />
                <CityFilter cities={cities} activeCity={activeCity ?? ''} />
              </div>

              {communities.length > 0 ? (
                <div className="grid-communities">
                  {communities.map((c) => <CommunityCard key={c.id} community={c} />)}
                </div>
              ) : (
                <div className="empty-state">
                  <p>{hasFilter ? 'Bu filtreye uygun topluluk yok.' : 'Henüz topluluk yok.'}</p>
                  <Link href="/community/new" className="btn-primary btn-sm">Topluluk kur</Link>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    )
  }

  /* =================================================================
     MİSAFİR
     ================================================================= */

  return (
    <main id="content">
      {/* ---- Hero: sola hizalı, sağda gerçek etkinlikler ---- */}
      <section className="container" style={{ paddingBlock: 0 }}>
       <div className="hero hero-solo">
          <div>
            <span className="badge-mono" style={{ marginBottom: 'var(--s-5)' }}>
              her zaman açık · herkese göre
            </span>

            <h1
              className="serif"
              style={{
                fontSize: 'var(--t-display)',
                color: 'var(--ink)',
                marginBottom: 'var(--s-4)',
              }}
            >
              Harflerden kelimeler,<br />
              insanlardan <span className="highlight-yellow">topluluklar</span>.
            </h1>

            <p style={{ fontSize: 'var(--t-lg)', color: 'var(--muted)', marginBottom: 'var(--s-6)', maxWidth: '44ch' }}>
              {cityLabel}&apos;da bu hafta {events.length > 0 ? `${events.length} buluşma var` : 'buluşmalar başlıyor'}.
              Katıl ya da kendi masanı kur.
            </p>

            <div className="row" style={{ gap: 'var(--s-3)', flexWrap: 'wrap' }}>
              <Link href="#etkinlikler" className="btn-primary">Etkinlikleri gör</Link>
              <Link href="/community/new" className="btn-secondary">Topluluk kur</Link>
            </div>
          </div>

         
        </div>
      </section>

      {/* ---- Kategori çipleri ---- */}
      <section className="container section-tight" style={{ paddingBlock: 'var(--s-4)' }}>
        <CategoryStrip activeSlug={activeSlug} buildHref={buildHref} />
      </section>

      {/* ---- Yaklaşan etkinlikler: sayfanın asıl işi ---- */}
      <section id="etkinlikler" className="container section">
        <SectionHead
          title={<><span className="highlight-yellow">{cityLabel}</span>&apos;da yaklaşanlar</>}
          href="/kesfet"
          linkLabel="Tüm etkinlikler"
        />
        <UpcomingEvents events={events} />
      </section>

      {/* ---- Topluluklar ---- */}
      <section className="container section" style={{ paddingTop: 0 }}>
        <SectionHead title="Topluluklar" />
        <div className="row" style={{ gap: 'var(--s-3)', marginBottom: 'var(--s-5)', flexWrap: 'wrap' }}>
          <SearchBox initialQuery={params.q ?? ''} />
          <CityFilter cities={cities} activeCity={activeCity ?? ''} />
        </div>

        {communities.length > 0 ? (
          <div className="grid-communities">
            {communities.map((c) => <CommunityCard key={c.id} community={c} />)}
          </div>
        ) : (
          <div className="empty-state">
            <p>{hasFilter ? 'Bu filtreye uygun topluluk yok.' : 'Henüz topluluk yok.'}</p>
            <Link href="/community/new" className="btn-primary btn-sm">Topluluk kur</Link>
          </div>
        )}
      </section>

      {/* ---- Nasıl çalışır ---- */}
      <section className="container section" style={{ paddingTop: 0 }}>
        <SectionHead title="Nasıl çalışır" />
        <ol
          style={{
            display: 'grid',
            gap: 'var(--s-5)',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            listStyle: 'none',
          }}
        >
          {[
            ['Bir masa aç', 'Konu, şehir, isim. Topluluk kurmak iki dakika.'],
            ['Buluşmayı planla', 'Tarih ve yer gir. Bağlantıyı paylaş, katılımı gör.'],
            ['Tanışın', 'İnsanlar gelir. Gerisi kahvenin işi.'],
          ].map(([title, body], i) => (
            <li key={title} className="stack" style={{ gap: 'var(--s-2)' }}>
              <span
                className="mono"
                style={{
                  width: 30, height: 30, borderRadius: '50%',
                  border: '1.5px solid var(--ink)',
                  display: 'grid', placeItems: 'center',
                  fontSize: 'var(--t-xs)', color: 'var(--ink)',
                }}
              >
                {i + 1}
              </span>
              <h3 style={{ fontSize: 'var(--t-lg)', fontWeight: 600, color: 'var(--ink)' }}>{title}</h3>
              <p style={{ fontSize: 'var(--t-sm)', color: 'var(--muted)' }}>{body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---- Kapanış CTA ---- */}
      <section className="container section" style={{ paddingTop: 0 }}>
        <div
          style={{
            background: 'var(--ink)',
            borderRadius: 'var(--r-lg)',
            padding: 'var(--s-8) var(--s-5)',
            textAlign: 'center',
          }}
        >
          <h2
            className="serif"
            style={{ fontSize: 'var(--t-3xl)', color: 'var(--paper-cream)', marginBottom: 'var(--s-3)' }}
          >
            Bir <em>masa</em> aç.<br />Gerisini birlikte kuralım.
          </h2>
          <p className="mono" style={{ fontSize: 'var(--t-sm)', color: 'var(--lime)', marginBottom: 'var(--s-6)' }}>
            topluluk kurmak 2 dakika sürer · başlaman yeter
          </p>
          <Link href="/community/new" className="btn-primary">Topluluk kur</Link>
        </div>
      </section>
    </main>
  )
}
