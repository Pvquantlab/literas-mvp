#!/usr/bin/env node
/* ============================================================
   patch-hero2.js — hero: keskin ızgara + düz koyu + kalın sans

   Desen: önce BÜTÜN çapaları say. Biri tam olarak bir kez
   eşleşmezse hiçbir dosyaya yazmadan çık.

   Kullanım:  node patch-hero2.js
   Proje kökünde (package.json'ın yanında) çalıştır.
   ============================================================ */

const fs = require('fs')
const path = require('path')

const CSS = path.join('app', 'globals.css')
const LAY = path.join('app', 'layout.tsx')

/* ---------- 1) Dosyalar var mı ---------- */

for (const f of [CSS, LAY]) {
  if (!fs.existsSync(f)) {
    console.error(`HATA: ${f} bulunamadi. Proje kokunde misin?`)
    process.exit(1)
  }
}

const css = fs.readFileSync(CSS, 'utf8')
const lay = fs.readFileSync(LAY, 'utf8')

/* ---------- 2) Çapalar ---------- */

const A_SANS_W = `  weight: ['400', '500', '600'],
  variable: '--font-sans',`

const A_GRID = `  background-image:
    linear-gradient(rgba(43, 111, 212, .11) 1px, transparent 1px),
    linear-gradient(90deg, rgba(43, 111, 212, .11) 1px, transparent 1px);
  background-size: 26px 26px;
  border-bottom: 1.5px solid rgba(43, 111, 212, .5);`

const A_WORD = `.hx-word {
  display: block;
  font-family: var(--font-serif), Georgia, serif;
  font-weight: 600;
  font-size: clamp(44px, 13vw, 118px);
  line-height: .94;
  letter-spacing: -.036em;
  color: var(--ink);
}`

const A_SUPPORTS = `@supports ((-webkit-background-clip: text) or (background-clip: text)) {
  .hx-eyebrow {
    background: linear-gradient(94deg, var(--grad-1) 2%, var(--grad-2) 48%, var(--grad-4) 98%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .hx-word {
    background: linear-gradient(96deg,
      var(--grad-1) 3%, var(--grad-2) 32%, var(--grad-3) 58%,
      var(--grad-4) 80%, var(--grad-5) 99%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
}`

const A_GLOW = `.hx-inner::before {
  content: "";
  position: absolute;
  left: 50%; top: 34%;
  width: 92%; height: 46%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: -1;
  background: radial-gradient(60% 60% at 50% 50%, var(--paper-cream) 40%, transparent 100%);
}`

const A_MOBILE = `  .hx { padding: var(--s-7) var(--s-4); background-size: 20px 20px; }`

/* ---------- 3) Doğrula ---------- */

function count(hay, needle) {
  let n = 0, i = 0
  while ((i = hay.indexOf(needle, i)) !== -1) { n++; i += needle.length }
  return n
}

const checks = [
  ['layout.tsx  : Instrument_Sans agirliklari', lay, A_SANS_W],
  ['globals.css : hero izgara zemini',          css, A_GRID],
  ['globals.css : .hx-word blogu',              css, A_WORD],
  ['globals.css : @supports degrade blogu',     css, A_SUPPORTS],
  ['globals.css : .hx-inner::before isik',      css, A_GLOW],
  ['globals.css : mobil .hx kurali',            css, A_MOBILE],
]

let bad = false
for (const [label, hay, needle] of checks) {
  const n = count(hay, needle)
  console.log(`${n === 1 ? 'OK  ' : 'HATA'}  ${label}  (${n} eslesme)`)
  if (n !== 1) bad = true
}

if (bad) {
  console.error('\nEn az bir capa tutmadi. HICBIR DOSYAYA YAZILMADI.')
  console.error('Dosyalar beklenenden farkli — bana bu ciktiyi gonder.')
  process.exit(1)
}

/* ---------- 4) Yedek ---------- */

const stamp = new Date().toISOString().replace(/[:.]/g, '-')
fs.writeFileSync(`${CSS}.bak-${stamp}`, css)
fs.writeFileSync(`${LAY}.bak-${stamp}`, lay)

/* ---------- 5) Yeni içerik ---------- */

// 5a) Instrument Sans'a 700 ekle
const N_SANS_W = `  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',`

// 5b) Izgara: .11 -> .20 opaklik, 26px -> 24px kare, ust sinir cizgisi eklendi.
//     Algorand'in zemini bu: ince ama NET cizgiler, ustte ve altta kapanis.
const N_GRID = `  background-image:
    linear-gradient(rgba(43, 111, 212, .20) 1px, transparent 1px),
    linear-gradient(90deg, rgba(43, 111, 212, .20) 1px, transparent 1px);
  background-size: 24px 24px;
  border-top: 1.5px solid rgba(43, 111, 212, .5);
  border-bottom: 1.5px solid rgba(43, 111, 212, .5);`

// 5c) Dev kelime: serif -> kalin sans, degrade -> duz lacivert.
const N_WORD = `.hx-word {
  display: block;
  font-family: var(--font-sans), 'Segoe UI', system-ui, sans-serif;
  font-weight: 700;
  font-size: clamp(46px, 13.5vw, 124px);
  line-height: .92;
  letter-spacing: -.042em;
  color: var(--ink);
}`

// 5d) Degrade blogu tamamen kalkti. Eyebrow duz mavi kaliyor
//     (.hx-eyebrow icindeki color: var(--grad-2) devrede).
const N_SUPPORTS = `/* Degrade metin kaldirildi: baslik artik tek renk lacivert, eyebrow
   tek renk mavi. Referans (algorand.co) tek renkli ve yuksek kontrast. */`

// 5e) Baslik arkasindaki beyaz radyal yikama kalkti — keskin izgarada
//     leke gibi duruyordu.
const N_GLOW = `/* .hx-inner::before (beyaz radyal isik) kaldirildi: izgara netlestikten
   sonra izgaranin uzerinde bulanik bir leke birakiyordu. */`

// 5f) Mobilde de ayni netlik
const N_MOBILE = `  .hx { padding: var(--s-7) var(--s-4); background-size: 18px 18px; }`

/* ---------- 6) Yaz ---------- */

let outCss = css
outCss = outCss.replace(A_GRID, N_GRID)
outCss = outCss.replace(A_WORD, N_WORD)
outCss = outCss.replace(A_SUPPORTS, N_SUPPORTS)
outCss = outCss.replace(A_GLOW, N_GLOW)
outCss = outCss.replace(A_MOBILE, N_MOBILE)

const outLay = lay.replace(A_SANS_W, N_SANS_W)

fs.writeFileSync(CSS, outCss)
fs.writeFileSync(LAY, outLay)

console.log(`
Yazildi.
  ${CSS}
  ${LAY}

Yedekler:
  ${CSS}.bak-${stamp}
  ${LAY}.bak-${stamp}

Sonraki adim:  npm run dev
Geri almak icin: git checkout app/globals.css app/layout.tsx
`)
