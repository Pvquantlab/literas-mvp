import Link from 'next/link'
import { tasarimVerisi } from '@/lib/tasarim-verisi'
import { dayOfMonth, formatMonthShort, formatWeekday, formatTime } from '@/lib/date'
import { CATEGORIES } from '@/lib/categories'
import { SHAPES } from '@/components/category-art'

export const revalidate = 60

/**
 * VARYANT 2 — ÜRÜN
 *
 * "En az Meetup seviyesinde işlevsellik" isteğinin doğrudan cevabı.
 * Kahraman bölümü yok denecek kadar küçük: sayfa açılır açılmaz arama,
 * filtre ve sonuç görünüyor. Ekranın üstünü manzara değil İŞ kaplıyor.
 *
 * İllüstrasyon DÜZ SİLUET: mevcut şekil kütüphanesi (SHAPES) tek renkle
 * yeniden kullanılıyor. Yeni bir set çizmek kategori kimliğini ikiye
 * bölerdi. Parlaklık yok — burada ikon süs değil, ayırt edici işaret.
 *
 * Yoğunluk bilinçli: kartlar küçük, boşluk az, bir ekranda çok şey var.
 * Tarama hızı bu varyantın vaadi.
 */

const kap = { maxWidth: 1200, margin: '0 auto', padding: '0 24px' } as const

/** Şekil kütüphanesini tek renk, parlaklıksız basar. */
function DuzIkon({ slug, boyut = 20 }: { slug: string; boyut?: number }) {
  const sekil = SHAPES[slug]
  if (!sekil) return null
  return (
    <svg
      viewBox="0 0 100 100"
      width={boyut}
      height={boyut}
      fill="currentColor"
      aria-hidden="true"
      style={{ flex: 'none' }}
    >
      {sekil}
    </svg>
  )
}

export default async function Urun() {
  const { etkinlikler, topluluklar, sayilar } = await tasarimVerisi()

  return (
    <main style={{ paddingBottom: 100 }}>
      {/* --- Arama önce: kahraman tek satır ------------------------------ */}
      <section style={{ ...kap, paddingTop: 34, paddingBottom: 20 }}>
        <h1 style={{ fontSize: 25, fontWeight: 400, letterSpacing: '.01em', margin: 0 }}>
          İstanbul&apos;da ne var?
        </h1>
        <p style={{ fontSize: 14.5, color: 'var(--muted)', margin: '6px 0 18px' }}>
          {sayilar.topluluk} topluluk · {sayilar.etkinlik} etkinlik · {sayilar.sehir} şehir
        </p>

        <form action="/kesfet" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            name="q"
            placeholder="Etkinlik, topluluk ya da konu ara…"
            aria-label="Ara"
            style={{ flex: '1 1 280px', minWidth: 0 }}
          />
          <input name="city" placeholder="Şehir" aria-label="Şehir" style={{ flex: '0 1 180px' }} />
          <button type="submit" className="btn-primary" style={{ flex: 'none' }}>
            Ara
          </button>
        </form>
      </section>

      {/* --- Filtre şeridi: küçük, düz, işlevsel ------------------------- */}
      <section
        style={{
          background: 'var(--paper-cream)',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <div
          style={{
            ...kap,
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            paddingBlock: 11,
          }}
        >
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              href={`/kesfet?category=${c.slug}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                flex: 'none',
                padding: '7px 13px',
                borderRadius: 999,
                background: 'var(--paper)',
                fontSize: 13,
                fontWeight: 400,
                color: 'var(--ink)',
                whiteSpace: 'nowrap',
              }}
            >
              <DuzIkon slug={c.slug} boyut={15} />
              {c.label}
            </Link>
          ))}
        </div>
      </section>

      {/* --- Etkinlik ızgarası: yoğun, taranabilir ----------------------- */}
      <section style={{ ...kap, paddingTop: 28 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <h2 style={{ fontSize: 17, fontWeight: 400, margin: 0 }}>Etkinlikler</h2>
          <Link href="/kesfet" style={{ fontSize: 13, color: 'var(--muted)' }}>
            tümü →
          </Link>
        </div>

        {etkinlikler.length === 0 && (
          <p style={{ color: 'var(--muted)' }}>Henüz etkinlik yok.</p>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(268px, 1fr))',
            gap: 12,
          }}
        >
          {etkinlikler.map((e) => (
            <Link
              key={e.id}
              href={`/event/${e.id}`}
              style={{
                display: 'flex',
                gap: 12,
                padding: 13,
                borderRadius: 12,
                background: 'var(--paper-cream)',
                color: 'inherit',
              }}
            >
              {/* Takvim bloğu: tarih her kartta aynı yerde, göz aramıyor */}
              <div
                style={{
                  flex: 'none',
                  width: 46,
                  textAlign: 'center',
                  borderRadius: 9,
                  background: 'var(--paper)',
                  padding: '6px 0',
                  lineHeight: 1.15,
                }}
              >
                <div
                  style={{
                    font: "400 9.5px 'IBM Plex Mono', monospace",
                    letterSpacing: '.16em',
                    color: 'var(--ink)',
                    textTransform: 'uppercase',
                  }}
                >
                  {formatMonthShort(e.event_date)}
                </div>
                <div style={{ fontSize: 19, fontWeight: 400, color: 'var(--night)' }}>
                  {dayOfMonth(e.event_date)}
                </div>
              </div>

              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14.5,
                    fontWeight: 500,
                    lineHeight: 1.3,
                    color: 'var(--night)',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {e.title}
                </div>
                <div
                  style={{
                    font: "400 11.5px 'IBM Plex Mono', monospace",
                    color: 'var(--muted)',
                    marginTop: 5,
                  }}
                >
                  {formatWeekday(e.event_date)} {formatTime(e.event_date)}
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: 'var(--muted)',
                    marginTop: 3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {e.community?.name}
                  {e.location ? ` · ${e.location}` : ''}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* --- Topluluk ızgarası ------------------------------------------- */}
      <section style={{ ...kap, paddingTop: 38 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <h2 style={{ fontSize: 17, fontWeight: 400, margin: 0 }}>Topluluklar</h2>
          <Link href="/kesfet?sekme=topluluk" style={{ fontSize: 13, color: 'var(--muted)' }}>
            tümü →
          </Link>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 12,
          }}
        >
          {topluluklar.map((t) => {
            const kat = CATEGORIES.find((c) => c.value === t.category)
            return (
              <Link
                key={t.id}
                href={`/community/${t.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  padding: 13,
                  borderRadius: 12,
                  background: 'var(--paper-cream)',
                  color: 'inherit',
                }}
              >
                <span style={{ color: 'var(--ink)', display: 'inline-flex' }}>
                  <DuzIkon slug={kat?.slug ?? 'tumu'} boyut={22} />
                </span>
                <span style={{ minWidth: 0 }}>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 14,
                      fontWeight: 500,
                      color: 'var(--night)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t.name}
                  </span>
                  <span
                    style={{
                      display: 'block',
                      font: "400 11.5px 'IBM Plex Mono', monospace",
                      color: 'var(--muted)',
                      marginTop: 2,
                    }}
                  >
                    {t.city ?? '—'} · {t.member_count ?? 0} üye
                  </span>
                </span>
              </Link>
            )
          })}
        </div>
      </section>
    </main>
  )
}
