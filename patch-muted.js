#!/usr/bin/env node
/* ============================================================
   patch-muted.js — metin hiyerarşisi tek kaynaktan
   --muted ve --muted-light artık --night'tan color-mix ile türer.
   (Luma deseni: tek renk, opaklık kademeleri. Oranlar mevcut
   kontrast seviyelerini koruyacak şekilde hesaplandı.)

   Desen: çapalar tam olarak bir kez eşleşmezse HİÇ yazmadan çık.
   Kullanım: node patch-muted.js   (proje kökünde)
   ============================================================ */

const fs = require('fs')
const path = require('path')

const CSS = path.join('app', 'globals.css')

if (!fs.existsSync(CSS)) {
  console.error('HATA: app/globals.css bulunamadi. Proje kokunde misin?')
  process.exit(1)
}

const css = fs.readFileSync(CSS, 'utf8')

const A_MUTED = `  --muted: #48587D;          /* kart üstünde 7.08:1 — AA geçer */
  --muted-light: #707E9E;    /* yalnız 15px+ metin için (4.28:1) */`

function count(hay, needle) {
  let n = 0, i = 0
  while ((i = hay.indexOf(needle, i)) !== -1) { n++; i += needle.length }
  return n
}

const n = count(css, A_MUTED)
console.log(`${n === 1 ? 'OK  ' : 'HATA'}  globals.css : --muted blogu  (${n} eslesme)`)
if (n !== 1) {
  console.error('\nCapa tutmadi. HICBIR DOSYAYA YAZILMADI.')
  process.exit(1)
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-')
fs.writeFileSync(`${CSS}.bak-${stamp}`, css)

const N_MUTED = `  /* Metin hiyerarşisi tek kaynaktan: --night'ın opaklık kademeleri
     (Luma deseni). %78 ≈ eski #48587D (7.08:1 korunur),
     %58 ≈ eski #707E9E (4.28:1 korunur, yalnız 15px+ metin). */
  --muted: color-mix(in srgb, var(--night) 78%, transparent);
  --muted-light: color-mix(in srgb, var(--night) 58%, transparent);`

fs.writeFileSync(CSS, css.replace(A_MUTED, N_MUTED))

console.log(`
Yazildi: ${CSS}
Yedek:   ${CSS}.bak-${stamp}
Geri almak icin: git checkout app/globals.css
`)
