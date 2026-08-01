import Link from 'next/link'
import { byValue, trLower } from '@/lib/categories'
import { CategoryCover } from '@/components/category-art'

type Event = {
  id: string
  title: string
  location: string
  event_date: string
  cover_image_url: string | null
  /** Sorguda çekilmemiş olabilir — o zaman satır gizlenir. */
  attendee_count?: number | null
  community?: { name: string; category?: string | null } | null
}

type Props = {
  event: Event
  showCommunityName?: boolean
}

/**
 * Tarih parçaları — hepsi Europe/Istanbul.
 *
 * Eski sürüm getDay() / getHours() kullanıyordu. Bunlar sunucunun yerel
 * saatine göre çalışır; Vercel UTC'de koştuğu için canlıda saatler 3 saat
 * geri görünüyordu. Intl'e timeZone verince sunucu nerede olursa olsun
 * sonuç aynı.
 */
function parts(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const f = (o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', ...o }).format(d)
  return {
    day: f({ day: 'numeric' }),
    month: trLower(f({ month: 'short' })),
    weekday: trLower(f({ weekday: 'long' })),
    time: f({ hour: '2-digit', minute: '2-digit', hour12: false }),
  }
}

export default function EventCard({ event, showCommunityName = true }: Props) {
  const category = event.community?.category ?? null
  const cat = byValue(category)
  const p = parts(event.event_date)
  const count = typeof event.attendee_count === 'number' ? event.attendee_count : null

  const host = [
    showCommunityName && event.community?.name ? event.community.name : null,
    event.location || null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Link href={`/event/${event.id}`} className="ev-link">
      <article className="ev-card">
        <div className="ev-frame">
          {event.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.cover_image_url} alt="" loading="lazy" className="ev-img" />
          ) : (
            <CategoryCover value={category} w={400} h={240} />
          )}
          {cat && <span className="ev-pill">{cat.label}</span>}
        </div>

        {p && (
          <p className="ev-when">
            <b>{p.day}</b>
            <span>
              {p.month} · {p.weekday} · {p.time}
            </span>
          </p>
        )}

        <h3 className="ev-title">{event.title}</h3>
        {host && <p className="ev-host">{host}</p>}

        <div className="ev-foot">
          <span className="ev-count">
            {count !== null ? (
              <>
                <b>{count}</b> kişi oturuyor
              </>
            ) : (
              'ilk katılan sen ol'
            )}
          </span>
          {/* <a> içine <button> konmaz — geçersiz HTML, klavye ve ekran
              okuyucu karışır. Bu görsel bir etiket; tıklama kartı açıyor,
              katılma işlemi etkinlik sayfasında yapılıyor. */}
          <span className="ev-go" aria-hidden="true">
            Katıl
          </span>
        </div>
      </article>

      <style>{`
        .ev-link { display:block; text-decoration:none; color:inherit; height:100%; }
        .ev-card {
          --clay: 10px 14px 26px rgba(15, 46, 92,.13),
                  inset -5px -7px 12px rgba(15, 46, 92,.14),
                  inset 5px 7px 14px rgba(255,255,255,.70);
          --clay-hi: 16px 24px 38px rgba(15, 46, 92,.19),
                     inset -5px -7px 12px rgba(15, 46, 92,.14),
                     inset 6px 8px 16px rgba(255,255,255,.78);
          position:relative; display:flex; flex-direction:column; height:100%;
          padding:18px; border-radius:30px;
          background:var(--paper-cream, #FFF);
          border:1px solid var(--border, #E8E5DD);
          box-shadow:var(--clay);
          transition:transform .4s var(--ease, cubic-bezier(.2,.8,.3,1)), box-shadow .4s ease;
        }
        .ev-link:hover .ev-card { transform:translateY(-6px); box-shadow:var(--clay-hi); }
        .ev-frame {
          position:relative; height:178px; border-radius:22px; overflow:hidden;
          margin-bottom:16px; box-shadow:inset 0 0 0 1px rgba(15, 46, 92,.14);
        }
        .ev-frame::after {
          content:""; position:absolute; inset:0; pointer-events:none;
          background:linear-gradient(180deg,
            rgba(12, 27, 142,.22) 0%, rgba(12, 27, 142,0) 40%, rgba(12, 27, 142,.52) 100%);
        }
        .ev-img { width:100%; height:100%; object-fit:cover; display:block; }
        .ev-pill {
          position:absolute; top:12px; left:12px; z-index:2;
          font-family:var(--font-mono), monospace; font-size:11px;
          color:var(--ink, #1E3A2B); background:rgba(255,255,255,.92);
          padding:6px 12px; border-radius:var(--r-pill, 999px);
        }
        .ev-when {
          display:flex; align-items:baseline; gap:8px; margin:0 0 6px;
          font-family:var(--font-mono), monospace; font-size:12px;
          color:var(--coral, #BE5127);
        }
        .ev-when b {
          font-family:var(--font-serif), Georgia, serif;
          font-size:30px; line-height:1; font-weight:600;
        }
        .ev-title {
          font-family:var(--font-serif), Georgia, serif; font-weight:600;
          font-size:20px; line-height:1.2; margin:0 0 5px;
          color:var(--ink, #1E3A2B); letter-spacing:-.01em;
          display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;
        }
        .ev-host {
          font-size:13px; color:var(--muted, #5C5744); margin:0;
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
        }
        .ev-foot {
          display:flex; align-items:center; justify-content:space-between; gap:12px;
          margin-top:auto; padding-top:15px;
          border-top:1px solid var(--border, #E8E5DD);
        }
        .ev-count {
          font-family:var(--font-mono), monospace; font-size:12px;
          color:var(--muted, #5C5744);
        }
        .ev-count b {
          font-family:var(--font-sans), system-ui, sans-serif;
          color:var(--ink, #1E3A2B); font-weight:600; font-size:13px;
        }
        .ev-go {
          font-weight:600; font-size:13px; padding:9px 18px;
          border-radius:var(--r-pill, 999px);
          background:var(--lime, #C8EB4B); color:var(--ink, #1E3A2B);
          box-shadow:var(--shadow-press-sm, 3px 3px 0 #1E3A2B);
          transition:transform .3s ease;
        }
        .ev-link:hover .ev-go { transform:translateY(-2px); }
        @media (prefers-reduced-motion: reduce) {
          .ev-card, .ev-go { transition:none; }
          .ev-link:hover .ev-card, .ev-link:hover .ev-go { transform:none; }
        }
      `}</style>
    </Link>
  )
}
