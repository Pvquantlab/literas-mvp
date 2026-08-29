import Link from 'next/link'
import Image from 'next/image'
import { byValue } from '@/lib/categories'
import { RolyefMasa, RolyefKahve, RolyefKitap, RolyefSandalye, RolyefSehir } from '@/components/rolyef'

/** Kategori -> rölyef. Etkinlik ve topluluk sayfalarındaki eşlemenin aynısı. */
const ROLYEF: Record<string, (p: { className?: string; style?: React.CSSProperties }) => React.JSX.Element> = {
  kitap: RolyefKitap, dil: RolyefKitap, sinema: RolyefKitap,
  lezzet: RolyefKahve, sosyal: RolyefKahve, kariyer: RolyefKahve,
  doga: RolyefSehir, fotograf: RolyefSehir, gonulluluk: RolyefSehir,
  muzik: RolyefSandalye, sanat: RolyefSandalye, oyun: RolyefSandalye, spor: RolyefSandalye,
}

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

  const Rolyef = ROLYEF[community.category ?? ''] ?? RolyefMasa

  return (
    <Link href={`/community/${community.id}`} className="cm-link reveal">
      <article className="cm-card">
        {/* KAPAK HER KARTTA VAR. Eskiden yalnızca görseli olan kartlarda
            vardı; görselsizler ızgarada aynı yüksekliğe gerilip altlarında
            kocaman bir boşluk bırakıyordu. Görsel yoksa kategori rölyefi
            geçiyor: hem boşluk doluyor hem bütün kartlar aynı yapıya
            kavuşuyor. */}
        <div className={community.cover_image_url ? 'cm-cover' : 'cm-cover cm-cover-bos'}>
          {community.cover_image_url ? (
            <Image
              src={community.cover_image_url}
              alt=""
              fill
              sizes="(max-width: 620px) 100vw, (max-width: 1000px) 50vw, 33vw"
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <Rolyef />
          )}

          {/* TEK ETİKET DİLİ. Eskiden iki ayrı görünüm vardı: kapak varsa
              .cm-pill + .cm-new, yoksa .cm-tag + .cm-tag.on. Yan yana iki
              farklı hap gibi duruyordu. */}
          <div className="cm-etiketler">
            {cat && <span className="cm-etiket">{cat.label}</span>}
            {fresh && <span className="cm-etiket">yeni açıldı</span>}
          </div>
        </div>

        <div className="cm-body">
          <h3 className="cm-title">{community.name}</h3>
          <p className="cm-meta">{community.city}</p>

          {/* SABİT METİNLER KALDIRILDI:
              · "yeni bir masa" -- founder_name gelmediğinde basılan dolgu
                metniydi; beş kartta beş kez aynı şey yazıyordu.
              · "herkese açık" -- communities tablosunda gizlilik alanı YOK,
                yani hiç değişemeyecek bir sabitti.
              Geriye yalnızca gerçekten değişen bilgi kaldı. */}
          {(!fresh || community.founder_name || upcoming > 0) && (
            <div className="cm-hero">
              {fresh
                ? community.founder_name && (
                    <span className="cm-founder">{community.founder_name} kurdu</span>
                  )
                : (
                  <span className="cm-count"><b>{members}</b> üye</span>
                )}
              {upcoming > 0 && <span className="cm-live">bu hafta {upcoming} buluşma</span>}
            </div>
          )}

          <div className="cm-foot">
            <span className={fresh ? 'cm-go ghost' : 'cm-go'} aria-hidden="true">
              {fresh ? 'İlk sen katıl' : 'Katıl'}
            </span>
          </div>
        </div>
      </article>

      <style>{`
        .cm-link { display:block; text-decoration:none; color:inherit; height:100%; }
        .cm-card {
          position:relative; display:flex; flex-direction:column; height:100%;
          padding:16px; border-radius:4px;
          background:var(--paper-cream, #FFF);
          border:1px solid var(--border, #E8E5DD);
          
          transition:transform .4s var(--ease, cubic-bezier(.2,.8,.3,1)), box-shadow .4s ease;
        }
        .cm-link:hover .cm-card { transform:translateY(-2px); }
        .cm-cover {
          position:relative; height:172px; border-radius:var(--r-sm); overflow:hidden;
          display:grid; place-items:center;
        }
        /* Görsel yoksa: panel zemin + sessiz rölyef. */
        .cm-cover-bos { background:var(--panel); }
        .cm-cover-bos svg {
          width:58%; height:auto; color:var(--ink); opacity:.16;
        }
        /* TEK etiket dili: mono, büyük harf, 4px köşe, çerçevesiz. */
        .cm-etiketler {
          position:absolute; top:10px; left:10px; right:10px; z-index:3;
          display:flex; gap:6px; flex-wrap:wrap;
        }
        .cm-etiket {
          font-family:var(--font-mono), monospace;
          font-size:10px; letter-spacing:.14em; text-transform:uppercase;
          color:var(--ink); background:rgba(255,255,255,.92);
          padding:5px 9px; border-radius:var(--r-sm);
        }
        .cm-body { padding:14px 2px 0; display:flex; flex-direction:column; flex:1; }
        /* ÇİFT letter-spacing hatası: önce .02em yazıp bir satır altında
           -.005em ile ezmişim, yani ekranda NEGATİF aralık çıkıyordu.
           DNA pozitif aralık istiyor. */
        .cm-title {
          font-weight:400; letter-spacing:.02em;
          font-size:21px; line-height:1.2;
          color:var(--ink, #0755BB); margin:0;
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
          font-family:var(--font-mono), monospace; font-variant-numeric:tabular-nums;
          font-size:32px; font-weight:400; line-height:1; letter-spacing:.01em;
          color:var(--ink, #0755BB); margin-right:5px;
        }
        .cm-founder { font-family:var(--font-mono), monospace; font-size:12px; color:var(--muted, #5C5744); }
        .cm-live {
          display:inline-flex; align-items:center; gap:7px;
          font-family:var(--font-mono), monospace; font-size:11px;
          color:var(--ink); background:var(--panel);
          padding:5px 10px; border-radius:var(--r-sm); white-space:nowrap;
        }
        .cm-foot {
          display:flex; align-items:center; justify-content:flex-end;
          margin-top:auto; padding-top:14px;
        }
        .cm-go {
          font-family:var(--font-sans), system-ui, sans-serif;   /* dokunulan nesne */
          font-weight:600; font-size:13px; padding:9px 18px;
          border-radius:var(--r-pill, 999px);
          background:var(--lime, #C7D7F2); color:var(--ink, #0755BB);
          box-shadow:none;
          transition:transform .3s ease; white-space:nowrap;
        }
        .cm-go.ghost {
          background:transparent; color:var(--ink, #0755BB);
          border:1px solid var(--ink, #0755BB); box-shadow:none;
        }
        .cm-link:hover .cm-go { transform:translateY(-2px); }
        @media (prefers-reduced-motion: reduce) {
          .cm-card, .cm-go { transition:none; }
          .cm-link:hover .cm-card, .cm-link:hover .cm-go { transform:none; }
        }
      `}</style>
    </Link>
  )
}
