import Link from 'next/link'
import { tasarimVerisi } from '@/lib/tasarim-verisi'
import { dayOfMonth, formatMonthShort, formatWeekday, formatTime } from '@/lib/date'
import { CATEGORIES } from '@/lib/categories'

export const revalidate = 60

/**
 * VARYANT 1 — DERGİ (referans ÖLÇÜLEREK yeniden yazıldı)
 *
 * İlk sürüm referansı yanlış okumuştu: 40–92px başlık, 800 ağırlık, her yerde
 * border, negatif harf aralığı. week.wild.plus'ı tarayıcıdan ölçünce tersi
 * çıktı:
 *
 *   en büyük metin ......... 24px (sayfada bundan büyüğü YOK)
 *   baskın boyut ........... 10px, 1645 kez
 *   ağırlık ................ 300 → 1919 düğüm · 400 → 116 · 500 → 10
 *   box-shadow taşıyan ..... 0 eleman
 *   border taşıyan ......... 0 eleman
 *   harf aralığı ........... POZİTİF (0.72–0.96px)
 *
 * Yani sitenin iddialı hissi BÜYÜK TİPOGRAFİDEN DEĞİL, devasa boşluktan
 * geliyor: küçük/ince yazı ile geniş alan arasındaki ölçek farkından.
 *
 * BURADA UYGULANAN / UYGULANMAYAN:
 *   + EN İNCE ağırlık, pozitif aralık, gölge yok, border yok
 *     (referans 300 kullanıyor; bu yazı karakteri 300 taşımıyor, en incesi
 *      400 — gerçekten 300 istenirse yazı karakteri değişmeli)
 *   + ayrım çizgiyle değil BOŞLUKLA kuruluyor
 *   − 10px gövde metni ALINMADI. ui-ux-pro-max kuralı: gövde en az 16px,
 *     küçük metin gövdede kullanılmaz. Referans bunu karşılayabiliyor çünkü
 *     bir kez göz gezdirilen mikrosite; biz okunan bir ürünüz.
 *     10px yalnızca ETİKET boyutu olarak kaldı.
 *   − 24px tavanı da alınmadı: ürünün bir giriş ifadesine ihtiyacı var.
 *     Tavan 40px'e çekildi — 92px'ten uzak, 24px'ten okunur.
 */

const kap = { maxWidth: 940, margin: '0 auto', padding: '0 28px' } as const

/** Referansın etiket dili: küçük, ince, harf arası açık, büyük harf. */
const etiket = {
  font: "400 10px 'IBM Plex Mono', monospace",
  letterSpacing: '.18em',
  textTransform: 'uppercase',
  color: 'var(--ink)',
} as const

export default async function Dergi() {
  const { etkinlikler, topluluklar, sayilar } = await tasarimVerisi()

  return (
    <main style={{ paddingBottom: 200, fontWeight: 400 }}>
      {/* --- Künye ------------------------------------------------------
          Boşluk burada tasarımın kendisi: 160px üst boşluk, dar ölçü.  */}
      <section style={{ ...kap, paddingTop: 160, paddingBottom: 140 }}>
        <div style={etiket}>literaslab — İstanbul, 2026</div>
        <h1
          style={{
            fontSize: 'clamp(26px, 3.4vw, 40px)',
            fontWeight: 400,
            letterSpacing: '.01em',
            lineHeight: 1.28,
            margin: '30px 0 0',
            maxWidth: '24ch',
            color: 'var(--ink)',
          }}
        >
          İnsanların kendi masalarını kurduğu yer.
        </h1>
        <p
          style={{
            fontSize: 16.5,
            fontWeight: 400,
            lineHeight: 1.75,
            color: 'var(--night)',
            maxWidth: '52ch',
            margin: '34px 0 0',
          }}
        >
          Buluşmalar burada başlıyor. Katıl, ya da kendi masanı kur —
          birkaç kişiyle başlayıp şehre yayılan bir şey olabilir.
        </p>

        <div style={{ display: 'flex', gap: 28, marginTop: 46 }}>
          <Link href="/kesfet" style={{ ...etiket, fontSize: 11, color: 'var(--ink)' }}>
            Etkinlikleri gör →
          </Link>
          <Link href="/community/new" style={{ ...etiket, fontSize: 11, color: 'var(--night)' }}>
            Topluluk kur →
          </Link>
        </div>
      </section>

      {/* --- Künye sayıları: kutu yok, çizgi yok, sadece hizalama ------- */}
      <section style={{ ...kap, paddingBottom: 140 }}>
        <div style={{ ...etiket, marginBottom: 42 }}>Gerçekler</div>
        <dl
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 46,
            margin: 0,
          }}
        >
          {[
            ['T', 'Topluluk', String(sayilar.topluluk)],
            ['E', 'Etkinlik', String(sayilar.etkinlik)],
            ['Ş', 'Şehir', String(sayilar.sehir)],
            ['K', 'Kategori', String(CATEGORIES.length)],
          ].map(([harf, ad, deger]) => (
            <div key={ad}>
              <dt style={{ ...etiket, color: 'var(--muted-light)', marginBottom: 14 }}>{harf}.</dt>
              <dd style={{ margin: 0 }}>
                <div style={{ fontSize: 24, fontWeight: 400, letterSpacing: '.02em', color: 'var(--ink)' }}>
                  {deger}
                </div>
                <div style={{ fontSize: 13, fontWeight: 400, color: 'var(--muted)', marginTop: 8 }}>
                  {ad}
                </div>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* --- Program: satırları ayıran şey ÇİZGİ DEĞİL, boşluk ---------- */}
      <section style={{ ...kap, paddingBottom: 140 }}>
        <div style={{ ...etiket, marginBottom: 42 }}>Program</div>

        {etkinlikler.length === 0 && (
          <p style={{ color: 'var(--muted)', fontWeight: 400 }}>Henüz etkinlik yok.</p>
        )}

        <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 54 }}>
          {etkinlikler.map((e) => (
            <li key={e.id}>
              <Link
                href={`/event/${e.id}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '112px 1fr',
                  gap: 32,
                  alignItems: 'start',
                  color: 'inherit',
                }}
              >
                <span style={{ ...etiket, color: 'var(--muted-light)', lineHeight: 2 }}>
                  {dayOfMonth(e.event_date)} {formatMonthShort(e.event_date)}
                  <br />
                  {formatWeekday(e.event_date)}
                  <br />
                  {formatTime(e.event_date)}
                </span>

                <span>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 21,
                      fontWeight: 400,
                      letterSpacing: '.01em',
                      lineHeight: 1.42,
                      color: 'var(--night)',
                    }}
                  >
                    {e.title}
                  </span>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 14,
                      fontWeight: 400,
                      color: 'var(--muted)',
                      marginTop: 10,
                    }}
                  >
                    {e.community?.name}
                    {e.location ? ` · ${e.location}` : ''}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* --- Topluluk dizini ------------------------------------------- */}
      <section style={{ ...kap, paddingBottom: 140 }}>
        <div style={{ ...etiket, marginBottom: 42 }}>Topluluklar</div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 30 }}>
          {topluluklar.map((t) => (
            <li key={t.id}>
              <Link
                href={`/community/${t.id}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '112px 1fr',
                  gap: 32,
                  alignItems: 'baseline',
                  color: 'inherit',
                }}
              >
                <span style={{ ...etiket, color: 'var(--muted-light)' }}>
                  {t.member_count ?? 0} üye
                </span>
                <span>
                  <span style={{ fontSize: 17, fontWeight: 400, color: 'var(--night)' }}>
                    {t.name}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--muted)', marginLeft: 12 }}>
                    {t.city ?? ''}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* --- Kategoriler: düz metin dizisi ------------------------------ */}
      <section style={kap}>
        <div style={{ ...etiket, marginBottom: 42 }}>Kategoriler</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px 30px' }}>
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              href={`/kesfet?category=${c.slug}`}
              style={{ fontSize: 16, fontWeight: 400, color: 'var(--ink)', letterSpacing: '.01em' }}
            >
              {c.label}
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
