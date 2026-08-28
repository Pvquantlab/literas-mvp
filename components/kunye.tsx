import { SHAPES } from '@/components/category-art'

/**
 * Künye ızgarasının parçaları — week.wild.plus/athens-26 dilinden.
 *
 * DÜZELTME NOTU: ilk uyarlamada DOM ölçümüne bakıp "illüstrasyon yok, en
 * büyük metin 24px" sonucuna varmıştım. İkisi de yanıltıcıydı:
 *   - Dev "WILD WEEK" yazısı metin değil SVG, o yüzden ölçüme takılmadı.
 *   - Her hücre büyük, kabartma, TEK RENK bir illüstrasyon taşıyor;
 *     sayfanın güzelliğinin çoğu bu.
 * Yani ölçüm metni ve CSS'i gördü, GÖRSELİ göremedi. Doğrusu:
 * dev logotype + büyük sessiz illüstrasyon + minik yazı.
 */

/**
 * Hücreyi dolduran büyük, soluk, tek renk şekil — referanstaki beyaz
 * kabartmaların karşılığı. Yeni bir çizim seti üretmiyoruz: mevcut kategori
 * şekilleri zaten literas'ın görsel kimliği, burada sadece ÖLÇEĞİ ve
 * SESSİZLİĞİ değişiyor (minik ve parlak yerine dev ve soluk).
 */
export function Kabartma({
  slug,
  opaklik = 0.09,
  hizala = 'center',
}: {
  slug: string
  opaklik?: number
  hizala?: 'center' | 'bottom' | 'top'
}) {
  const sekil = SHAPES[slug]
  if (!sekil) return null
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        fill: 'var(--ink)',
        opacity: opaklik,
        pointerEvents: 'none',
        // Referansta kabartmalar hücreye taşacak kadar büyük ve genelde
        // alta/ortaya yaslı; kırpılmaları bilinçli.
        objectPosition: hizala,
        padding: '8%',
      }}
      preserveAspectRatio={
        hizala === 'bottom' ? 'xMidYMax meet' : hizala === 'top' ? 'xMidYMin meet' : 'xMidYMid meet'
      }
    >
      {sekil}
    </svg>
  )
}

/**
 * Dev logotype. Referansın "WILD WEEK"i SVG olduğu için ekranı kaplayabiliyor
 * ve tipografi ölçeğinden bağımsız — burada da öyle: viewBox'a oturan bir
 * metin, kabın genişliğini doldurur.
 */
export function DevLogotype({ metin = 'literaslab' }: { metin?: string }) {
  return (
    <svg
      viewBox="0 0 1000 150"
      role="img"
      aria-label={metin}
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      <text
        x="500"
        y="112"
        textAnchor="middle"
        fill="var(--ink)"
        style={{
          // Ağırlık ince, harf arası açık — referansın imza dili.
          font: "400 132px var(--font-sans), system-ui, sans-serif",
          letterSpacing: '.02em',
        }}
      >
        {metin}
      </text>
    </svg>
  )
}
