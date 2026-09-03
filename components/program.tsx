import Link from 'next/link'
import { byValue } from '@/lib/categories'
import { bulunmaHali } from '@/lib/turkce'
import { SHAPES } from '@/components/category-art'
import type { CommunitySummary } from '@/components/community-card'

/**
 * Program — toplulukların listesi, afiş dilinde.
 *
 * Kart ızgarası DEĞİL: referansın ölçülen "hap satırı" dili (solda Roma
 * rakamı, sağda öğe adı). Ana sayfa bir afiş; katalog /kesfet'te ve orada
 * kartlar duruyor. Beş topluluk ızgarada 4+1 yetim kalıyordu; program
 * satırında beş, beştir.
 *
 * Kategori işareti: kart kapaklarındaki AYNI şekil kütüphanesi (SHAPES),
 * düz ve currentColor — üçüncü bir kimlik dili doğmasın.
 */
const ROMA = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

function Glif({ slug }: { slug: string }) {
  const sekil = SHAPES[slug]
  if (!sekil) return null
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <g className="ci-body">{sekil}</g>
    </svg>
  )
}

export default function Program({ topluluklar }: { topluluklar: CommunitySummary[] }) {
  return (
    <div>
      <div className="program-bas" aria-hidden="true">
        <span />
        <span>Masa</span>
        <span>Şehir</span>
        <span>Konu</span>
        <span>Üye</span>
      </div>
      <ol className="program">
        {topluluklar.map((c, i) => {
          const kat = byValue(c.category)
          const uye = c.member_count ?? 0
          return (
            <li key={c.id} className="reveal">
              <Link href={`/community/${c.id}`} className="program-satir">
                <span className="program-no">{ROMA[i] ?? String(i + 1)}</span>
                <span className="program-ad">{c.name}</span>
                <span className="program-sehir">{bulunmaHali(c.city) ?? '—'}</span>
                <span className="program-kat">
                  {kat && <Glif slug={kat.slug} />}
                  {kat?.label ?? '—'}
                </span>
                <span className="program-uye" aria-label={`${uye} üye`}>{uye}</span>
              </Link>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
