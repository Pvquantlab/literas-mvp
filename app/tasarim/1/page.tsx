import Link from 'next/link'
import { tasarimVerisi } from '@/lib/tasarim-verisi'
import { dayOfMonth, formatMonthShort, formatWeekday, formatTime } from '@/lib/date'
import { CATEGORIES } from '@/lib/categories'

export const revalidate = 60

/**
 * VARYANT 1 — DERGİ
 *
 * Referansın (week.wild.plus) asıl dersini uygular: güzellik efektten değil
 * KISITLAMADAN gelir. İllüstrasyon yok, gölge yok, kart yok. Sayfayı üç şey
 * kuruyor: tipografi, ince mürekkep çizgisi ve boşluk.
 *
 * İki bilinçli tercih:
 *  - Etkinlikler KART değil PROGRAM SATIRI. Kart, her öğeye eşit ağırlık
 *    verip taramayı yavaşlatıyor; satır düzeni tarihi sabit bir sütuna
 *    oturtuyor ve göz aşağı doğru kayarak okuyor.
 *  - Topluluklar bir DİZİN (içindekiler gibi). Görsel değil, isim ve sayı.
 */

const kunye = { maxWidth: 1100, margin: '0 auto', padding: '0 24px' } as const
const monoEtiket = {
  font: "500 11px 'IBM Plex Mono', monospace",
  letterSpacing: '.14em',
  textTransform: 'uppercase',
  color: 'var(--ink)',
} as const

export default async function Dergi() {
  const { etkinlikler, topluluklar, sayilar } = await tasarimVerisi()

  return (
    <main style={{ paddingBottom: 120 }}>
      {/* --- Künye: dev bir ifade, süs yok ------------------------------- */}
      <section style={{ ...kunye, paddingTop: 88, paddingBottom: 56 }}>
        <div style={monoEtiket}>literaslab — İstanbul</div>
        <h1
          style={{
            fontFamily: 'var(--font-serif), Georgia, serif',
            fontSize: 'clamp(40px, 7vw, 92px)',
            lineHeight: 0.98,
            letterSpacing: '-0.03em',
            fontWeight: 500,
            margin: '18px 0 0',
            maxWidth: '18ch',
            color: 'var(--ink)',
          }}
        >
          İnsanların kendi masalarını kurduğu yer.
        </h1>
        <p
          style={{
            fontSize: 17,
            lineHeight: 1.6,
            color: 'var(--night)',
            maxWidth: '46ch',
            margin: '26px 0 0',
          }}
        >
          Buluşmalar burada başlıyor. Katıl, ya da kendi masanı kur —
          birkaç kişiyle başlayıp şehre yayılan bir şey olabilir.
        </p>

        <div style={{ display: 'flex', gap: 14, marginTop: 32, flexWrap: 'wrap' }}>
          <Link href="/kesfet" className="btn-primary">Etkinlikleri gör</Link>
          <Link href="/community/new" className="btn-secondary">Topluluk kur</Link>
        </div>
      </section>

      {/* --- GERÇEKLER: referansın "THE FACTS" bloğunun karşılığı --------
           Tek harfli etiketler matbaa dilinin imzası; sayıyı değil,
           sayının NE OLDUĞUNU sessizce söylüyor. */}
      <section style={{ ...kunye, paddingBlock: 40 }}>
        <div
          style={{
            borderTop: '1.5px solid var(--border-mid)',
            borderBottom: '1.5px solid var(--border-mid)',
            paddingBlock: 26,
          }}
        >
          <div style={{ ...monoEtiket, marginBottom: 20 }}>Gerçekler</div>
          <dl
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
              gap: 24,
              margin: 0,
            }}
          >
            {[
              ['T', 'Topluluk', String(sayilar.topluluk)],
              ['E', 'Etkinlik', String(sayilar.etkinlik)],
              ['Ş', 'Şehir', String(sayilar.sehir)],
              ['K', 'Kategori', String(CATEGORIES.length)],
            ].map(([harf, ad, deger]) => (
              <div key={ad} style={{ display: 'flex', gap: 14, alignItems: 'baseline' }}>
                <dt
                  style={{
                    font: "500 13px 'IBM Plex Mono', monospace",
                    color: 'var(--muted-light)',
                    width: 18,
                    flex: 'none',
                  }}
                >
                  {harf}.
                </dt>
                <dd style={{ margin: 0 }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-serif), Georgia, serif',
                      fontSize: 32,
                      lineHeight: 1,
                      color: 'var(--ink)',
                    }}
                  >
                    {deger}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{ad}</div>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* --- Program: kart değil, satır ----------------------------------- */}
      <section style={{ ...kunye, paddingBlock: 30 }}>
        <div style={{ ...monoEtiket, marginBottom: 6 }}>Program</div>

        {etkinlikler.length === 0 && (
          <p style={{ color: 'var(--muted)', paddingBlock: 24 }}>Henüz etkinlik yok.</p>
        )}

        <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {etkinlikler.map((e) => (
            <li key={e.id} style={{ borderTop: '1px solid var(--border)' }}>
              <Link
                href={`/event/${e.id}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '86px 1fr auto',
                  gap: 20,
                  alignItems: 'baseline',
                  paddingBlock: 22,
                  color: 'inherit',
                }}
              >
                {/* Tarih sabit sütunda: göz aşağı kayarken hizayı kaybetmiyor */}
                <span
                  style={{
                    font: "500 12px 'IBM Plex Mono', monospace",
                    color: 'var(--ink)',
                    letterSpacing: '.04em',
                    lineHeight: 1.5,
                  }}
                >
                  {dayOfMonth(e.event_date)} {formatMonthShort(e.event_date)}
                  <br />
                  <span style={{ color: 'var(--muted-light)' }}>
                    {formatWeekday(e.event_date)} · {formatTime(e.event_date)}
                  </span>
                </span>

                <span>
                  <span
                    style={{
                      display: 'block',
                      fontFamily: 'var(--font-serif), Georgia, serif',
                      fontSize: 23,
                      lineHeight: 1.24,
                      letterSpacing: '-0.01em',
                      color: 'var(--night)',
                    }}
                  >
                    {e.title}
                  </span>
                  <span style={{ display: 'block', fontSize: 13.5, color: 'var(--muted)', marginTop: 5 }}>
                    {e.community?.name}
                    {e.location ? ` · ${e.location}` : ''}
                  </span>
                </span>

                <span aria-hidden="true" style={{ ...monoEtiket, fontSize: 15 }}>→</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* --- Topluluk dizini: görsel yok, isim ve sayı -------------------- */}
      <section style={{ ...kunye, paddingBlock: 44 }}>
        <div style={{ ...monoEtiket, marginBottom: 6 }}>Topluluklar</div>
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            columns: '2 260px',
            columnGap: 44,
          }}
        >
          {topluluklar.map((t) => (
            <li key={t.id} style={{ breakInside: 'avoid', borderTop: '1px solid var(--border)' }}>
              <Link
                href={`/community/${t.id}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 16,
                  alignItems: 'baseline',
                  paddingBlock: 13,
                  color: 'var(--night)',
                }}
              >
                <span style={{ fontSize: 15.5 }}>{t.name}</span>
                <span
                  style={{
                    font: "500 11.5px 'IBM Plex Mono', monospace",
                    color: 'var(--muted-light)',
                    flex: 'none',
                  }}
                >
                  {t.city ?? '—'} · {t.member_count ?? 0}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* --- Kategoriler: nesne değil, metin ------------------------------ */}
      <section style={{ ...kunye, paddingBlock: 30 }}>
        <div style={{ ...monoEtiket, marginBottom: 14 }}>Kategoriler</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 18px' }}>
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              href={`/kesfet?category=${c.slug}`}
              style={{
                fontSize: 15,
                color: 'var(--ink)',
                borderBottom: '1px solid var(--border-mid)',
                paddingBottom: 2,
              }}
            >
              {c.label}
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
