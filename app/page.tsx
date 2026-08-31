import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { bySlug, sanitizeQuery, CATEGORIES } from '@/lib/categories'
import { DevLogotype } from '@/components/kunye'
import { RolyefKap, RolyefMasa, RolyefKahve, RolyefKitap, RolyefSehir } from '@/components/rolyef'
import { formatDayMonthShort } from '@/lib/date'
import { bulunmaHali } from '@/lib/turkce'
import CategoryStrip from './category-strip'
import HowItWorks from '@/components/how-it-works'
import ClosingCta from '@/components/closing-cta'
import CommunityCard, { type CommunitySummary } from '@/components/community-card'
import UpcomingEvents, { type EventSummary } from '@/components/upcoming-events'
import EventCard from '@/components/event-card'
import SearchBox from './search-box'
import CityFilter from './city-filter'

export const revalidate = 60

/* --- Künye ızgarasının iki stil sabiti -------------------------------
   week.wild.plus ölçümünden: etiketler minik/büyük harf/harf arası açık,
   hücreler sıkı dolgulu, 4px köşe, gölge ve border YOK. */
const kunyeEtiket = {
  font: "400 10px 'IBM Plex Mono', monospace",
  letterSpacing: '.16em',
  textTransform: 'uppercase',
  color: 'var(--ink)',
} as const

const kunyeHucre = {
  background: 'var(--paper-cream)',
  borderRadius: 4,
  padding: '18px 20px',
  display: 'flex',
  flexDirection: 'column',
} as const


type SearchParams = { category?: string; city?: string; q?: string }

/* ---------------------------------------------------------------------- */

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
    .from('etkinlik_vitrin')
    .select(
      'id, title, event_date, location, cover_image_url, series_id, community:communities!inner(name, category, city)'
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

  // Şehir filtresi yokken sorgu TÜM Türkiye'yi getiriyor. Eskiden başlık yine
  // de "İstanbul" yazıyordu — kullanıcıya yanlış bilgi veriyordu.
  const cityLocative = bulunmaHali(activeCity)
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
                          {formatDayMonthShort(ev.event_date)}
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
               <div className="grid-communities grid-narrow">
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
<div className="grid-communities grid-narrow">                  {communities.map((c) => <CommunityCard key={c.id} community={c} />)}
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
      {/* ---- Künye ızgarası ----
           week.wild.plus/athens-26 uyarlaması (docs/tasarim/wild-week-dna.json).

           DÜZELTME: ilk sürümde DOM ölçümüne bakıp "illüstrasyon yok, en büyük
           metin 24px" sonucuna varıp nesneleri TAMAMEN kaldırmıştım. Ekran
           görüntüsü tersini gösterdi — ölçüm metni ve CSS'i görüyor, GÖRSELİ
           görmüyor:
             · dev "WILD WEEK" yazısı metin değil SVG, o yüzden ölçüme takılmadı
             · her hücre büyük, tek renk bir KABARTMA taşıyor; sayfanın
               güzelliğinin çoğu bu
           Doğrusu: dev logotype + büyük sessiz illüstrasyon + minik yazı.

           Kabartmaların karşılığı olarak mevcut kategori şekilleri dev ve
           soluk kullanılıyor — yeni bir çizim seti üretmedik, var olan
           kimliğin ölçeği ve sesi değişti. */}

      {/* Satır 1: dev logotype, tam genişlik. Arkasında soluk bir şekil —
          referansta "WILD WEEK"in arkasındaki vazonun karşılığı. */}
      <section
        id="sis-logotype"
        aria-label="literaslab"
        style={{
          ...kunyeHucre,
          position: 'relative',
          overflow: 'hidden',
          margin: '8px 8px 0',
          padding: 'clamp(28px, 5vw, 64px) 20px',
          justifyContent: 'center',
        }}
      >
        <RolyefKap cizim={RolyefMasa} konum="orta" olcek={0.62} opaklik={0.10} />
        <div style={{ position: 'relative' }}>
          <DevLogotype />
        </div>
      </section>

      <section
        id="sis-hero"
        aria-label="Giriş"
        style={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 8,
          padding: 8,
        }}
      >
        {/* Hücre 1: içerik ALTA yaslı, üstü bilerek boş */}
        <div
          className="reveal"
          style={{
            ...kunyeHucre,
            minHeight: 380,
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <RolyefKap cizim={RolyefKitap} konum="sag-alt" olcek={1.05} opaklik={0.14} />
          <span style={{ ...kunyeEtiket, position: 'relative' }}>literaslab · İstanbul</span>
          <h1 style={{ margin: 0 }}>
            <span
              style={{
                display: 'block',
                fontSize: 24,
                fontWeight: 400,
                letterSpacing: '.04em',
                lineHeight: 1.2,
                color: 'var(--ink)',
              }}
            >
              İnsanların kendi masalarını kurduğu yer.
            </span>
            <span
              style={{
                display: 'block',
                fontSize: 16,
                fontWeight: 400,
                lineHeight: 1.5,
                color: 'var(--ink)',
                marginTop: 14,
              }}
            >
              {cityLocative ? `${cityLocative} ` : ''}
              {events.length > 0
                ? `yaklaşan ${events.length} buluşma var`
                : 'buluşmalar başlıyor'}
              . Katıl ya da kendi masanı kur.
            </span>
          </h1>
        </div>

        {/* Hücre 2: GERÇEKLER — referansın "THE FACTS" bloğu, tek harfli
            alan etiketleriyle. */}
        <div className="reveal" style={{ ...kunyeHucre, minHeight: 380, position: 'relative', overflow: 'hidden' }}>
          <RolyefKap cizim={RolyefSehir} konum="sag-alt" olcek={1.0} opaklik={0.12} />
          {/* İÇ PANEL. Referansın "The Facts" kutusu kartın İÇİNDE ikinci bir
              yüzey: #E8E8E8, 4px köşe, 24px dolgu (394x394 ölçüldü). Çift
              çerçeve etkisini, yani o müze etiketi hissini bu veriyor ve
              bende hiç yoktu. Ayrım gölgeyle değil bu katmanla kuruluyor. */}
          <div style={{
            position: 'relative',
            background: 'var(--panel)',
            borderRadius: 'var(--r-md)',
            padding: 24,
          }}>
          <span style={{ ...kunyeEtiket, display: 'block', marginBottom: 22 }}>Gerçekler</span>
          <dl style={{ margin: 0, display: 'grid', gap: 10 }}>
            {[
              ['T', 'Topluluk', String(communities.length)],
              ['E', 'Etkinlik', String(events.length)],
              ['Ş', 'Şehir', String(cities.length)],
              ['K', 'Kategori', String(CATEGORIES.length)],
            ].map(([harf, ad, deger]) => (
              <div
                key={ad}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '20px 1fr auto',
                  gap: 10,
                  alignItems: 'baseline',
                }}
              >
                <dt style={{ ...kunyeEtiket, color: 'var(--muted-light)' }}>{harf}.</dt>
                <dd style={{ margin: 0, fontSize: 16 }}>{ad}</dd>
                <dd className="sayi" style={{ margin: 0, fontSize: 16, color: 'var(--ink)' }}>{deger}</dd>
              </div>
            ))}
          </dl>
          </div>
        </div>

        {/* Hücre 3: davet. Referansın karşılama paragrafı BÜYÜK HARF. */}
        {/* Referansta karşılama paragrafı MAVİ SÜTUN üstünde beyaz metin —
            ekranda tek dolu mavi alan o. Aynı rol burada. */}
        <div
          className="reveal"
          style={{
            ...kunyeHucre,
            minHeight: 380,
            justifyContent: 'center',
            background: 'var(--ink)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Mavi zeminde rölyef BEYAZ. */}
          <RolyefKap cizim={RolyefKahve} konum="sag-alt" olcek={1.0} opaklik={0.18} renk="#fff" />
          <p
            style={{
              fontSize: 16,
              lineHeight: 1.55,
              letterSpacing: '.03em',
              textTransform: 'uppercase',
              color: '#fff',
              margin: 0,
            }}
          >
            Bir masanın etrafında toplanmak için bahane çok: kitap, yürüyüş,
            kahve, fotoğraf. Birkaç kişiyle başlayıp şehre yayılan bir şey
            olabilir.
          </p>
          <div style={{ display: 'flex', gap: 20, marginTop: 26, flexWrap: 'wrap' }}>
            <Link href="#etkinlikler" style={{ ...kunyeEtiket, fontSize: 11, color: '#fff' }}>
              Etkinlikleri gör →
            </Link>
            <Link href="/community/new" style={{ ...kunyeEtiket, fontSize: 11, color: 'rgba(255,255,255,.72)' }}>
              Topluluk kur →
            </Link>
          </div>
        </div>
      </section>

      {/* ---- Kategori çipleri ---- */}
      <section className="container section-tight" style={{ paddingBlock: 'var(--s-4)' }}>
        <CategoryStrip activeSlug={activeSlug} activeCity={activeCity} query={params.q ?? null} />
      </section>

      {/* ---- Yaklaşan etkinlikler: sayfanın asıl işi ---- */}
      <section id="etkinlikler" className="container section">
        <SectionHead
          title={
            cityLocative
              ? <><span className="highlight-yellow">{activeCity}</span>{cityLocative.slice(activeCity!.length)} yaklaşanlar</>
              : <><span className="highlight-yellow">Yaklaşan</span> etkinlikler</>
          }
          href="/kesfet"
          linkLabel="Tüm etkinlikler"
        />
        <UpcomingEvents events={events} />
      </section>

      {/* ---- Topluluklar ---- */}
      <section id="topluluklar" className="container section" style={{ paddingTop: 0 }}>
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
        <HowItWorks />
      </section>

      {/* ---- Kapanış: dokunan çizgiler.
           Eski lacivert bandın yerine geçti — ikisi de topluluk kurmaya
           çağırıyordu, iki CTA üst üste geliyordu. --- */}
      <ClosingCta />

    </main>
  )
}
