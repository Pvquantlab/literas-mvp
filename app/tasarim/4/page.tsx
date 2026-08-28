import Link from 'next/link'
import { tasarimVerisi } from '@/lib/tasarim-verisi'
import { dayOfMonth, formatMonthShort, formatWeekday, formatTime } from '@/lib/date'
import { CATEGORIES } from '@/lib/categories'

export const revalidate = 60

/**
 * VARYANT 4 — SADIK
 *
 * week.wild.plus/athens-26 ÖLÇÜLEREK çıkarılan DNA'dan üretildi.
 * DNA dosyası: docs/tasarim/wild-week-dna.json
 *
 * Önceki üç varyant referansı gözle okumuştu ve üçü de yanlış çıktı.
 * Ölçüm ne dedi:
 *
 *   yapı ............. TAM GENİŞLİK 3 sütunlu ızgara (473.664px × 3).
 *                      Ortalanmış max-width YOK. Ben 940px'lik dergi
 *                      kolonu kurmuştum — yapı olarak da yanlıştı.
 *   hücre ............ 474–948px yüksekliğinde; içerik üste/alta yaslı,
 *                      ortası BOŞ. Boşluk hissi buradan geliyor.
 *   dolgu ............ 6–24px, yani ÇOK SIKI. Ben 140–160px kurmuştum.
 *   tipografi ........ en büyük 24px, baskın 10px, ağırlık 300,
 *                      harf aralığı POZİTİF (~0.04em), satır 1.2
 *   köşe ............. 4px baskın
 *   gölge / border ... SIFIR eleman
 *
 * LİTERAS'A UYARLARKEN BİLİNÇLİ SAPMALAR (DNA dosyasında da yazılı):
 *  1. Gövde metni 10px DEĞİL, 16px. ui-ux-pro-max kuralı: gövde en az 16px,
 *     küçük metin gövdede kullanılmaz. Referans bunu karşılayabiliyor çünkü
 *     bir kez göz gezdirilen mikrosite; biz okunan bir ürünüz.
 *     10–11px yalnızca ETİKET olarak kullanıldı — referansın kendi etiket rolü.
 *  2. Ağırlık 300 değil 400: yazı karakterimiz 300 taşımıyor.
 *  3. Zemin #CBCBCB değil #D2D1CB: referansın zemini mürekkeple 4.22:1
 *     veriyor, AA eşiğinin altında. En koyu geçen ton seçildi (4.53:1).
 */

/** Referansın etiket dili: minik, büyük harf, harf arası açık. */
const etiket = {
  font: "400 10px 'IBM Plex Mono', monospace",
  letterSpacing: '.16em',
  textTransform: 'uppercase',
  color: 'var(--ink)',
  margin: 0,
} as const

/** Izgara hücresi: sıkı dolgu, 4px köşe, gölge ve border YOK. */
const hucre = {
  background: 'var(--paper-cream)',
  borderRadius: 4,
  padding: '18px 20px',
  display: 'flex',
  flexDirection: 'column',
  color: 'inherit',
} as const

export default async function Sadik() {
  const { etkinlikler, topluluklar, sayilar } = await tasarimVerisi()

  return (
    <main
      style={{
        // Tam genişlik, ortalanmış kap YOK — referansın yapısı bu.
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 8,
        padding: 8,
        fontWeight: 400,
      }}
    >
      {/* --- HÜCRE 1: künye. İçerik ALTA yaslı, üstü boş. -------------- */}
      <section style={{ ...hucre, minHeight: 470, justifyContent: 'space-between' }}>
        <div style={etiket}>literaslab — İstanbul</div>
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 400,
              letterSpacing: '.04em',
              lineHeight: 1.2,
              margin: 0,
              color: 'var(--ink)',
            }}
          >
            İnsanların kendi masalarını kurduğu yer.
          </h1>
          <p
            style={{
              fontSize: 16,
              fontWeight: 400,
              lineHeight: 1.5,
              color: 'var(--night)',
              margin: '14px 0 0',
            }}
          >
            Buluşmalar burada başlıyor. Katıl, ya da kendi masanı kur.
          </p>
        </div>
      </section>

      {/* --- HÜCRE 2: GERÇEKLER. Referansın "THE FACTS" bloğu:
           tek harfli alan etiketi solda, değer sağda, aralarında nokta. */}
      <section style={{ ...hucre, minHeight: 470 }}>
        <div style={{ ...etiket, marginBottom: 22 }}>Gerçekler</div>
        <dl style={{ margin: 0, display: 'grid', gap: 10 }}>
          {[
            ['T', 'Topluluk', String(sayilar.topluluk)],
            ['E', 'Etkinlik', String(sayilar.etkinlik)],
            ['Ş', 'Şehir', String(sayilar.sehir)],
            ['K', 'Kategori', String(CATEGORIES.length)],
          ].map(([harf, ad, deger]) => (
            <div
              key={ad}
              style={{ display: 'grid', gridTemplateColumns: '20px 1fr auto', gap: 10, alignItems: 'baseline' }}
            >
              <dt style={{ ...etiket, color: 'var(--muted-light)' }}>{harf}.</dt>
              <dd style={{ margin: 0, fontSize: 16, color: 'var(--night)' }}>{ad}</dd>
              <dd style={{ margin: 0, fontSize: 16, color: 'var(--ink)' }}>{deger}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* --- HÜCRE 3: davet metni. Referansta bu blok BÜYÜK HARF. ------ */}
      <section style={{ ...hucre, minHeight: 470, justifyContent: 'center' }}>
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
          Literaslab&apos;e hoş geldin. Bir masanın etrafında toplanmak için
          bahane çok: kitap, yürüyüş, kahve, fotoğraf. Katıl ya da kendi
          masanı kur — birkaç kişiyle başlayıp şehre yayılan bir şey olabilir.
        </p>
        <div style={{ display: 'flex', gap: 20, marginTop: 26 }}>
          <Link href="/kesfet" style={{ ...etiket, fontSize: 11 }}>Etkinlikler →</Link>
          <Link href="/community/new" style={{ ...etiket, fontSize: 11, color: 'var(--night)' }}>
            Topluluk kur →
          </Link>
        </div>
      </section>

      {/* --- HÜCRE 4–5: kategoriler, Roma rakamlı (referansın "What you
           should bring" listesi birebir bu dilde). İki sütun kaplıyor. */}
      <section style={{ ...hucre, gridColumn: 'span 2' }}>
        <div style={{ ...etiket, marginBottom: 20 }}>Ne ilgini çeker?</div>
        <ol
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '10px 40px',
          }}
        >
          {CATEGORIES.map((c, i) => (
            <li
              key={c.slug}
              style={{ display: 'grid', gridTemplateColumns: '34px 1fr', gap: 10, alignItems: 'baseline' }}
            >
              <span style={{ ...etiket, color: 'var(--muted-light)' }}>{roma(i + 1)}</span>
              <Link href={`/kesfet?category=${c.slug}`} style={{ fontSize: 16, color: 'var(--night)' }}>
                {c.label}
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* --- HÜCRE 6: topluluk dizini ---------------------------------- */}
      <section style={hucre}>
        <div style={{ ...etiket, marginBottom: 20 }}>Topluluklar</div>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
          {topluluklar.slice(0, 9).map((t) => (
            <li key={t.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <Link href={`/community/${t.id}`} style={{ fontSize: 16, color: 'var(--night)' }}>
                {t.name}
              </Link>
              <span style={{ ...etiket, color: 'var(--muted-light)', flex: 'none' }}>
                {t.member_count ?? 0}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* --- PROGRAM: referansın gün ızgarası. Her etkinlik bir hücre,
           tarih üstte etiket olarak, başlık altta. ---------------------- */}
      <section style={{ ...hucre, gridColumn: '1 / -1', background: 'transparent', padding: '26px 20px 6px' }}>
        <div style={etiket}>Program</div>
      </section>

      {etkinlikler.map((e) => (
        <Link key={e.id} href={`/event/${e.id}`} style={{ ...hucre, minHeight: 210, justifyContent: 'space-between' }}>
          <div style={{ ...etiket, color: 'var(--muted-light)', lineHeight: 1.9 }}>
            {dayOfMonth(e.event_date)} {formatMonthShort(e.event_date)}
            <br />
            {formatWeekday(e.event_date)}
            <br />
            {formatTime(e.event_date)}
          </div>
          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 400,
                letterSpacing: '.03em',
                lineHeight: 1.25,
                color: 'var(--ink)',
              }}
            >
              {e.title}
            </div>
            <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 8 }}>
              {e.community?.name}
              {e.location ? ` · ${e.location}` : ''}
            </div>
          </div>
        </Link>
      ))}

      {etkinlikler.length === 0 && (
        <section style={{ ...hucre, gridColumn: '1 / -1' }}>
          <p style={{ fontSize: 16, color: 'var(--muted)', margin: 0 }}>Henüz etkinlik yok.</p>
        </section>
      )}
    </main>
  )
}

/** Referansın hazırlık listesi Roma rakamı kullanıyor; kategorilerde aynı dil. */
function roma(n: number): string {
  const t: [number, string][] = [
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ]
  let k = '', kalan = n
  for (const [d, s] of t) while (kalan >= d) { k += s; kalan -= d }
  return k
}
