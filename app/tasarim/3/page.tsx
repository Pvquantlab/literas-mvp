import Link from 'next/link'
import { tasarimVerisi } from '@/lib/tasarim-verisi'
import { dayOfMonth, formatMonthShort, formatWeekday, formatTime } from '@/lib/date'
import { CATEGORIES } from '@/lib/categories'
import { GlossyIcon } from '@/components/category-art'

export const revalidate = 60

/**
 * VARYANT 3 — VİTRİN
 *
 * Bugünkü yönün disipline edilmiş hâli: parlak 3B nesneler literas'ın
 * kimliği, korunuyorlar — ama AZALTILARAK. Eski ana sayfada 14 nesne yan
 * yana bir şerit oluşturuyordu; burada nesne büyük, az ve nefes alıyor.
 *
 * Kural: bir ekranda EN FAZLA üç parlak nesne. Nesne bir vurgu aracı;
 * her yerde olursa vurgu olmaktan çıkıp gürültü olur — eski şeridin
 * sorunu tam olarak buydu.
 *
 * Kartlar kağıt: koyu kart bu kompozisyonda parlak nesnelerle çakışıyordu
 * (iki farklı derinlik dili aynı ekranda).
 */

const kap = { maxWidth: 1120, margin: '0 auto', padding: '0 24px' } as const

export default async function Vitrin() {
  const { etkinlikler, topluluklar, sayilar } = await tasarimVerisi()
  const oneCikan = etkinlikler[0]
  const digerleri = etkinlikler.slice(1, 7)

  return (
    <main style={{ paddingBottom: 110 }}>
      {/* --- Kahraman: tek büyük nesne, dev başlık --------------------- */}
      <section
        style={{
          ...kap,
          paddingTop: 72,
          paddingBottom: 56,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, .65fr)',
          gap: 40,
          alignItems: 'center',
        }}
      >
        <div>
          <div
            style={{
              font: "400 11px 'IBM Plex Mono', monospace",
              letterSpacing: '.18em',
              textTransform: 'uppercase',
              color: 'var(--ink)',
            }}
          >
            Harflerden kelimeler, insanlardan topluluklar
          </div>
          <h1
            style={{
              fontSize: 'clamp(30px, 4vw, 48px)',
              fontWeight: 400,
              letterSpacing: '.005em',
              lineHeight: 1.18,
              margin: '16px 0 0',
              color: 'var(--ink)',
              maxWidth: '13ch',
            }}
          >
            Kendi masanı kur.
          </h1>
          <p
            style={{
              fontSize: 16.5,
              lineHeight: 1.6,
              color: 'var(--night)',
              maxWidth: '42ch',
              margin: '20px 0 0',
            }}
          >
            {sayilar.topluluk} topluluk, {sayilar.sehir} şehirde buluşuyor.
            Birine katıl ya da kendi masanı aç.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 30, flexWrap: 'wrap' }}>
            <Link href="/kesfet" className="btn-primary">Etkinlikleri gör</Link>
            <Link href="/community/new" className="btn-secondary">Topluluk kur</Link>
          </div>
        </div>

        {/* Tek nesne. Eskiden burada iki nesne yüzüyor, şeritte 14 tane
            daha vardı; hepsi birbirinin vurgusunu yiyordu. */}
        <div style={{ display: 'grid', placeItems: 'center' }}>
          <GlossyIcon value="kitap" size={196} />
        </div>
      </section>

      {/* --- Öne çıkan etkinlik: tek büyük kart ------------------------- */}
      {oneCikan && (
        <section style={{ ...kap, paddingBottom: 44 }}>
          <Link
            href={`/event/${oneCikan.id}`}
            style={{
              display: 'grid',
              gap: 28,
              alignItems: 'center',
              padding: '26px 28px',
              borderRadius: 20,
              background: 'var(--paper-cream)',
              color: 'inherit',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  font: "400 11px 'IBM Plex Mono', monospace",
                  letterSpacing: '.12em',
                  textTransform: 'uppercase',
                  color: 'var(--ink)',
                }}
              >
                Öne çıkan
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-serif), Georgia, serif',
                  fontSize: 'clamp(24px, 3.2vw, 36px)',
                  lineHeight: 1.16,
                  letterSpacing: '.01em',
                  color: 'var(--night)',
                  margin: '10px 0 0',
                }}
              >
                {oneCikan.title}
              </div>
              <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 10 }}>
                {dayOfMonth(oneCikan.event_date)} {formatMonthShort(oneCikan.event_date)} ·{' '}
                {formatWeekday(oneCikan.event_date)} {formatTime(oneCikan.event_date)}
                {oneCikan.community?.name ? ` · ${oneCikan.community.name}` : ''}
              </div>
            </div>
            {/* Burada nesne YOK: kahramanda zaten bir kitap var ve öne çıkan
                etkinlik de kitap kulübünden geliyordu — aynı nesnenin iki kez
                görünmesi "az ve büyük" kuralını kendi içinde çürütüyordu. */}
          </Link>
        </section>
      )}

      {/* --- Diğer etkinlikler: kağıt kart, bol hava ------------------- */}
      <section style={{ ...kap, paddingBottom: 48 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: 18,
          }}
        >
          <h2 style={{ fontSize: 19, fontWeight: 400, margin: 0 }}>Yaklaşanlar</h2>
          <Link href="/kesfet" style={{ fontSize: 13.5, color: 'var(--muted)' }}>
            tümü →
          </Link>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 18,
          }}
        >
          {digerleri.map((e) => (
            <Link
              key={e.id}
              href={`/event/${e.id}`}
              style={{
                display: 'block',
                padding: '20px 22px',
                borderRadius: 16,
                background: 'var(--paper-cream)',
                color: 'inherit',
              }}
            >
              <div
                style={{
                  font: "400 11px 'IBM Plex Mono', monospace",
                  letterSpacing: '.1em',
                  textTransform: 'uppercase',
                  color: 'var(--ink)',
                }}
              >
                {dayOfMonth(e.event_date)} {formatMonthShort(e.event_date)} ·{' '}
                {formatTime(e.event_date)}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-serif), Georgia, serif',
                  fontSize: 20,
                  lineHeight: 1.25,
                  color: 'var(--night)',
                  margin: '12px 0 0',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {e.title}
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 10 }}>
                {e.community?.name}
                {e.location ? ` · ${e.location}` : ''}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* --- Kategoriler: metin, nesne değil ---------------------------
           Üç parlak nesne kuralı gereği burada nesne YOK. Kimlik zaten
           yukarıda kuruldu; burada tekrar etmek onu ucuzlatırdı. */}
      <section style={{ ...kap, paddingBottom: 48 }}>
        <h2 style={{ fontSize: 19, fontWeight: 400, margin: '0 0 16px' }}>Ne ilgini çeker?</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              href={`/kesfet?category=${c.slug}`}
              style={{
                padding: '9px 16px',
                borderRadius: 999,
                fontSize: 14,
                fontWeight: 400,
                color: 'var(--ink)',
              }}
            >
              {c.label}
            </Link>
          ))}
        </div>
      </section>

      {/* --- Topluluklar ----------------------------------------------- */}
      <section style={kap}>
        <h2 style={{ fontSize: 19, fontWeight: 400, margin: '0 0 18px' }}>Topluluklar</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 16,
          }}
        >
          {topluluklar.slice(0, 8).map((t) => (
            <Link
              key={t.id}
              href={`/community/${t.id}`}
              style={{
                display: 'block',
                padding: '18px 20px',
                borderRadius: 16,
                background: 'var(--paper-cream)',
                color: 'inherit',
              }}
            >
              <div style={{ fontSize: 15.5, fontWeight: 500, color: 'var(--night)' }}>{t.name}</div>
              <div
                style={{
                  font: "400 11.5px 'IBM Plex Mono', monospace",
                  color: 'var(--muted)',
                  marginTop: 6,
                }}
              >
                {t.city ?? '—'} · {t.member_count ?? 0} üye
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
