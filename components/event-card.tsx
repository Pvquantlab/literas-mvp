import Link from 'next/link'
import { byValue, trLower } from '@/lib/categories'
import { GlossyIcon } from '@/components/category-art'

type Event = {
  id: string
  title: string
  location: string
  event_date: string
  cover_image_url: string | null
  /** Sorguda çekilmemiş olabilir — o zaman sayaç gizlenir. */
  attendee_count?: number | null
  /** Seri üyesiyse dolu. Çekilmemişse rozet gizlenir. */
  series_id?: string | null
  community?: { name: string; category?: string | null } | null
}

type Props = {
  event: Event
  showCommunityName?: boolean
  /** Serinin kalan gelecek buluşma sayısı. Yoksa rozet çizilmez. */
  seriKalan?: number | null
  /** 'haftalik' | 'iki_haftalik' | 'aylik' */
  frekans?: string | null
}

const TZ = 'Europe/Istanbul'

function fmt(iso: string, o: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('tr-TR', { timeZone: TZ, ...o }).format(new Date(iso))
}

/** İstanbul gününe göre YYYY-MM-DD. UTC günü kullanmak gece yarısından
 *  sonraki etkinlikleri bir önceki güne kaydırıyordu. */
function dayKey(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(iso))
}

function addDays(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

/** Türkçe büyük harf. toLocaleUpperCase('tr-TR') ICU eksik ortamda
 *  sessizce İngilizce davranıyor, o yüzden iki harfi elle çeviriyoruz. */
function trUpper(s: string): string {
  return s.replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase()
}

type Status = { label: string; tone: 'now' | 'soon' | 'past' }

function statusOf(iso: string): Status {
  const now = new Date()
  const today = dayKey(now.toISOString())
  const k = dayKey(iso)
  if (new Date(iso).getTime() < now.getTime()) return { label: 'Geçti', tone: 'past' }
  if (k === today) return { label: 'Bugün', tone: 'now' }
  if (k === addDays(today, 1)) return { label: 'Yarın', tone: 'now' }
  return { label: 'Yaklaşıyor', tone: 'soon' }
}

/**
 * Etkinlik kartı — koyu zemin, altıgen kaide üzerinde 3D kategori nesnesi.
 *
 * Neden koyu: sayfadaki topluluk kartları beyaz. Etkinlik ile topluluk
 * bir bakışta ayrılsın diye kart türü zıt zeminde duruyor.
 *
 * VERİ NOTLARI:
 *   · Bitiş saati yok (events tablosunda tek event_date), tek saat gösterilir.
 *   · Ücret alanı yok; alt satırda konum var.
 *   · attendee_count sorgularda çekilmiyor — gelmezse sayaç gizleniyor.
 */
export default function EventCard({ event, showCommunityName = true, seriKalan, frekans }: Props) {
  const cat = byValue(event.community?.category ?? null)
  const st = statusOf(event.event_date)
  const count = typeof event.attendee_count === 'number' ? event.attendee_count : null

  const day = fmt(event.event_date, { day: 'numeric' })
  const mon = trUpper(fmt(event.event_date, { month: 'short' }))
  const full = `${day} ${fmt(event.event_date, { month: 'long' })}, ${fmt(event.event_date, {
    hour: '2-digit', minute: '2-digit', hour12: false,
  })}`
  const weekday = trLower(fmt(event.event_date, { weekday: 'long' }))

  const c1 = cat?.colors[0] ?? '#5E93DA'
  const c2 = cat?.colors[1] ?? '#0755BB'

  return (
    <Link href={`/event/${event.id}`} className="ec-link">
      <article className="ec">
        <div className="ec-stage">
          <span className="ec-glow" style={{ background: c2 }} />

          {event.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.cover_image_url} alt="" loading="lazy" className="ec-photo" />
          ) : (
            <span className="ec-art">
              {/* Altıgen kaide: üst yüz, iki yan yüz, altında halka ışık */}
              <svg viewBox="0 0 200 150" aria-hidden="true">
                <defs>
                  <linearGradient id={`ec-top-${event.id}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="var(--card-art-1)" />
                    <stop offset="100%" stopColor="var(--card-art-2)" />
                  </linearGradient>
                  <linearGradient id={`ec-side-${event.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--card-art-3)" />
                    <stop offset="100%" stopColor="var(--card-art-4)" />
                  </linearGradient>
                </defs>
                {/* kaide halkası — kategorinin rengini alır */}
                <polygon
                  points="100,58 168,90 168,104 100,136 32,104 32,90"
                  fill="none"
                  stroke={c2}
                  strokeWidth="3"
                  opacity=".5"
                />
                {/* yan yüzler */}
                <polygon points="46,96 100,124 100,138 46,110" fill={`url(#ec-side-${event.id})`} />
                <polygon points="154,96 100,124 100,138 154,110" fill={`url(#ec-side-${event.id})`} opacity=".8" />
                {/* üst yüz */}
                <polygon points="100,70 154,96 100,124 46,96" fill={`url(#ec-top-${event.id})`} />
              </svg>

              <span className="ec-icon">
                <GlossyIcon value={event.community?.category ?? null} size={78} />
              </span>
            </span>
          )}

          {count !== null && (
            <span className="ec-count">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8z" />
              </svg>
              {count}
            </span>
          )}
        </div>

        <div className="ec-body">
          {showCommunityName && event.community?.name && (
            <span className="ec-chip">
              {cat && <GlossyIcon value={cat.slug} size={16} />}
              {event.community.name}
            </span>
          )}

          <h3 className="ec-title">{event.title}</h3>

          <div className="ec-panel">
            <span className="ec-cal">
              <b>{mon}</b>
              <i>{day}</i>
            </span>
            <span className="ec-when">
              <b>{full}</b>
              <i>{weekday}</i>
            </span>
            <span className={`ec-live ${st.tone}`}>{st.label}</span>
            {seriKalan != null && seriKalan > 0 && (
              <span className="ec-seri">
                {frekans === 'haftalik' ? 'haftalık'
                  : frekans === 'iki_haftalik' ? 'iki haftada bir'
                  : 'aylık'} · {seriKalan} buluşma
              </span>
            )}
          </div>

          <div className="ec-foot">
            <span>Konum</span>
            <b>{event.location || 'Belirtilmedi'}</b>
          </div>
        </div>
      </article>

      <style>{`
        .ec-link { display:block; text-decoration:none; height:100%; }
        .ec {
          display:flex; flex-direction:column; height:100%;
          background:var(--card-bg); border:1px solid var(--card-line); border-radius:22px;
          overflow:hidden; color:var(--card-fg);
          transition:transform .35s var(--ease, cubic-bezier(.2,.8,.3,1)), border-color .35s ease;
        }
        .ec-link:hover .ec { transform:translateY(-5px); border-color:var(--card-line-hover); }

        .ec-stage { position:relative; height:168px; overflow:hidden; }
        .ec-glow {
          position:absolute; right:-14%; top:-42%;
          width:78%; aspect-ratio:1; border-radius:50%;
          filter:blur(46px); opacity:.42;
        }
        .ec-art { position:absolute; inset:0; display:block; }
        .ec-art svg { position:absolute; right:2%; top:14%; width:64%; height:auto; }
        .ec-icon {
          position:absolute; right:19%; top:8%;
          filter:drop-shadow(0 12px 16px var(--card-art-shadow));
        }
        .ec-photo { width:100%; height:100%; object-fit:cover; display:block; opacity:.9; }

        .ec-count {
          position:absolute; top:14px; right:14px; z-index:2;
          display:inline-flex; align-items:center; gap:6px;
          font-family:var(--font-mono), monospace; font-size:11px;
          color:var(--card-fg-dim); background:var(--card-chip-bg);
          border:1px solid var(--card-chip-line);
          padding:5px 10px; border-radius:999px;
        }

        .ec-body { display:flex; flex-direction:column; flex:1; padding:0 18px 18px; margin-top:-46px; position:relative; z-index:1; }

        .ec-chip {
          align-self:flex-start; display:inline-flex; align-items:center; gap:7px;
          font-size:12px; font-weight:600; color:var(--card-fg-dim);
          background:var(--card-chip-bg); border:1px solid var(--card-chip-line);
          padding:5px 12px 5px 6px; border-radius:999px;
          max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
        }
        /* flex-basis:100% rozeti kendi satirina zorluyor — boylece
           rozetsiz kartlarin duzeni (.ec-when tabani) hic degismiyor. */
        .ec-seri {
          display:inline-flex; align-items:center;
          font-size:12px; font-weight:600; color:var(--card-fg-dim);
          white-space:nowrap;
          flex-basis:100%;
        }
        .ec-title {
          font-family:var(--font-serif), Georgia, serif;
          font-size:22px; font-weight:600; line-height:1.18; letter-spacing:-.015em;
          color:var(--card-fg-strong); margin:12px 0 0;
          display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;
        }

        .ec-panel {
          display:flex; align-items:center; gap:12px;
          background:var(--card-panel); border-radius:15px; padding:10px 12px;
          margin-top:16px;
          flex-wrap:wrap; row-gap:8px;
        }
        .ec-cal {
          flex:none; display:grid; place-items:center;
          width:44px; padding:5px 0; border-radius:10px;
          background:var(--card-inset); line-height:1.1;
        }
        .ec-cal b { font-family:var(--font-mono), monospace; font-size:9px; letter-spacing:.08em; color:var(--card-fg-muted); }
        .ec-cal i { font-style:normal; font-size:18px; font-weight:700; color:var(--card-fg-strong); }
        .ec-when { display:flex; flex-direction:column; min-width:0; flex:1; }
        .ec-when b { font-size:13.5px; font-weight:600; color:var(--card-fg); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .ec-when i { font-style:normal; font-size:12px; color:var(--card-fg-muted); }

        .ec-live {
          flex:none; display:inline-flex; align-items:center; gap:6px;
          font-size:11.5px; font-weight:600; color:var(--card-fg-dim);
          background:var(--card-chip-bg-soft); padding:5px 11px; border-radius:999px;
        }
        .ec-live::before { content:""; width:6px; height:6px; border-radius:50%; background:var(--card-dot); }
        .ec-live.now::before  { background:var(--card-dot-now); box-shadow:0 0 0 3px var(--card-dot-now-halo); }
        .ec-live.soon::before { background:var(--ink); }

        .ec-foot {
          display:flex; align-items:center; justify-content:space-between; gap:12px;
          margin-top:auto; padding-top:14px;
        }
        .ec-foot span { font-size:12.5px; color:var(--card-fg-muted); }
        .ec-foot b {
          font-size:13px; font-weight:600; color:var(--card-fg);
          max-width:60%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
        }

        @media (prefers-reduced-motion: reduce) {
          .ec { transition:none; }
          .ec-link:hover .ec { transform:none; }
        }
      `}</style>
    </Link>
  )
}
