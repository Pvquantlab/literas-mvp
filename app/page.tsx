import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { bySlug, sanitizeQuery, CATEGORIES } from '@/lib/categories'
import { DevLogotype } from '@/components/kunye'
import { RolyefKap, RolyefMasa, RolyefKahve, RolyefKitap, RolyefSehir } from '@/components/rolyef'
import { formatDayMonthShort } from '@/lib/date'
import { bulunmaHali } from '@/lib/turkce'
import HowItWorks from '@/components/how-it-works'
import Bolum from '@/components/bolum'
import Program from '@/components/program'
import Lejant from '@/components/lejant'
import CommunityCard, { type CommunitySummary } from '@/components/community-card'
import UpcomingEvents, { type EventSummary } from '@/components/upcoming-events'
import EventCard from '@/components/event-card'
import SearchBox from './search-box'
import CityFilter from './city-filter'

// force-dynamic, revalidate DEĞİL. Sayfa zaten dinamik (createClient()
// cookies() çağırıyor), yani `revalidate = 60` bugün etkisizdi. Ama sayfa
// artık kullanıcıya ÖZEL içerik basıyor: biri ileride cookie bağımlılığını
// kaldırırsa o satır bir kullanıcının önerilerini 60 saniye boyunca PAYLAŞILAN
// önbellekte tutardı. Niyet yazılı olsun.
export const dynamic = 'force-dynamic'

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

/** `ilgi_onerileri` RPC'sinin dönüş satırı. CommunitySummary'yi kapsıyor. */
type IlgiOnerisi = CommunitySummary & {
  skor: number
  /** Eşleşmeyi doğuran ilgi alanlarının KULLANICININ KENDİ yazdığı hâli. */
  eslesen_ilgiler: string[]
  /**
   * Bunların ALT KÜMESİ: topluluğun konu listesinde BİREBİR duranlar.
   * Kalanı yalnızca aynı konu kategorisinden geliyor — gerekçe cümlesi bu
   * ikisini aynı kelimeyle anlatamaz.
   */
  dogrudan_ilgiler: string[]
}

/**
 * Kartın altındaki gerekçe satırı.
 *
 * Kullanıcının kendi kelimeleri geri yazılıyor — "sana uygun" demek yerine
 * NEDEN uygun olduğunu göstermek, öneriyi rastgele bir karttan ayıran tek şey.
 */
function ilgiGerekcesi(etiketler: string[], dogrudan: string[] = []): string {
  const siral = (d: string[]) => [...d].sort((a, b) => a.localeCompare(b, 'tr'))
  const liste = (d: string[]) =>
    d.length === 1 ? d[0] : `${d.slice(0, -1).join(', ')} ve ${d[d.length - 1]}`

  // İKİ AYRI CÜMLE, ÇÜNKÜ İKİ AYRI İDDİA VAR. `dogrudan` = kullanıcının
  // etiketi topluluğun konu listesinde BİREBİR duruyor. Kategori kolunda ise
  // bağ yalnızca "aynı konu kategorisi" — orada "Podcast ilgi alanından"
  // demek, okuyucuya var olmayan bir bağ vaat etmek olurdu.
  const d = siral(dogrudan)
  if (d.length > 0) {
    return `${liste(d)} ilgi ${d.length === 1 ? 'alanından' : 'alanlarından'}`
  }
  const e = siral(etiketler)
  if (e.length === 0) return ''
  return `${liste(e)} ilgi ${e.length === 1 ? 'alanına' : 'alanlarına'} yakın konulardan`
}

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
      'id, title, event_date, location, cover_image_url, series_id, seri_disina_alindi_at, community:communities!inner(name, category, city)'
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
  const events = (eventRes.data ?? []) as unknown as (EventSummary & {
    series_id?: string | null
    seri_disina_alindi_at?: string | null
  })[]
  const cities = Array.from(new Set((cityRes.data ?? []).map((r) => r.city as string))).sort(
    (a, b) => a.localeCompare(b, 'tr')
  )

  // Şehir filtresi yokken sorgu TÜM Türkiye'yi getiriyor. Eskiden başlık yine
  // de "İstanbul" yazıyordu — kullanıcıya yanlış bilgi veriyordu.
  const cityLocative = bulunmaHali(activeCity)
  const hasFilter = Boolean(activeSlug || activeCity || activeQuery)

  // Seri rozeti: görüntülenen etkinliklerin ait olduğu serilerin kalan
  // buluşma sayısı, tek round-trip'te. Dizi boşsa RPC hiç çağrılmaz.
  const seriIdler = [...new Set(events.map((e) => e.series_id).filter(Boolean))]
  const { data: kalanRows, error: kalanError } = (seriIdler.length
    ? await supabase.rpc('seri_kalanlar', { p_series_ids: seriIdler })
    : { data: [], error: null }) as {
      data: { series_id: string; kalan: number; frekans: string }[] | null
      error: { message: string } | null
    }
  if (kalanError) console.error('[anasayfa] seri kalanlar alinamadi:', kalanError)
  const kalanMap = new Map<string, { kalan: number; frekans: string }>(
    (kalanRows ?? []).map((r) => [r.series_id, { kalan: r.kalan, frekans: r.frekans }])
  )

  // Katlanmış listedeki her tekil satır 1 sayılır, her seri temsilcisi ise
  // o serinin kalan buluşma sayısı kadar — community/[id]/page.tsx:241-247
  // ile birebir aynı desen. Vitrin seri başına tek satır döndürdüğü için
  // events.length tek başına "12 haftalık seri" yerine "1" sayıyordu.
  const yaklasanToplam = events.reduce(
    (t: number, e) =>
      t + (e.series_id && !e.seri_disina_alindi_at
        ? (kalanMap.get(e.series_id)?.kalan ?? 1)
        : 1),
    0
  )

  // UpcomingEvents veri çekmiyor — seri rozeti için gereken kalan/frekans
  // bilgisini burada, kalanMap'ten, prop olarak hazırlayıp geçiriyoruz.
  // EventCard'daki seriKalan/frekans hesabıyla birebir aynı desen.
  const eventsWithSeri: EventSummary[] = events.map((ev) => ({
    ...ev,
    seriKalan: ev.seri_disina_alindi_at ? null : kalanMap.get(ev.series_id ?? '')?.kalan ?? null,
    frekans: ev.seri_disina_alindi_at ? null : kalanMap.get(ev.series_id ?? '')?.frekans ?? null,
  }))

  /* =================================================================
     GİRİŞ YAPMIŞ KULLANICI
     ================================================================= */

  if (user) {
    // `interests` BURADAN geliyor: profil satırı zaten çekiliyor, kolonu
    // eklemek sıfır ek gidiş-dönüş demek. Sinyalin kaynağı bedava.
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, name, avatar_url, interests')
      .eq('id', user.id)
      .maybeSingle()

    const [membershipRes, rsvpRes] = await Promise.all([
      // TEK KAYNAK. Eskiden bu sorgu .limit(6) ile YALNIZCA kenar çubuğu için
      // çekiliyor, üyelik kimlikleri için aşağıda İKİNCİ ve birebir aynı bir
      // sorgu daha atılıyordu. Artık tek sorgu: limit sorguda değil, kenar
      // çubuğunun kendi diliminde (aşağıda .slice(0, 6)).
      //
      // DİKKAT — bu, kenar çubuğu ile "Senin için" şeridinin aynı KÜMEYE
      // dayandığı anlamına GELMEZ: şerit `topluluklarim`'ın TAMAMINDAN, kenar
      // çubuğu ilk 6'sından besleniyor ve sorguda .order() yok, yani o 6 keyfi
      // bir 6. 6'dan fazla onaylı üyelikte kenar çubuğunda adı geçmeyen bir
      // topluluğun buluşması şeritte çıkabilir — adı kartın üzerinde yazıyor
      // (EventCard showCommunityName), o yüzden "tanımadığım topluluk" değil,
      // "listeyi tam sanmıştım" kusuru. Kapatmak istenirse kenar çubuğuna
      // taşma göstergesi ("+N daha") eklenmeli; `topluluklarim` KIRPILMAMALI.
      supabase
        .from('community_members')
        .select('community_id, community:communities(id, name)')
        .eq('user_id', user.id)
        .eq('status', 'approved'),
      supabase
        .from('rsvps')
        .select('event:events(id, title, event_date)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    if (membershipRes.error) console.error('[anasayfa] uyelikler alinamadi:', membershipRes.error)
    if (rsvpRes.error) console.error('[anasayfa] rsvp listesi alinamadi:', rsvpRes.error)

    const uyelikSatirlari = membershipRes.data ?? []
    // Kenar çubuğu en fazla 6 gösteriyor — sınır SORGUDA değil burada, ki
    // "topluluklarım" kümesi tam kalsın.
    const myCommunities = uyelikSatirlari
      .map((m) => m.community as unknown as { id: string; name: string })
      .filter(Boolean)
      .slice(0, 6)
    const topluluklarim = uyelikSatirlari.map((m) => m.community_id).filter(Boolean)
    const myRsvps = (rsvpRes.data ?? [])
      .map((r) => r.event as unknown as { id: string; title: string; event_date: string })
      .filter(Boolean)

    // "SENİN İÇİN" GERÇEKTEN KİŞİSEL OLSUN.
    // Eskiden bu bölüm, misafire "Yaklaşan buluşmalar" diye gösterilen BİREBİR
    // AYNI sorgunun ilk 4 kaydıydı — user.id bile sorguya girmiyordu. Başlık
    // kişiselleştirme vaat ediyor, kod hiçbir kişiselleştirme yapmıyordu.
    //
    // Taksonomiye dokunmadan gerçek kişiselleştirme: kullanıcının ÜYE OLDUĞU
    // toplulukların yaklaşan buluşmaları. community_members → events zaten
    // temiz bağlanıyor; ilgi alanı eşleştirmesi (serbest metin ↔ topics.id)
    // gerekmiyor — o ayrı bir iş.
    //
    // ŞEHİR SEÇİLİYKEN KİŞİSELLEŞTİRME YOK. Eskiden bu şerit `activeCity`'yi
    // görmezden geliyordu: kullanıcı Ankara'yı seçse bile İstanbul
    // üyeliklerinin buluşmaları "Senin için" altında kalıyordu. Asıl kusur
    // şehrin uygulanmaması değil, SÜZGECİN KAPSAMININ kullanıcının göremediği
    // bir duruma (üyeliğinde yaklaşan buluşma var mı) göre değişmesiydi.
    //
    // KAPI NEDEN `hasFilter` DEĞİL: yukarıdaki `eventQuery` YALNIZCA şehri
    // uyguluyor; `q` ve `category` etkinlik sorgusuna hiç girmiyor. `hasFilter`
    // ile kapatınca arama yapan kullanıcı kişiselleştirmeyi kaybediyor,
    // karşılığında hiç daralmamış bir liste görüyordu — saf kayıp. Arama kutusu
    // zaten "Topluluk ara..." (app/search-box.tsx) ve topluluk ızgarasını
    // süzüyor; şeridin "topluluklarından" alt başlığı kendi kapsamını yazdığı
    // için topluluk adı ararken yerinde durması yanıltıcı değil.
    // Aşağıdaki ilgi alanı önerisi bölümü hâlâ `!hasFilter` kullanıyor — o kapı
    // main'den geliyor, gevşetmek ayrı bir ürün kararı.
    // Yan kazanç: şehir seçiliyken bir gidiş-dönüş hiç yapılmıyor.
    let seninIcin: typeof events = []
    if (!activeCity && topluluklarim.length > 0) {
      const { data: kisiselRes, error: kisiselHata } = await supabase
        .from('etkinlik_vitrin')
        .select(
          'id, title, event_date, location, cover_image_url, series_id, seri_disina_alindi_at, community:communities!inner(name, category, city)'
        )
        .in('community_id', topluluklarim)
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true })
        .limit(4)
      if (kisiselHata) console.error('[anasayfa] kisisel etkinlikler alinamadi:', kisiselHata)
      seninIcin = (kisiselRes ?? []) as unknown as typeof events
    }

    // Başlık İÇERİĞE uyar: "Senin için" ancak gerçekten senin içinken yazar.
    // Üyeliği olmayan ya da topluluklarında yaklaşan buluşma bulunmayan
    // kullanıcı genel listeyi DÜRÜST başlıkla görür — boş bölüm göstermek
    // yerine (giriş yapmış dalda tek etkinlik bölümü bu).
    const kisiselMi = seninIcin.length > 0
    const gosterilecekEtkinlikler = kisiselMi ? seninIcin : events

    // Rozet için kalan sayısı: kişisel liste farklı serilerden gelebildiği
    // için kendi haritasını istiyor.
    let gosterilenKalanMap = kalanMap
    if (kisiselMi) {
      const kisiselSeriIdler = [...new Set(seninIcin.map((e) => e.series_id).filter(Boolean))]
      const { data: kisiselKalan, error: kisiselKalanHata } = (kisiselSeriIdler.length
        ? await supabase.rpc('seri_kalanlar', { p_series_ids: kisiselSeriIdler })
        : { data: [], error: null }) as {
          data: { series_id: string; kalan: number; frekans: string }[] | null
          error: { message: string } | null
        }
      if (kisiselKalanHata) console.error('[anasayfa] kisisel seri kalanlar alinamadi:', kisiselKalanHata)
      gosterilenKalanMap = new Map(
        (kisiselKalan ?? []).map((r) => [r.series_id, { kalan: r.kalan, frekans: r.frekans }])
      )
    }

    // İLGİ ALANLARINA GÖRE TOPLULUK ÖNERİSİ
    //
    // `profiles.interests` bu satıra kadar depoda ÜÇ YERDE yazılıp SIFIR
    // sorguda okunuyordu; ayarlar sayfası ise açıkça "bunlara göre önerelim"
    // diye söz veriyordu. Bu, profile_visibility ve show_participation'dan
    // sonra ÜÇÜNCÜ ölü ayardı. Kolonun okunduğu ilk yer burası.
    //
    // SÜZGEÇ VARKEN GÖSTERİLMİYOR. Kullanıcı şehir/kategori/arama seçtiğinde
    // ekranda gördüğü şey onun sorusunun cevabı olmalı; araya süzgece tabi
    // olmayan ikinci bir liste sokmak, kapsamı kullanıcının göremediği bir
    // duruma göre değiştirir (docs/kisisel-kesif-ertelenenler.md #3'ün
    // "Senin için" şeridinde bıraktığı kusurun aynısı).
    const ilgiAlanlari = ((profile?.interests as string[] | null) ?? []).filter(Boolean)

    let oneriler: IlgiOnerisi[] = []
    let oneriHatasi = false
    if (ilgiAlanlari.length > 0 && !hasFilter) {
      const { data: oneriRes, error: oneriHata } = await supabase.rpc('ilgi_onerileri', {
        p_limit: 4,
      })
      if (oneriHata) {
        console.error('[anasayfa] ilgi onerileri alinamadi:', oneriHata)
        oneriHatasi = true
      }
      oneriler = (oneriRes ?? []) as IlgiOnerisi[]
    }
    // Aynı kart iki kez basılmasın: öneri bölümünde çıkanlar ızgaradan düşer.
    const oneriIdler = new Set(oneriler.map((o) => o.id))
    const izgaraTopluluklari = oneriler.length > 0
      ? communities.filter((c) => !oneriIdler.has(c.id))
      : communities

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

            {/* DAVET — bu turun en çok kişiye dokunan parçası.
                Ölçüm (01.09.2026): dört profilden ÜÇÜNDE ilgi alanı boş.
                Sebebi isteksizlik değil görünmezlik: /ayarlar/ilgi-alanlari'na
                depoda TEK link var (ayarlar menüsünün 7. maddesi, 3 tık) ve
                kayıt akışı ilgi alanını HİÇ sormuyor. Öneri sorgusunu yazıp
                bu daveti yazmamak, motoru kurup yakıt musluğunu kapalı
                bırakmak olurdu. İlgi alanı dolar dolmaz kart kaybolur. */}
            {ilgiAlanlari.length === 0 && (
              <div className="card" style={{ padding: 'var(--s-4)' }}>
                <h2 style={{ fontSize: 'var(--t-md)', fontWeight: 600, marginBottom: 'var(--s-3)' }}>
                  Neyi seversin?
                </h2>
                <p style={{ fontSize: 'var(--t-sm)', color: 'var(--muted)', marginBottom: 'var(--s-4)' }}>
                  İlgi alanlarını seç; sana uyan toplulukları burada gösterelim.
                </p>
                <Link href="/ayarlar/ilgi-alanlari" className="btn-secondary btn-sm">
                  İlgi alanlarını seç
                </Link>
              </div>
            )}
          </aside>

          {/* ---- Ana alan ---- */}
          <div style={{ flex: '3 1 460px', minWidth: 0 }}>
            {gosterilecekEtkinlikler.length > 0 && (
              <section style={{ marginBottom: 'var(--s-8)' }}>
                <SectionHead
                  title={kisiselMi ? 'Senin için' : 'Yaklaşan buluşmalar'}
                  href="/kesfet"
                  linkLabel="Tümünü gör"
                />
                {kisiselMi && (
                  <p className="mono" style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 var(--s-3)' }}>
                    topluluklarından
                  </p>
                )}
               <div className="grid-communities grid-narrow">
                  {gosterilecekEtkinlikler.slice(0, 4).map((ev) => (
                    <EventCard
                      key={ev.id}
                      event={{ ...ev, location: ev.location || "" }}
                      showCommunityName
                      seriKalan={ev.seri_disina_alindi_at ? null : gosterilenKalanMap.get(ev.series_id ?? '')?.kalan}
                      frekans={ev.seri_disina_alindi_at ? null : gosterilenKalanMap.get(ev.series_id ?? '')?.frekans}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* İLGİ ALANLARINA GÖRE — ASLA "Senin için" değil.
                O ad üyelik şeridinin ve başlık-içerik sözleşmesi bu depoda
                zaten bir kez kırılmıştı. İki bölüm iki ayrı soruyu yanıtlıyor:
                "topluluklarında ne var" vs "hangi topluluğa katılmalısın". */}
            {ilgiAlanlari.length > 0 && !hasFilter && (
              <section style={{ marginBottom: 'var(--s-8)' }}>
                <SectionHead title="İlgi alanlarına göre" />
                <p className="mono" style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 var(--s-3)' }}>
                  henüz üyesi olmadığın topluluklar
                </p>
                {/* HATA, BOŞ DEĞİLDİR. Sorgu patladığında "uyan topluluk
                    yok" demek kesin bir yalan olur — veri yokluğu ile veri
                    alınamaması aynı cümleye düşemez. */}
                {oneriHatasi ? (
                  <div className="empty-state">
                    <p>Öneriler yüklenemedi, az sonra tekrar dene.</p>
                  </div>
                ) : oneriler.length > 0 ? (
                  <div className="grid-communities grid-narrow">
                    {oneriler.map((o) => (
                      <CommunityCard
                        key={o.id}
                        community={o}
                        ilgiEtiketi={ilgiGerekcesi(o.eslesen_ilgiler, o.dogrudan_ilgiler)}
                      />
                    ))}
                  </div>
                ) : (
                  /* BOŞ AMA DÜRÜST. Kullanıcının etiketlerini ADIYLA geri
                     yazmak, ayarın gerçekten OKUNDUĞUNUN tek kanıtı — ölü
                     ayardan farkı tam olarak bu satır. */
                  <div className="empty-state">
                    <p>
                      {ilgiAlanlari.slice(0, 6).join(', ')}
                      {ilgiAlanlari.length > 6
                        ? ` ve ${ilgiAlanlari.length - 6} ilgi alanı daha`
                        : ''} ilgi
                      {ilgiAlanlari.length === 1 ? ' alanına' : ' alanlarına'} uyan,
                      henüz üyesi olmadığın topluluk yok.
                    </p>
                    <div className="row" style={{ gap: 'var(--s-2)', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <Link href="/kesfet" className="btn-secondary btn-sm">Toplulukları keşfet</Link>
                      <Link href="/ayarlar/ilgi-alanlari" className="btn-secondary btn-sm">
                        İlgi alanlarını düzenle
                      </Link>
                    </div>
                  </div>
                )}
              </section>
            )}

            <section>
              <SectionHead title="Topluluklar" />
              <div className="row" style={{ gap: 'var(--s-3)', marginBottom: 'var(--s-5)', flexWrap: 'wrap' }}>
                <SearchBox initialQuery={params.q ?? ''} />
                <CityFilter cities={cities} activeCity={activeCity ?? ''} />
              </div>

              {izgaraTopluluklari.length > 0 ? (
<div className="grid-communities grid-narrow">                  {izgaraTopluluklari.map((c) => <CommunityCard key={c.id} community={c} />)}
                </div>
              ) : !hasFilter && oneriler.length > 0 ? (
                /* Izgara boş çünkü kartların HEPSİ yukarıdaki öneri şeridine
                   gitti. "Henüz topluluk yok" demek, aynı ekranda duran
                   kartları yok saymak olurdu. */
                <div className="empty-state">
                  <p>Onaylı toplulukların tümü yukarıda, ilgi alanlarına göre listelendi.</p>
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

  // II. bölüm başlığı zaman iddiası taşıyor; sorgu haftayla sınırlı değil.
  // Hepsi yedi gün içindeyse "bu hafta", değilse "yakında". Sorguya .lte
  // eklemek istenmedi: bölüm çoğu hafta boşalır, "Masa boş" yanlış tetiklenir.
  // Date.now() react-hooks 'impure during render' kuralına takılıyor; dosyadaki
  // mevcut kalıp new Date() (etkinlik sorgusu) — aynısı.
  const yediGun = new Date().getTime() + 7 * 864e5
  const hepsiBuHafta = eventsWithSeri.length > 0 && eventsWithSeri.every((e) => new Date(e.event_date).getTime() <= yediGun)

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
        {/* Hücre 1: içerik ALTA yaslı, üstü bilerek boş. Sis hedefi (sis.tsx):
            sis hücreye oturur, ızgaranın boşluklarına ve beyaz hücreye taşmaz. */}
        <div
          id="sis-hucre-1"
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
              {yaklasanToplam > 0
                ? `yaklaşan ${yaklasanToplam} buluşma var`
                : 'buluşmalar başlıyor'}
              . Katıl ya da kendi masanı kur.
            </span>
          </h1>
        </div>

        {/* Hücre 2: GERÇEKLER — referansın "THE FACTS" bloğu, tek harfli
            alan etiketleriyle. */}
        <div id="sis-hucre-2" className="reveal" style={{ ...kunyeHucre, minHeight: 380, position: 'relative', overflow: 'hidden' }}>
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
              ['E', 'Etkinlik', String(yaklasanToplam)],
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
        {/* Referansta kilit bilgi paneli BEYAZ (THE FACTS kutusu, boyalı alanın
            %5.6'sı) — sayfadaki tek beyaz yüzey. Aynı rol burada; mavi yalnız
            metin ve düğme ölçeğinde kalır (referansta dolu mavi %1.2). */}
        <div
          className="reveal"
          style={{
            ...kunyeHucre,
            minHeight: 380,
            justifyContent: 'center',
            background: 'var(--paper-white)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <RolyefKap cizim={RolyefKahve} konum="sag-alt" olcek={1.0} opaklik={0.18} />
          <p
            style={{
              fontSize: 16,
              lineHeight: 1.55,
              letterSpacing: '.03em',
              textTransform: 'uppercase',
              color: 'var(--ink)',
              margin: 0,
            }}
          >
            Bir masanın etrafında toplanmak için bahane çok: kitap, yürüyüş,
            kahve, fotoğraf. Birkaç kişiyle başlayıp şehre yayılan bir şey
            olabilir.
          </p>
          <div style={{ display: 'flex', gap: 20, marginTop: 26, flexWrap: 'wrap' }}>
            <Link href="#etkinlikler" style={{ ...kunyeEtiket, fontSize: 11 }}>
              Etkinlikleri gör →
            </Link>
            <Link href="/community/new" style={{ ...kunyeEtiket, fontSize: 11, color: 'var(--muted)' }}>
              Topluluk kur →
            </Link>
          </div>
        </div>
      </section>

      {/* ---- Lejant: kategori indeksi ----
           14 kare kutu "uygulama ikon satırı" gibi okunuyordu; afişte
           kategoriler bir lejanttır. Aynı şekiller, kutusuz. */}
      <section className="container" style={{ paddingBlock: 'var(--s-5) var(--s-4)' }}>
        <Lejant activeSlug={activeSlug} activeCity={activeCity} query={params.q ?? null} />
      </section>

      {/* ---- II · BU HAFTA MASADA ----
           Masa kademesi 1: yalnız kenar. Etkinlik yoksa gri kutu yerine
           boş masanın kendisi konuşur — dürüst ve metaforla aynı cümlede. */}
      <Bolum
        id="etkinlikler"
        no="II"
        asama={1}
        kisa={eventsWithSeri.length === 0}
        baslik={eventsWithSeri.length > 0
          ? (cityLocative ? `${cityLocative} ${hepsiBuHafta ? 'bu hafta' : 'yakında'} masada` : (hepsiBuHafta ? 'Bu hafta masada' : 'Yakında masada'))
          : 'Masa boş'}
        alt={eventsWithSeri.length > 0
          ? <><span className="sayi">{yaklasanToplam}</span> yaklaşan buluşma. Birine otur.</>
          : (cityLocative
              ? `${cityLocative} henüz yaklaşan buluşma yok. İlk masayı kuran sen ol.`
              : 'Henüz yaklaşan buluşma yok. İlk masayı kuran sen ol.')}
        eylemler={eventsWithSeri.length > 0
          ? [{ href: '/kesfet', etiket: 'Tüm etkinlikler' }]
          : [{ href: '/event/new', etiket: 'Etkinlik oluştur' }, { href: '/kesfet', etiket: 'Toplulukları gör', ikincil: true }]}
      />
      {eventsWithSeri.length > 0 && (
        <section className="container section" aria-labelledby="etkinlikler-baslik" style={{ paddingTop: 'var(--s-6)' }}>
          <UpcomingEvents events={eventsWithSeri} />
        </section>
      )}

      {/* ---- III · MASALAR ----
           Masa kademesi 2: tabaklar geliyor. Kart ızgarası değil PROGRAM:
           afiş dilinde satırlar. Kartlar /kesfet'te (afiş ≠ katalog). */}
      <Bolum
        id="topluluklar"
        no="III"
        asama={2}
        baslik={communities.length > 0
          ? (communities.length < 24
              ? <><span className="sayi">{communities.length}</span> masa{cityLocative ? `, ${cityLocative}` : ''}</>
              : `Masalar${cityLocative ? `, ${cityLocative}` : ''}`)   // sorgu .limit(24): kırpılmış sayı basılmaz
          : 'Henüz masa yok'}
        alt={communities.length > 0
          ? 'Her biri bir konu, bir şehir, birkaç kişiyle başlamış. Katıl ya da kendininkini kur.'
          : 'İlk masayı sen kur; gerisi gelir.'}
        eylemler={[{ href: '/kesfet?tab=topluluklar', etiket: 'Tümünü gör' }]}   // 'Topluluk kur' bir kaydırma sonra V'te düğme; refren üçten ikiye
      />
      <section className="container" aria-labelledby="topluluklar-baslik" style={{ paddingTop: 'var(--s-6)', paddingBottom: 'var(--s-6)' }}>
        <div className="row" style={{ gap: 'var(--s-3)', marginBottom: 'var(--s-5)', flexWrap: 'wrap' }}>
          <SearchBox initialQuery={params.q ?? ''} />
          <CityFilter cities={cities} activeCity={activeCity ?? ''} />
        </div>
        {communities.length > 0 ? (
          <Program topluluklar={communities} />
        ) : (
          <div className="empty-state">
            <p>{hasFilter ? 'Bu filtreye uygun topluluk yok.' : 'Henüz topluluk yok.'}</p>
            <Link href="/community/new" className="btn-primary btn-sm">Topluluk kur</Link>
          </div>
        )}
      </section>

      {/* ---- IV · NASIL OTURULUR ---- Masa kademesi 3: fincanlar. */}
      <Bolum id="nasil" no="IV" asama={3} baslik="Nasıl oturulur" alt="Üç adım. Üçüncüsü kahvenin işi." />
      <section className="container" aria-labelledby="nasil-baslik" style={{ paddingTop: 'var(--s-6)', paddingBottom: 'var(--s-6)' }}>
        <HowItWorks />
      </section>

      {/* ---- V · MASAYI SEN KUR ----
           Masa kademesi 4: tam kurulu, tam opak — sayfanın son sözü.
           Künyedeki davet hücresiyle AYNI mavi: açılış ve kapanış refren. Eski
           ortalanmış kapanış ve noktalı zemin gitti; bölüm dilinin kendisi
           kapanış oldu. */}
      <div style={{ paddingBottom: 8 }}>
        <Bolum
          id="kur"
          no="V"
          asama={4}
          vurgu
          baslik="Masayı sen kur"
          alt="Konu senden, masa bizden. İki dakikada kurulur, ilk buluşmayı bu hafta yapabilirsin."
          eylemler={[{ href: '/community/new', etiket: 'Topluluk kur', dugme: true }, { href: '/hakkinda', etiket: 'literaslab nedir', ikincil: true }]}
        />
      </div>

    </main>
  )
}
