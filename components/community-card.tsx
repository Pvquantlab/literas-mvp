import Link from 'next/link'
import Image from 'next/image'
import { byValue } from '@/lib/categories'
import CommunityEmblem from './community-emblem'

export type CommunitySummary = {
  id: string
  name: string
  city: string | null
  category: string | null
  cover_image_url: string | null
  member_count?: number | null
  /** Kurucunun görünen adı. Yoksa rozet gösterilmez. */
  founder_name?: string | null
  /** Önümüzdeki 7 gündeki etkinlik sayısı. Yoksa canlılık rozeti gizlenir. */
  upcoming_count?: number | null
}

/**
 * Bu bileşen page.tsx'te iki kez birebir kopyalanmıştı (giriş yapmış /
 * yapmamış dalları). Artık tek yerde — bir düzeltme her ikisini de kapsar.
 *
 * KAHRAMAN ÖĞE: etkinlik kartında büyük serif tarih rakamı nerede duruyorsa,
 * burada üye sayısı orada duruyor. Kullanıcı bir bakışta "grup mu, an mı"
 * ayırt etsin diye.
 *
 * YENİ TOPLULUK EŞİĞİ: 5 üyenin altındaki topluluklarda büyük rakam
 * gösterilmiyor. Punto 40'la yazılmış bir "1" topluluğu canlı değil, terk
 * edilmiş gösterir. Onun yerine "yeni açıldı" + kurucu + "İlk sen katıl".
 * Site büyüdükçe kartlar kendiliğinden ikinci hâle geçer.
 *
 * GÖSTERİLMEYENLER — veritabanında karşılıkları yok, uydurulmuyor:
 *   · kapasite ("6/8 koltuk dolu") — topluluklarda kapasite kolonu yok,
 *     masa herkese açık
 *   · mesaj sayısı — mesajlaşma sistemi yok
 *   · üye yüzleri (facepile) — community_members'a anon erişimi kapalı,
 *     bu bir gizlilik kararı. Karar verilince buraya eklenir.
 */

const FRESH_BELOW = 5

export default function CommunityCard({ community }: { community: CommunitySummary }) {
  const cat = byValue(community.category)
  const members = community.member_count ?? 0
  const fresh = members < FRESH_BELOW
  const upcoming = community.upcoming_count ?? 0

  return (
    <Link href={`/community/${community.id}`} className="cm-link reveal">
      <article className="cm-card">
        <div className="cm-cover">
          {community.cover_image_url ? (
            <Image
              src={community.cover_image_url}
              alt=""
              fill
              sizes="(max-width: 620px) 100vw, (max-width: 1000px) 50vw, 33vw"
              style={{ objectFit: 'cover' }}
            />
          ) : (
            // Kapağın tamamı tek SVG: mesh zemin + tel kafesler + amblem.
            // Ayrı .cm-bg katmanı kalktı, zemin artık kapağın içinde.
            <CommunityEmblem id={community.id} category={community.category} className="cm-art" />
          )}

          {cat && <span className="cm-pill">{cat.label}</span>}
          {fresh && <span className="cm-new">yeni açıldı</span>}
        </div>

        <div className="cm-body">
          <h3 className="cm-title">{community.name}</h3>
          <p className="cm-meta">{[cat?.label, community.city].filter(Boolean).join(' · ')}</p>

          <div className="cm-hero">
            {fresh ? (
              <span className="cm-founder">
                {community.founder_name ? `${community.founder_name} kurdu` : 'yeni bir masa'}
              </span>
            ) : (
              <span className="cm-count">
                <b>{members}</b> üye
              </span>
            )}

            {upcoming > 0 && <span className="cm-live">bu hafta {upcoming} buluşma</span>}
          </div>

          <div className="cm-foot">
            <span className="cm-open">herkese açık</span>
            <span className={fresh ? 'cm-go ghost' : 'cm-go'} aria-hidden="true">
              {fresh ? 'İlk sen katıl' : 'Katıl'}
            </span>
          </div>
        </div>
      </article>

      <style>{`
        .cm-link { display:block; text-decoration:none; color:inherit; height:100%; }
        .cm-card {
          --clay: 10px 14px 26px rgba(15, 46, 92,.13),
                  inset -5px -7px 12px rgba(15, 46, 92,.14),
                  inset 5px 7px 14px rgba(255,255,255,.70);
          --clay-hi: 16px 24px 38px rgba(15, 46, 92,.19),
                     inset -5px -7px 12px rgba(15, 46, 92,.14),
                     inset 6px 8px 16px rgba(255,255,255,.78);
          position:relative; display:flex; flex-direction:column; height:100%;
          padding:16px; border-radius:30px;
          background:var(--paper-cream, #FFF);
          border:1px solid var(--border, #E8E5DD);
          box-shadow:var(--clay);
          transition:transform .4s var(--ease, cubic-bezier(.2,.8,.3,1)), box-shadow .4s ease;
        }
        .cm-link:hover .cm-card { transform:translateY(-6px); box-shadow:var(--clay-hi); }
        .cm-cover {
          position:relative; height:172px; border-radius:22px; overflow:hidden;
          display:grid; place-items:center;
          box-shadow:inset 0 0 0 1px rgba(15, 46, 92,.16);
        }
        .cm-art {
          position:absolute; inset:0;
          transition:transform .6s var(--ease, cubic-bezier(.2,.8,.3,1));
        }
        .cm-link:hover .cm-art { transform:scale(1.06); }
        .cm-cover::after {
          content:""; position:absolute; inset:0; pointer-events:none;
          background:linear-gradient(180deg,
            rgba(12, 27, 142,.10) 0%, rgba(12, 27, 142,0) 42%, rgba(12, 27, 142,.16) 100%);
        }
        .cm-pill {
          position:absolute; top:12px; left:12px; z-index:3;
          font-family:var(--font-mono), monospace; font-size:11px;
          color:var(--ink, #1E3A2B); background:rgba(255,255,255,.93);
          padding:6px 12px; border-radius:var(--r-pill, 999px);
        }
        .cm-new {
          position:absolute; top:12px; right:12px; z-index:3;
          font-family:var(--font-mono), monospace; font-size:10px; letter-spacing:.06em;
          color:var(--ink, #1E3A2B); background:var(--yellow-highlight, #FFD84D);
          padding:5px 10px; border-radius:var(--r-pill, 999px);
        }
        .cm-body { padding:16px 4px 0; display:flex; flex-direction:column; flex:1; }
        .cm-title {
          font-family:var(--font-serif), Georgia, serif; font-weight:600;
          font-size:21px; line-height:1.2; letter-spacing:-.005em;
          color:var(--ink, #1E3A2B); margin:0;
        }
        .cm-meta {
          font-family:var(--font-mono), monospace; font-size:12px;
          color:var(--muted, #5C5744); margin:5px 0 0;
        }
        .cm-hero {
          display:flex; align-items:baseline; justify-content:space-between;
          gap:10px; margin-top:14px; flex-wrap:wrap;
        }
        .cm-count { font-family:var(--font-mono), monospace; font-size:12px; color:var(--muted, #5C5744); }
        .cm-count b {
          font-size:34px; font-weight:500; line-height:1; letter-spacing:-.03em;
          color:var(--ink, #1E3A2B); margin-right:5px;
        }
        .cm-founder { font-family:var(--font-mono), monospace; font-size:12px; color:var(--muted, #5C5744); }
        .cm-live {
          display:inline-flex; align-items:center; gap:7px;
          font-family:var(--font-mono), monospace; font-size:11px;
          color:var(--muted, #5C5744); background:var(--paper-soft, #F4F2EC);
          border:1px solid var(--border, #E8E5DD);
          padding:5px 11px; border-radius:var(--r-pill, 999px); white-space:nowrap;
        }
        .cm-live::before {
          content:""; width:6px; height:6px; border-radius:50%;
          background:var(--lime, #C8EB4B); box-shadow:0 0 0 3px rgba(200,235,75,.35);
        }
        .cm-foot {
          display:flex; align-items:center; justify-content:space-between; gap:12px;
          margin-top:auto; padding-top:14px;
          border-top:1px solid var(--border, #E8E5DD);
        }
        .cm-open { font-family:var(--font-mono), monospace; font-size:11px; color:var(--muted-light, #857F6B); }
        .cm-go {
          font-weight:600; font-size:13px; padding:9px 18px;
          border-radius:var(--r-pill, 999px);
          background:var(--lime, #C8EB4B); color:var(--ink, #1E3A2B);
          box-shadow:var(--shadow-press-sm, 3px 3px 0 #1E3A2B);
          transition:transform .3s ease; white-space:nowrap;
        }
        .cm-go.ghost {
          background:transparent; color:var(--ink, #1E3A2B);
          border:1px solid var(--ink, #1E3A2B); box-shadow:none;
        }
        .cm-link:hover .cm-go { transform:translateY(-2px); }
        @media (prefers-reduced-motion: reduce) {
          .cm-card, .cm-go, .cm-art { transition:none; }
          .cm-link:hover .cm-card, .cm-link:hover .cm-go, .cm-link:hover .cm-art { transform:none; }
        }
      `}</style>
    </Link>
  )
}
