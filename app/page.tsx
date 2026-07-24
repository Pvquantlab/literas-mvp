import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import EventCard from '@/components/event-card'
import CommunityCard from '@/components/community-card'
import CategoryIcon, { categoryGradient } from '@/components/category-icon'
import Reveal from '@/components/reveal'
import CategoryStrip from './category-strip'
import SearchBox from './search-box'
import CityFilter from './city-filter'

export const dynamic = 'force-dynamic'

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
  }

  // Yaklaşan etkinlikler — herkese açık, onaylı topluluklardan
  const { data: upcomingEvents } = await supabase
    .from('events')
    .select('id, title, event_date, location, cover_image_url, max_attendees, rsvps(count), community:communities!inner(id, name, category, city, status)')
    .gte('event_date', new Date().toISOString())
    .eq('community.status', 'approved')
    .order('event_date', { ascending: true })
    .limit(6)
  const events = upcomingEvents ?? []

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
      community_members(count)
    `)
    .eq('status', 'approved')
    .eq('community_members.status', 'approved')
    .order('created_at', { ascending: false })

  if (activeCategory) query = query.eq('category', activeCategory)
  if (activeCity) query = query.eq('city', activeCity)
  if (activeQuery) query = query.ilike('name', `%${activeQuery}%`)

  const { data: communityRows } = await query
  const communities = (communityRows ?? []).map((c: any) => ({
    ...c,
    memberCount: c.community_members?.[0]?.count ?? 0,
  }))
  const hasFilter = Boolean(activeCategory || activeCity || activeQuery)

  const communitiesSection = (
    <section className="py-14">
      <div className="mx-auto max-w-[1120px] px-6">
        <Reveal>
          <div className="mb-7 flex items-baseline justify-between">
            <h2 className="text-[28px] font-extrabold tracking-[-1px] text-ink">
              {activeCity ? `${activeCity} ` : ''}yakınındaki <span className="text-brand">topluluklar</span>
            </h2>
            <Link href="/kesfet?tab=topluluklar" className="text-[14.5px] font-semibold text-brand hover:underline">
              Hepsini keşfet →
            </Link>
          </div>
        </Reveal>

        <div className="mb-6 flex flex-wrap gap-3">
          <div className="w-full min-[560px]:w-auto min-[560px]:flex-1 min-[560px]:max-w-[380px]">
            <SearchBox initialQuery={activeQuery ?? ''} />
          </div>
          <div className="w-full min-[560px]:w-[200px]">
            <CityFilter cities={cities} activeCity={activeCity ?? ''} />
          </div>
        </div>

        {communities.length > 0 ? (
          <Reveal>
            <div className="grid grid-cols-1 gap-[22px] sm:grid-cols-2 lg:grid-cols-4">
              {communities.map((community: any) => (
                <CommunityCard key={community.id} community={community} />
              ))}
            </div>
          </Reveal>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#D9D0BE] bg-white px-6 py-14 text-center">
            {hasFilter ? (
              <>
                <p className="mb-2 text-[16px] font-semibold text-ink">Bu filtreye uygun topluluk bulunamadı.</p>
                <p className="text-[14px] text-mute">Farklı bir kategori veya şehir dene.</p>
              </>
            ) : (
              <>
                <p className="mb-2 text-[17px] font-bold text-ink">Henüz topluluk yok.</p>
                <p className="mb-6 text-[14.5px] text-mute">Bu sayfa ilk toplulukla dolmaya başlayacak — o sen olabilirsin.</p>
                <Link
                  href="/community/new"
                  className="inline-flex rounded-full bg-brand px-6 py-3 text-[15px] font-bold text-white transition hover:-translate-y-px hover:bg-brand-dark"
                >
                  İlk topluluğu sen kur →
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  )

  // ===== GİRİŞ YAPMIŞ KULLANICI =====
  if (user && profile) {
    const initials = profile.name
      ? profile.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
      : '?'

    return (
      <div className="mx-auto flex max-w-[1120px] flex-wrap items-start gap-6 px-6 pb-16 pt-7">
        {/* SOL SIDEBAR */}
        <aside className="flex min-w-[260px] max-w-full flex-1 basis-[280px] flex-col gap-4 lg:max-w-[320px]">
          {/* Profil kartı */}
          <Link
            href={`/profile/${profile.id}`}
            className="flex items-center gap-3 rounded-2xl border border-line bg-white p-[14px] px-4 transition hover:shadow-[0_8px_20px_rgba(23,32,43,.10)]"
          >
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="h-[46px] w-[46px] rounded-full object-cover" />
            ) : (
              <span className="grid h-[46px] w-[46px] place-items-center rounded-full border border-line bg-warm text-[15px] font-bold text-ink">
                {initials}
              </span>
            )}
            <span className="flex flex-col gap-[2px]">
              <span className="text-[15.5px] font-bold text-ink">{profile.name}</span>
              <span className="text-xs text-mute">Profilini gör</span>
            </span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8A94A2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-auto">
              <path d="M10 6l6 6-6 6" />
            </svg>
          </Link>

          {/* Katıldığın etkinlikler */}
          <div className="rounded-2xl border border-line bg-white p-4">
            <h2 className="mb-3 text-[15px] font-bold text-ink">Gidiyorum</h2>
            {myRsvps.length > 0 ? (
              <div className="flex flex-col gap-[2px]">
                {myRsvps.map((ev: any) => (
                  <Link key={ev.id} href={`/event/${ev.id}`} className="flex flex-col gap-[2px] rounded-[10px] p-2 transition hover:bg-warm">
                    <span className="text-[11px] font-bold uppercase tracking-[0.4px] text-brand">
                      {new Date(ev.event_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                    </span>
                    <span className="text-[14.5px] font-semibold leading-[1.3] text-ink">
                      {ev.title}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="px-2 pb-2 pt-3 text-center">
                <p className="mb-4 text-sm text-mute">Henüz bir etkinliğe katılmadın.</p>
                <Link href="/kesfet" className="inline-flex rounded-full bg-brand px-[18px] py-2 text-[13.5px] font-bold text-white transition hover:bg-brand-dark">
                  Etkinlikleri bul
                </Link>
              </div>
            )}
          </div>

          {/* Toplulukların */}
          <div className="rounded-2xl border border-line bg-white p-4">
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-bold text-ink">Toplulukların</h2>
              <span className="rounded-full bg-warm px-2 py-[1px] text-[11px] font-bold text-mute">
                {myCommunities.length}
              </span>
            </div>

            {myCommunities.length > 0 ? (
              <div className="mt-2.5 flex flex-col gap-[2px]">
                {myCommunities.map((c: any) => (
                  <Link key={c.id} href={`/community/${c.id}`} className="rounded-[10px] p-2 text-sm font-semibold text-ink transition hover:bg-warm">
                    {c.name}
                  </Link>
                ))}
              </div>
            ) : (
              <>
                <p className="mb-3.5 mt-3 text-[13.5px] leading-[1.5] text-mute">
                  Tutkularını paylaşan insanlarla aynı masaya otur.
                </p>
                <Link href="/kesfet" className="inline-flex rounded-full border-[1.5px] border-line px-[18px] py-2 text-[13.5px] font-bold text-ink transition hover:bg-warm">
                  Toplulukları keşfet
                </Link>
              </>
            )}
          </div>
        </aside>

        {/* SAĞ ANA ALAN */}
        <main className="min-w-0 flex-[3_1_440px]">
          {/* Senin için */}
          <section className="mb-2">
            <div className="mb-6 flex items-baseline justify-between">
              <h2 className="text-[24px] font-extrabold tracking-[-0.8px] text-ink">
                Senin için <span className="text-brand">yaklaşan etkinlikler</span>
              </h2>
              <Link href="/kesfet" className="text-[14px] font-semibold text-brand hover:underline">
                Tümünü gör →
              </Link>
            </div>
            {events.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 min-[640px]:grid-cols-2">
                {events.slice(0, 4).map((ev: any) => (
                  <EventCard key={ev.id} event={ev} showCommunityName={true} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#D9D0BE] bg-white px-6 py-12 text-center">
                <p className="mb-2 text-[16px] font-bold text-ink">Henüz planlanmış etkinlik yok.</p>
                <p className="text-[14px] text-mute">Toplulukların ilk etkinliği duyurduğunda burada göreceksin.</p>
              </div>
            )}
          </section>
        </main>

        {/* Topluluklar — tam genişlik */}
        <div className="w-full">
          {communitiesSection}
        </div>
      </div>
    )
  }

  // ===== GİRİŞ YAPMAMIŞ =====
  return (
    <main>
      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* süzülen renk lekeleri */}
        <div className="animate-blob pointer-events-none absolute -top-[140px] right-[-80px] -z-10 h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle,rgba(194,80,31,.14),transparent_65%)] blur-[90px]" />
        <div className="animate-blob pointer-events-none absolute -left-[100px] bottom-[-120px] -z-10 h-[380px] w-[380px] rounded-full bg-[radial-gradient(circle,rgba(233,180,76,.18),transparent_65%)] blur-[90px]" />

        <div className="mx-auto grid max-w-[1120px] items-center gap-12 px-6 pb-[72px] pt-[56px] lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <Reveal>
              <span className="mb-[22px] inline-flex items-center gap-2 rounded-full bg-brand-tint px-[14px] py-[7px] text-[13px] font-semibold text-brand">
                <span className="h-[7px] w-[7px] rounded-full bg-brand" />
                Türkiye'nin topluluk platformu
              </span>
            </Reveal>
            <Reveal delay={1}>
              <h1 className="mb-5 text-[38px] font-extrabold leading-[1.06] tracking-[-1.4px] text-ink min-[640px]:text-[52px] min-[640px]:tracking-[-2px]">
                İlgini çeken insanlarla{' '}
                <span className="bg-[linear-gradient(180deg,transparent_62%,rgba(233,180,76,.55)_62%)] px-[2px]">
                  aynı masaya
                </span>{' '}
                otur.
              </h1>
            </Reveal>
            <Reveal delay={2}>
              <p className="mb-8 max-w-[440px] text-lg leading-[1.6] text-body">
                Kitap kulüplerinden fotoğraf yürüyüşlerine — şehrindeki toplulukları keşfet, etkinliklere katıl, yeni insanlarla tanış.
              </p>
            </Reveal>
            <Reveal delay={3}>
              <form
                action="/kesfet"
                method="get"
                className="flex max-w-[520px] items-center rounded-full border border-line bg-white p-1.5 shadow-md"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5 px-4 text-sm text-mute">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="shrink-0">
                    <path d="M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15zM16 16l5 5" />
                  </svg>
                  <input type="text" name="q" placeholder="Etkinlik ara…" aria-label="Etkinlik ara" className="bare-input text-[14.5px] text-ink" />
                </div>
                <div className="hidden min-[560px]:flex min-w-0 flex-1 items-center gap-2.5 border-l border-line px-4 text-sm text-mute">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <input type="text" name="city" defaultValue="İstanbul" aria-label="Şehir" className="bare-input text-[14.5px] text-ink" />
                </div>
                <button
                  type="submit"
                  aria-label="Ara"
                  className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-full bg-brand text-white transition hover:bg-brand-dark"
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </button>
              </form>
            </Reveal>
          </div>

          {/* Görsel kolaj — geniş ekranda: düzenli ızgara, büyük ikonlar */}
          <div className="relative hidden h-[420px] lg:block">
            <div className="grid h-full grid-cols-2 gap-4">
              {/* sol: uzun karo */}
              <div
                className="relative overflow-hidden rounded-[24px] shadow-[0_16px_40px_rgba(23,32,43,.12)]"
                style={{ background: categoryGradient('kitap') }}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_18%,rgba(255,255,255,.20),transparent_58%)]" />
                <div className="relative grid h-full place-items-center">
                  <div className="grid h-[108px] w-[108px] place-items-center rounded-full bg-white/15">
                    <CategoryIcon slug="kitap" size={54} color="#FFFFFF" />
                  </div>
                </div>
              </div>
              {/* sağ: iki karo üst üste */}
              <div className="grid grid-rows-2 gap-4">
                <div
                  className="relative overflow-hidden rounded-[24px] shadow-[0_16px_40px_rgba(23,32,43,.12)]"
                  style={{ background: categoryGradient('doğa') }}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_18%,rgba(255,255,255,.20),transparent_58%)]" />
                  <div className="relative grid h-full place-items-center">
                    <div className="grid h-[84px] w-[84px] place-items-center rounded-full bg-white/15">
                      <CategoryIcon slug="doğa" size={42} color="#FFFFFF" />
                    </div>
                  </div>
                </div>
                <div
                  className="relative overflow-hidden rounded-[24px] shadow-[0_16px_40px_rgba(23,32,43,.12)]"
                  style={{ background: categoryGradient('müzik') }}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_18%,rgba(255,255,255,.20),transparent_58%)]" />
                  <div className="relative grid h-full place-items-center">
                    <div className="grid h-[84px] w-[84px] place-items-center rounded-full bg-white/15">
                      <CategoryIcon slug="müzik" size={42} color="#FFFFFF" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* yüzen kartlar — kenarlara düzgün oturur */}
            <div className="animate-bob absolute -top-5 right-5 flex items-center gap-3 rounded-[14px] bg-white p-[14px] px-[18px] shadow-[0_16px_40px_rgba(23,32,43,.12)]">
              <div className="grid h-[38px] w-[38px] place-items-center rounded-[10px] bg-brand-tint">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#C2501F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" x2="16" y1="2" y2="6" />
                  <line x1="8" x2="8" y1="2" y2="6" />
                  <line x1="3" x2="21" y1="10" y2="10" />
                </svg>
              </div>
              <div className="whitespace-nowrap">
                <div className="text-sm font-bold text-ink">Haftalık buluşmalar</div>
                <div className="text-xs text-mute">şehrinde, her hafta</div>
              </div>
            </div>
            <div className="animate-bob-delay absolute -bottom-5 left-5 flex items-center gap-3 rounded-[14px] bg-white p-[14px] px-[18px] shadow-[0_16px_40px_rgba(23,32,43,.12)]">
              <div className="flex">
                <i className="not-italic grid h-[30px] w-[30px] place-items-center rounded-full border-[2.5px] border-white bg-brand text-[11px] font-bold text-white">A</i>
                <i className="not-italic -ml-[9px] grid h-[30px] w-[30px] place-items-center rounded-full border-[2.5px] border-white bg-forest text-[11px] font-bold text-white">M</i>
                <i className="not-italic -ml-[9px] grid h-[30px] w-[30px] place-items-center rounded-full border-[2.5px] border-white bg-[#2B3A55] text-[11px] font-bold text-white">Z</i>
              </div>
              <div className="whitespace-nowrap">
                <div className="text-sm font-bold text-ink">Topluluğuna katıl</div>
                <div className="text-xs text-mute">ilk üyelerden ol</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* KATEGORİLER */}
      <section className="pb-14 pt-2">
        <div className="mx-auto max-w-[1120px] px-6">
          <Reveal>
            <CategoryStrip cats={CATS} activeCategory={activeCategory ?? undefined} activeCity={activeCity ?? undefined} activeQuery={activeQuery ?? undefined} />
          </Reveal>
        </div>
      </section>

      {/* ETKİNLİKLER */}
      <section className="pb-14">
        <div className="mx-auto max-w-[1120px] px-6">
          <Reveal>
            <div className="mb-7 flex items-baseline justify-between">
              <h2 className="text-[28px] font-extrabold tracking-[-1px] text-ink">
                Bu hafta <span className="text-brand">yaklaşan etkinlikler</span>
              </h2>
              <Link href="/kesfet" className="text-[14.5px] font-semibold text-brand hover:underline">
                Tümünü gör →
              </Link>
            </div>
          </Reveal>

          {events.length > 0 ? (
            <Reveal>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {events.map((ev: any) => (
                  <EventCard key={ev.id} event={ev} showCommunityName={true} />
                ))}
              </div>
            </Reveal>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#D9D0BE] bg-white px-6 py-14 text-center">
              <p className="mb-2 text-[17px] font-bold text-ink">Henüz planlanmış etkinlik yok.</p>
              <p className="mb-6 text-[14.5px] text-mute">Takvim ilk etkinlikle dolacak — ilkini sen düzenleyebilirsin.</p>
              <Link
                href="/community/new"
                className="inline-flex rounded-full bg-brand px-6 py-3 text-[15px] font-bold text-white transition hover:-translate-y-px hover:bg-brand-dark"
              >
                Topluluk kur, ilk etkinliği sen duyur →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* TOPLULUKLAR */}
      <div className="border-y border-line bg-warm">
        {communitiesSection}
      </div>

      {/* NASIL ÇALIŞIR */}
      <section className="py-14">
        <div className="mx-auto max-w-[1120px] px-6">
          <Reveal>
            <h2 className="mb-7 text-[28px] font-extrabold tracking-[-1px] text-ink">
              Nasıl <span className="text-brand">çalışır?</span>
            </h2>
          </Reveal>
          <Reveal>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="rounded-2xl border border-line bg-white p-7">
                <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-brand-tint">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C2501F" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15zM16 16l5 5" />
                  </svg>
                </div>
                <b className="mb-2 block text-[17px] font-bold tracking-[-0.3px] text-ink">Topluluğunu bul</b>
                <p className="text-[14.5px] leading-[1.6] text-body">İlgi alanına ve şehrine göre toplulukları keşfet. Herkes için bir masa var.</p>
              </div>
              <div className="rounded-2xl border border-line bg-white p-7">
                <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-[#E8F0EA]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2F6B4F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" x2="16" y1="2" y2="6" />
                    <line x1="8" x2="8" y1="2" y2="6" />
                    <line x1="3" x2="21" y1="10" y2="10" />
                  </svg>
                </div>
                <b className="mb-2 block text-[17px] font-bold tracking-[-0.3px] text-ink">Etkinliğe katıl</b>
                <p className="text-[14.5px] leading-[1.6] text-body">Tek tıkla yerini ayırt. Kontenjan dolarsa bekleme listesi seni sıraya alır.</p>
              </div>
              <div className="rounded-2xl border border-line bg-white p-7">
                <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-[#FBF3DF]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B5641F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
                    <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z" />
                  </svg>
                </div>
                <b className="mb-2 block text-[17px] font-bold tracking-[-0.3px] text-ink">Masaya otur</b>
                <p className="text-[14.5px] leading-[1.6] text-body">Hatırlatma mailiyle gününü kaçırma. Git, tanış, sohbet et — gerisi kendiliğinden gelir.</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-16">
        <div className="mx-auto max-w-[1120px] px-6">
          <Reveal>
            <div className="flex flex-col items-start gap-8 overflow-hidden rounded-3xl bg-[linear-gradient(120deg,#A84317,#C2501F_55%,#D96A2B)] p-11 text-white min-[760px]:flex-row min-[760px]:items-center min-[760px]:justify-between min-[760px]:px-12 min-[760px]:py-16">
              <div>
                <h2 className="mb-3 text-[30px] font-extrabold tracking-[-1.2px] min-[640px]:text-4xl">Kendi masanı kur.</h2>
                <p className="max-w-[420px] text-base opacity-85">Topluluk kurmak 2 dakika sürer. İlk üyelerin seni bekliyor — başlaman yeter.</p>
              </div>
              <Link
                href="/community/new"
                className="shrink-0 rounded-full bg-white px-[30px] py-[15px] text-[15px] font-bold text-brand transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(0,0,0,.2)]"
              >
                Topluluk kur →
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  )
}
