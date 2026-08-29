
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
          // Referansın "WILD WEEK"i özel çizilmiş bir yazıt harfi; bizde
          // karşılığı Marcellus. Sans'ta duruyordu, sayfanın geri kalanıyla
          // aynı sesi konuşmuyordu.
          font: "400 132px var(--font-serif), Georgia, serif",
          letterSpacing: '.02em',
        }}
      >
        {metin}
      </text>
    </svg>
  )
}
