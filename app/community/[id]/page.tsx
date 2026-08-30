import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { byValue } from '@/lib/categories'
import { GlossyIcon } from '@/components/category-art'
import { RolyefMasa, RolyefKahve, RolyefKitap, RolyefSandalye, RolyefSehir, RolyefKap } from '@/components/rolyef'
import MemberActions from './member-actions'
import JoinButton from './join-button'
import ReportButton from '@/components/report-button'
import Duyurular from './duyurular'
import type { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()

  const { data: community } = await supabase
    .from('communities')
    .select('name, description, city, cover_image_url, status')
    .eq('id', id)
    .single()

  if (!community || (community as any).status !== 'approved') {
    return { title: 'Topluluk bulunamadı' }
  }

  const desc = community.description
    ? community.description.slice(0, 160)
    : `${community.city}'da bir topluluk. Katılmak için literaslab'a gel.`

  const images = community.cover_image_url ? [community.cover_image_url] : []

  return {
    title: community.name,
    description: desc,
    openGraph: {
      title: community.name,
      description: desc,
      type: 'article',
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title: community.name,
      description: desc,
      images,
    },
  }
}

export const dynamic = 'force-dynamic'

const TZ = 'Europe/Istanbul'
const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
const MONTHS_TR_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

/** İstanbul gününe göre { y, m (0-11), d } */
function istParts(date: Date) {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric',
  }).formatToParts(date)
  const g = (t: string) => Number(p.find((x) => x.type === t)?.value ?? '0')
  return { y: g('year'), m: g('month') - 1, d: g('day') }
}

function istDayKey(date: Date): string {
  const { y, m, d } = istParts(date)
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function istTime(date: Date): string {
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date)
}

/**
 * Kategori -> rölyef. ANAHTAR: kanonik ASCII slug.
 *
 * DİKKAT: ham `category` değerini indeksleme. Veritabanı TÜRKÇE AKSANLI
 * değer tutuyor ('fotoğraf', 'yürüyüş'), bu tablonun anahtarları ise ASCII.
 * Ham değerle indeksleyince neredeyse her kategori masaya düşüyordu --
 * canlıda "Fotoğraf" ve "Doğa" kartları aynı rölyefi gösteriyordu.
 * byValue() eşlemeyi zaten doğru yapıyor (değer, slug, Türkçe küçültme ve
 * takma ad sırasıyla); slug'ı ondan al.
 */
const ROLYEF: Record<string, (p: { className?: string; style?: React.CSSProperties }) => React.JSX.Element> = {
  kitap: RolyefKitap, dil: RolyefKitap, sinema: RolyefKitap,
  lezzet: RolyefKahve, sosyal: RolyefKahve, kariyer: RolyefKahve,
  doga: RolyefSehir, fotograf: RolyefSehir, gonulluluk: RolyefSehir,
  muzik: RolyefSandalye, sanat: RolyefSandalye, oyun: RolyefSandalye, spor: RolyefSandalye,
}

export default async function CommunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: community } = await supabase
    .from('communities')
    .select(`
      id,
      name,
      description,
      city,
      category,
      cover_image_url,
      created_at,
      status,
      founder_id
    `)
    .eq('id', id)
    .single()

  if (!community) {
    notFound()
  }

  // Kurucu bilgisi herkese açık vitrinden (e-posta vb. özel alanlar kapalı)
  const { data: founderProfile } = await supabase
    .from('public_profiles')
    .select('name')
    .eq('id', (community as any).founder_id)
    .maybeSingle()

  const { data: { user } } = await supabase.auth.getUser()

  let isSiteAdmin = false
  if (user) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle()
    isSiteAdmin = !!prof?.is_admin
  }

  const isFounderOfThis = !!user && (community as any).founder_id === user.id
  const canSeeDraft = isFounderOfThis || isSiteAdmin

  if ((community as any).status !== 'approved' && !canSeeDraft) {
    notFound()
  }

  const { data: membershipRows } = await supabase
    .from('community_members')
    .select('id, role, status, user_id')
    .eq('community_id', id)

  // Üye profilleri vitrinden toplu çekilip üyelik satırlarına bağlanır
  const memberIds = (membershipRows ?? []).map((m: any) => m.user_id).filter(Boolean)
  const { data: memberProfiles } = memberIds.length > 0
    ? await supabase
        .from('public_profiles')
        .select('id, name, avatar_url')
        .in('id', memberIds)
    : { data: [] as any[] }
  const memberProfileById = new Map((memberProfiles ?? []).map((p: any) => [p.id, p]))
  const allMemberships = (membershipRows ?? []).map((m: any) => ({
    ...m,
    user: memberProfileById.get(m.user_id) ?? null,
  }))

  const approvedMembers = (allMemberships ?? []).filter((m: any) => m.status === 'approved')
  const pendingMembers = (allMemberships ?? []).filter((m: any) => m.status === 'pending')

  const memberCount = approvedMembers.length
  const founderName = founderProfile?.name ?? 'biri'

  const currentUserMembership = (allMemberships ?? []).find((m: any) => m.user_id === user?.id)
  const isFounder = currentUserMembership?.role === 'founder' && currentUserMembership?.status === 'approved'
  const isAdmin = currentUserMembership?.role === 'admin' && currentUserMembership?.status === 'approved'
  const isPending = currentUserMembership?.status === 'pending'
  const canModerate = isFounder || isAdmin
  const isApprovedMember = currentUserMembership?.status === 'approved'

  /* --- Etkinlikler: yaklaşanlar + son geçmişler (zaman çizelgesi ve takvim) --- */

  const nowIso = new Date().toISOString()

  // Takvim bu ayı (İstanbul) çiziyor; ay sınırlarını sorgudan önce hesapla.
  const nowIst = istParts(new Date())
  const calY = nowIst.y
  const calM = nowIst.m
  // Türkiye 2016'dan beri yaz saati uygulamıyor, ofset sabit +03:00 — bu yüzden
  // İstanbul ayı başlangıcı/bitişi UTC'ye 3 saat geri kaydırılarak bulunuyor.
  const ayBasiIso = new Date(Date.UTC(calY, calM, 1) - 3 * 60 * 60 * 1000).toISOString()
  const aySonuIso = new Date(Date.UTC(calY, calM + 1, 1) - 3 * 60 * 60 * 1000).toISOString()

  const [upcomingRes, pastRes, takvimRes] = await Promise.all([
    supabase
      .from('etkinlik_vitrin')
      .select('id, title, location, event_date, cover_image_url, series_id')
      .eq('community_id', id)
      .gte('event_date', nowIso)
      .order('event_date', { ascending: true })
      .limit(20),
    supabase
      .from('events')
      .select('id, title, location, event_date, cover_image_url')
      .eq('community_id', id)
      .lt('event_date', nowIso)
      .order('event_date', { ascending: false })
      .limit(6),
    // Takvim, seriyi katlamış "yaklaşan" listesinden değil doğrudan events'ten
    // besleniyor — aksi halde serinin yalnızca ilk günü işaretlenirdi.
    supabase
      .from('events')
      .select('event_date')
      .eq('community_id', id)
      .gte('event_date', ayBasiIso)
      .lt('event_date', aySonuIso),
  ])
  const upcoming = upcomingRes.data ?? []
  const past = pastRes.data ?? []

  /** Tarihe göre grupla: [{ key, label, items }] */
  function groupByDay(list: any[]) {
    const groups: { key: string; label: string; items: any[] }[] = []
    for (const ev of list) {
      const dt = new Date(ev.event_date)
      const key = istDayKey(dt)
      const { m, d } = istParts(dt)
      const weekday = new Intl.DateTimeFormat('tr-TR', { timeZone: TZ, weekday: 'long' }).format(dt)
      const label = `${d} ${MONTHS_TR_SHORT[m]} · ${weekday}`
      const last = groups[groups.length - 1]
      if (last && last.key === key) last.items.push(ev)
      else groups.push({ key, label, items: [ev] })
    }
    return groups
  }

  const upcomingGroups = groupByDay(upcoming)
  const pastGroups = groupByDay(past)

  /* --- Takvim: bu ay (İstanbul), etkinlik olan günlerde nokta --- */
  /* nowIst/calY/calM yukarıda, sorgulardan önce hesaplandı. */

  const daysInMonth = new Date(Date.UTC(calY, calM + 1, 0)).getUTCDate()
  // Pazartesi başlangıçlı ofset
  const firstDow = (new Date(Date.UTC(calY, calM, 1)).getUTCDay() + 6) % 7
  const eventDays = new Set(
    (takvimRes.data ?? [])
      .map((ev: any) => istParts(new Date(ev.event_date)))
      .filter((p) => p.y === calY && p.m === calM)
      .map((p) => p.d)
  )
  const todayD = nowIst.d

  const hasCover = !!community.cover_image_url

  return (
    <main id="content" className="cp">
      {/* ============ BANNER ============
          RolyefKap genişliği YÜZDEYLE veriyor ve en/boy oranı 1:1. Banner
          32:9 olduğu için ölçek 1.1'de rölyef kutunun üç katı boya çıkıp
          korkunç kırpılıyordu. 0.42 genişliğin ~%33'ü demek, banner
          yüksekliğinin altında kalıyor. */}
      <div className="cp-wrap">
        <div className="cp-banner">
          {hasCover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={community.cover_image_url} alt="" className="cp-banner-img" />
          ) : (
            <RolyefKap
              cizim={ROLYEF[byValue((community as any).category)?.slug ?? ''] ?? RolyefMasa}
              konum="sag-alt"
              olcek={0.42}
              opaklik={0.16}
            />
          )}
        </div>

        {/* Amblem + katıl satırı — banner'a biner */}
        <div className="cp-idrow">
          <span className="cp-emblem">
            <GlossyIcon value={(community as any).category ?? null} size={52} />
          </span>
          <span className="cp-idrow-spacer" />
          {user && !currentUserMembership && (
            <JoinButton communityId={community.id} userId={user.id} />
          )}
          {!user && (
            <Link href="/login" className="btn-primary btn-sm">Katılmak için giriş yap</Link>
          )}
        </div>

        {/* Kimlik */}
        <header className="cp-head">
          <h1 className="cp-name">{community.name}</h1>
          <p className="cp-meta">
            <span>{community.city}</span>
            <i aria-hidden="true">·</i>
            <span>{memberCount} üye</span>
            <i aria-hidden="true">·</i>
            <span>{founderName} kurdu</span>
          </p>
          {community.description && (
            <p className="cp-desc">{community.description}</p>
          )}

          {isPending && (
            <p className="cp-pending">
              <span aria-hidden="true" />
              isteğin bekliyor · kurucu onaylayınca haberin olur
            </p>
          )}
        </header>

        {/* ============ GÖVDE: sol çizelge + sağ takvim ============ */}
        <div className="cp-grid">
          {/* ---- SOL ---- */}
          <div className="cp-main">
            {canModerate && pendingMembers.length > 0 && (
              <section className="cp-block">
                <h2 className="cp-h2">Bekleyen istekler</h2>
                <div className="cp-rows">
                  {pendingMembers.map((m: any) => (
                    <div key={m.id} className="cp-member">
                      <div className="cp-member-id">
                        {m.user?.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.user.avatar_url} alt="" className="cp-ava" />
                        ) : (
                          <span className="cp-ava cp-ava-ph">{m.user?.name?.[0]?.toUpperCase() ?? '?'}</span>
                        )}
                        <Link href={`/profile/${m.user_id}`} className="cp-member-name">
                          {m.user?.name}
                        </Link>
                      </div>
                      <div className="cp-member-acts">
                        <MemberActions memberId={m.id} action="approve" />
                        <MemberActions memberId={m.id} action="reject" />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {isApprovedMember && (
              <Duyurular communityId={community.id} yonetici={canModerate} />
            )}

            <section className="cp-block">
              <h2 className="cp-h2">Etkinlikler</h2>

              {upcomingGroups.length === 0 && (
                <div className="cp-empty">
                  <p>Henüz planlanmış bir buluşma yok.</p>
                  {(isFounder || isAdmin) && (
                    <Link href={`/event/new?community=${community.id}`} className="btn-primary btn-sm">
                      İlk buluşmayı planla
                    </Link>
                  )}
                </div>
              )}

              {upcomingGroups.map((g) => (
                <div key={g.key} className="cp-day">
                  <div className="cp-day-head">
                    <span className="cp-day-dot" aria-hidden="true" />
                    <span className="cp-day-label">{g.label}</span>
                  </div>
                  <div className="cp-day-items">
                    {g.items.map((ev: any) => (
                      <Link key={ev.id} href={`/event/${ev.id}`} className="cp-ev">
                        <span className="cp-ev-txt">
                          <i className="cp-ev-time">{istTime(new Date(ev.event_date))}</i>
                          <b className="cp-ev-title">{ev.title}</b>
                          {ev.location && <i className="cp-ev-loc">{ev.location}</i>}
                        </span>
                        <span className="cp-ev-thumb" style={{ background: hasCoverThumb(ev) ? undefined : 'var(--panel)' }}>
                          {hasCoverThumb(ev) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={ev.cover_image_url} alt="" />
                          ) : (
                            <GlossyIcon value={(community as any).category ?? null} size={34} />
                          )}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}

              {pastGroups.length > 0 && (
                <>
                  <h3 className="cp-h3">Geçmiş</h3>
                  {pastGroups.map((g) => (
                    <div key={g.key} className="cp-day cp-day-past">
                      <div className="cp-day-head">
                        <span className="cp-day-dot" aria-hidden="true" />
                        <span className="cp-day-label">{g.label}</span>
                      </div>
                      <div className="cp-day-items">
                        {g.items.map((ev: any) => (
                          <Link key={ev.id} href={`/event/${ev.id}`} className="cp-ev">
                            <span className="cp-ev-txt">
                              <i className="cp-ev-time">{istTime(new Date(ev.event_date))}</i>
                              <b className="cp-ev-title">{ev.title}</b>
                              {ev.location && <i className="cp-ev-loc">{ev.location}</i>}
                            </span>
                            <span className="cp-ev-thumb" style={{ background: hasCoverThumb(ev) ? undefined : 'var(--panel)' }}>
                              {hasCoverThumb(ev) ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={ev.cover_image_url} alt="" />
                              ) : (
                                <GlossyIcon value={(community as any).category ?? null} size={34} />
                              )}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </section>

            <section className="cp-block">
              <h2 className="cp-h2">Üyeler</h2>
              <div className="cp-rows">
                {approvedMembers.map((m: any) => (
                  <div key={m.id} className="cp-member">
                    <div className="cp-member-id">
                      {m.user?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.user.avatar_url} alt="" className="cp-ava" />
                      ) : (
                        <span className="cp-ava cp-ava-ph">{m.user?.name?.[0]?.toUpperCase() ?? '?'}</span>
                      )}
                      <Link href={`/profile/${m.user_id}`} className="cp-member-name">
                        {m.user?.name}
                      </Link>
                      {m.role === 'founder' && <span className="cp-role">kurucu</span>}
                      {m.role === 'admin' && <span className="cp-role">yönetici</span>}
                    </div>
                    {isFounder && m.role !== 'founder' && (
                      <MemberActions
                        memberId={m.id}
                        action="toggle-admin"
                        currentRole={m.role as 'member' | 'admin'}
                      />
                    )}
                  </div>
                ))}
              </div>
            </section>

            {user && !isFounderOfThis && !canModerate && (
              <div className="cp-report">
                <ReportButton targetType="community" targetId={community.id} />
              </div>
            )}
          </div>

          {/* ---- SAĞ: takvim ---- */}
          <aside className="cp-side">
            <div className="cp-sticky">
              <div className="cp-cal">
                <div className="cp-cal-head">
                  <b>{MONTHS_TR[calM]} {calY}</b>
                </div>
                <div className="cp-cal-panel">
                <div className="cp-cal-grid" role="grid" aria-label={`${MONTHS_TR[calM]} takvimi`}>
                  {['P', 'S', 'Ç', 'P', 'C', 'C', 'P'].map((d, i) => (
                    <span key={`h${i}`} className="cp-cal-dow">{d}</span>
                  ))}
                  {Array.from({ length: firstDow }).map((_, i) => (
                    <span key={`b${i}`} />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const d = i + 1
                    const has = eventDays.has(d)
                    const isToday = d === todayD
                    return (
                      <span
                        key={d}
                        className={`cp-cal-day${isToday ? ' today' : ''}${has ? ' has' : ''}`}
                      >
                        {d}
                        {has && <i aria-hidden="true" />}
                      </span>
                    )
                  })}
                </div>
                </div>
              </div>

              <div className="cp-stat">
                <b>{upcoming.length}</b>
                <span>yaklaşan buluşma</span>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <style>{`
        .cp-wrap { max-width: var(--w-page); margin: 0 auto; padding: var(--s-5) var(--s-5) var(--s-9); }

        /* ---------- Banner ---------- */
        /* Eski hâli #14171F koyu zemin + #232733 çerçeve + ızgara deseni +
           iki bulanık renkli parlamaydı. Etkinlik detayındaki bantla aynı
           sorundu: ölçüm referansta ne koyu bant, ne gölge, ne çerçeve
           buluyor. Kapak yoksa yerini sessiz bir rölyef alıyor. */
        .cp-banner {
          position: relative;
          border-radius: var(--r-md);
          overflow: hidden;
          aspect-ratio: 32 / 9;
          background: var(--paper-cream);
        }
        .cp-banner-img { width: 100%; height: 100%; object-fit: cover; display: block; }

        /* ---------- Amblem satırı ---------- */
        .cp-idrow {
          display: flex; align-items: flex-end; gap: var(--s-4);
          margin-top: -34px;
          padding: 0 var(--s-5);
          position: relative; z-index: 1;
        }
        .cp-emblem {
          display: grid; place-items: center;
          width: 84px; height: 84px;
          border-radius: var(--r-md);
          background: var(--paper-cream);
        }
        .cp-idrow-spacer { flex: 1; }

        /* ---------- Kimlik ---------- */
        .cp-head { padding: var(--s-4) var(--s-5) 0; }
        .cp-name {
          font-family: var(--font-serif), Georgia, serif;
          font-weight: 400;
          font-size: clamp(26px, 3.2vw, 40px);
          line-height: 1.16;
          letter-spacing: .02em;
          color: var(--ink);
          text-wrap: balance;
        }
        .cp-meta {
          display: flex; align-items: baseline; flex-wrap: wrap; gap: var(--s-2);
          margin-top: var(--s-3);
          font-size: var(--t-sm);
          color: var(--muted);
        }
        .cp-meta i { font-style: normal; color: var(--border-mid); }
        .cp-desc {
          margin-top: var(--s-4);
          font-size: 16px;
          line-height: 1.65;
          color: var(--ink);
          max-width: 68ch;
        }
        .cp-pending {
          display: inline-flex; align-items: center; gap: var(--s-2);
          margin-top: var(--s-4);
          font-family: var(--font-mono), monospace;
          font-size: var(--t-xs);
          /* Çerçeve rgba(155,47,208,.3) idi: MOR. Temmuz paletinden kalma,
             sitede başka hiçbir yerde yok. */
          color: var(--ink);
          background: var(--panel);
          padding: 7px 14px;
          border-radius: var(--r-md);
        }
        .cp-pending span {
          width: 7px; height: 7px; border-radius: 50%;
          background: var(--coral);
        }

        /* ---------- Gövde ---------- */
        .cp-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: var(--s-7);
          align-items: start;
          margin-top: var(--s-7);
          padding: 0 var(--s-5);
        }
        @media (min-width: 900px) {
          .cp-grid { grid-template-columns: minmax(0, 1fr) 300px; }
        }

        .cp-block + .cp-block { margin-top: var(--s-7); }
        .cp-h2 {
          font-family: var(--font-serif), Georgia, serif;
          font-size: 18px;
          font-weight: 400;
          letter-spacing: .04em;
          line-height: 1.2;
          text-transform: uppercase;   /* ölçüldü: referansta bölüm başlıkları büyük harf */
          color: var(--ink);
          padding-bottom: var(--s-3);
          margin-bottom: var(--s-4);
        }
        .cp-h3 {
          font-family: var(--font-mono), monospace;
          font-size: 10px;
          font-weight: 400;
          color: var(--muted);
          margin: var(--s-6) 0 var(--s-3);
          text-transform: uppercase;
          letter-spacing: .16em;
        }

        /* ---------- Zaman çizelgesi ---------- */
        .cp-day { position: relative; padding-left: 22px; }
        .cp-day + .cp-day { margin-top: var(--s-5); }
        /* Dikey çizgi: Luma'daki gibi tarihleri bağlar */
        .cp-day::before {
          content: "";
          position: absolute; left: 5px; top: 8px; bottom: -18px;
          width: 2px;
          background: var(--border);
        }
        .cp-day:last-child::before { bottom: 0; }
        .cp-day-head { display: flex; align-items: center; gap: var(--s-3); }
        .cp-day-dot {
          position: absolute; left: 0; top: 5px;
          width: 12px; height: 12px; border-radius: 50%;
          background: var(--paper);
          border: 2.5px solid var(--ink);
        }
        .cp-day-past .cp-day-dot { border-color: var(--border-mid); }
        .cp-day-label { font-family: var(--font-mono), monospace; font-size: var(--t-xs); letter-spacing: .1em; text-transform: uppercase; font-weight: 400; color: var(--ink); }
        .cp-day-past .cp-day-label { color: var(--muted); }

        .cp-day-items { display: flex; flex-direction: column; gap: var(--s-3); margin-top: var(--s-3); }
        .cp-ev {
          display: flex; align-items: center; gap: var(--s-4);
          background: var(--paper-cream);
          border-radius: var(--r-md);
          padding: var(--s-3) var(--s-4);
          text-decoration: none;
          transition: transform .15s var(--ease), background .15s var(--ease);
        }
        .cp-ev:hover {
          transform: translateY(-1px);
          background: var(--panel);
        }
        .cp-ev-txt { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
        .cp-ev-time { font-style: normal; font-family: var(--font-mono), monospace; font-size: var(--t-xs); color: var(--muted); }
        .cp-ev-title {
          font-size: var(--t-md); font-weight: 400; letter-spacing: .02em; color: var(--ink);
          overflow: hidden; text-overflow: ellipsis;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
        }
        .cp-ev-loc { font-style: normal; font-size: var(--t-xs); color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cp-ev-thumb {
          flex: none; width: 64px; height: 64px;
          border-radius: var(--r-sm); overflow: hidden;
          display: grid; place-items: center;
        }
        .cp-ev-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .cp-day-past .cp-ev { opacity: .75; }
        .cp-day-past .cp-ev:hover { opacity: 1; }

        .cp-empty {
          border: 1px dashed var(--border-mid);
          border-radius: var(--r-md);
          background: var(--paper-cream);
          padding: var(--s-6) var(--s-5);
          text-align: center;
          display: flex; flex-direction: column; align-items: center; gap: var(--s-4);
        }
        .cp-empty p { color: var(--muted); margin: 0; }

        /* ---------- Üye satırları ---------- */
        .cp-rows { display: flex; flex-direction: column; gap: var(--s-2); }
        .cp-member {
          display: flex; justify-content: space-between; align-items: center;
          gap: var(--s-3); flex-wrap: wrap;
          padding: var(--s-3) var(--s-4);
          background: var(--paper-cream);
          border-radius: var(--r-md);
        }
        .cp-member-id { display: flex; align-items: center; gap: var(--s-3); flex: 1; min-width: 0; }
        .cp-member-name { font-weight: 400; letter-spacing: .02em; color: var(--ink); }
        .cp-member-acts { display: flex; gap: var(--s-2); }
        .cp-ava {
          width: 36px; height: 36px; border-radius: 50%;
          object-fit: cover; border: 1px solid var(--border); flex-shrink: 0;
        }
        .cp-ava-ph {
          display: grid; place-items: center;
          background: var(--paper-soft); color: var(--ink);
          font-size: 14px; font-weight: 400;
        }
        .cp-role {
          background: var(--panel);
          color: var(--ink);
          font-family: var(--font-mono), monospace;
          font-size: var(--t-2xs); font-weight: 400; letter-spacing: .1em;
          text-transform: uppercase;
          padding: 3px 9px; border-radius: var(--r-sm);
        }
        .cp-report { margin-top: var(--s-7); text-align: center; padding-top: var(--s-5); border-top: 1px dashed var(--border); }

        /* ---------- Takvim ---------- */
        .cp-sticky { position: sticky; top: var(--s-5); display: flex; flex-direction: column; gap: var(--s-4); }
        .cp-cal {
          background: var(--paper-cream);
          border-radius: var(--r-md);
          padding: var(--s-4);
        }
        /* İÇ PANEL — ay ızgarası kartın içinde ikinci yüzeye oturuyor,
           referansın "The Facts" kutusuyla aynı rol. */
        .cp-cal-panel {
          background: var(--panel);
          border-radius: var(--r-md);
          padding: 10px;
        }
        .cp-cal-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: var(--s-3); }
        .cp-cal-head b { font-family: var(--font-mono), monospace; font-size: 10px; font-weight: 400; letter-spacing: .16em; text-transform: uppercase; color: var(--ink); }
        .cp-cal-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 2px;
          text-align: center;
        }
        .cp-cal-dow {
          font-family: var(--font-mono), monospace;
          font-size: 10px; color: var(--muted-light);
          padding-bottom: 4px;
        }
        .cp-cal-day {
          position: relative;
          font-family: var(--font-mono), monospace;   /* rakam: Marcellus'un 1'i I'ya benziyor */
          font-variant-numeric: tabular-nums;
          font-size: var(--t-xs);
          color: var(--ink);
          padding: 6px 0 9px;
          border-radius: var(--r-sm);
        }
        .cp-cal-day.today {
          background: var(--ink);
          color: #fff;
        }
        .cp-cal-day.has i {
          position: absolute; left: 50%; bottom: 3px;
          transform: translateX(-50%);
          width: 4px; height: 4px; border-radius: 50%;
          background: var(--coral);
        }
        .cp-cal-day.today.has i { background: var(--lime); }

        .cp-stat {
          background: var(--paper-cream);
          border-radius: var(--r-md);
          padding: var(--s-4) var(--s-5);
          display: flex; align-items: baseline; gap: var(--s-2);
        }
        .cp-stat b {
          font-family: var(--font-mono), monospace;   /* sayı */
          font-variant-numeric: tabular-nums;
          font-size: var(--t-2xl); font-weight: 400; color: var(--ink);
        }
        .cp-stat span { font-size: var(--t-sm); color: var(--muted); }

        /* ---------- Mobil ---------- */
        @media (max-width: 640px) {
          .cp-wrap { padding: var(--s-4) var(--s-4) var(--s-8); }
          .cp-banner { aspect-ratio: 21 / 9; }
          .cp-idrow { padding: 0 var(--s-3); margin-top: -28px; }
          .cp-emblem { width: 68px; height: 68px; }
          .cp-head { padding: var(--s-3) var(--s-3) 0; }
          .cp-grid { padding: 0 var(--s-3); }
          .cp-ev-thumb { width: 52px; height: 52px; }
        }
      `}</style>
    </main>
  )
}

function hasCoverThumb(ev: any): boolean {
  return !!ev.cover_image_url
}
