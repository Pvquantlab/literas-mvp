import Link from 'next/link'
import type { ReactNode } from 'react'
import { RolyefMasa } from '@/components/rolyef'

/**
 * Bölüm ayracı — künye ızgarasının hücre dilinin dikey uzantısı.
 *
 * Referansın hücreleri: içerik üste/alta yaslı, ortası boş, hücreyi
 * dolduran tek renk rölyef. Burada her ayraç AYNI masayı bir kademe daha
 * çizilmiş gösterir (RolyefMasa `asama`): sayfa boyunca masa kurulur.
 * Roma rakamı gerçek bir sıralamayı işaretliyor — sayfa bir program.
 *
 * Hareket CSS'te (.masa-ciz): kütüphane yok, reduced-motion'da son kare.
 */
type Eylem = { href: string; etiket: string; ikincil?: boolean; dugme?: boolean }

export default function Bolum({
  no,
  baslik,
  asama,
  alt,
  eylemler,
  vurgu = false,
  kisa = false,
  id,
}: {
  /** Roma rakamı: 'I' … 'V' */
  no: string
  /** Rakam iceriyorsa <span className="sayi"> ile sar: Marcellus'ta 1/I ayrilmaz. */
  baslik: ReactNode
  /** Masanın kademesi: 1 boş … 4 tam */
  asama: 1 | 2 | 3 | 4
  alt?: ReactNode
  eylemler?: Eylem[]
  /** Vurgu: referansın BEYAZ kilit paneli — künyedeki davet hücresiyle aynı beyaz, açılış ve kapanış refren. */
  vurgu?: boolean
  /** Boş durum: bir bölüm değil, bir cümle — kısa hücre. */
  kisa?: boolean
  id?: string
}) {
  const sinif = ['bolum', vurgu && 'bolum-vurgu', kisa && 'bolum-kisa'].filter(Boolean).join(' ')
  return (
    <section id={id} className={sinif} aria-labelledby={id ? `${id}-baslik` : undefined}>
      <span className="bolum-no">{no}</span>

      <span className="masa-ciz" aria-hidden="true">
        <RolyefMasa asama={asama} />
      </span>

      <div className="bolum-alt-blok">
        <h2 id={id ? `${id}-baslik` : undefined} className="bolum-baslik">{baslik}</h2>
        {alt && <p className="bolum-alt">{alt}</p>}
        {eylemler && eylemler.length > 0 && (
          <div className="bolum-eylemler">
            {eylemler.map((e) => (
              <Link
                key={e.href + e.etiket}
                href={e.href}
                className={['bolum-eylem', e.ikincil && 'ikincil', e.dugme && 'dugme'].filter(Boolean).join(' ')}
              >
                {e.etiket} →
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
