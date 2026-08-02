const fs = require('fs')
const p = 'app/globals.css'
const problems = []
let s = fs.readFileSync(p, 'utf8')

if (s.includes('--- Hero zemini: milimetrik')) { console.error('DURDU — zaten uygulanmis'); process.exit(1) }

const edits = [

// 1) .hx: tam yüzey ızgara + alt sınır çizgisi
[`.hx {
  position: relative;
  overflow: hidden;
  text-align: center;
  padding: var(--s-6) var(--s-5) var(--s-7);
}`,
`/* --- Hero zemini: milimetrik kâğıt ---
   İnce mavi kareler bütün hero'yu kaplar, altta net bir çizgiyle biter.
   body'nin yatay defter çizgileri bu bölgede örtülür — geçiş alt sınırla
   işaretleniyor. Kareler 26px; 46px'te seyrek, 18px'te gürültülü kalıyordu. */
.hx {
  position: relative;
  overflow: hidden;
  text-align: center;
  padding: var(--s-8) var(--s-5);
  background-color: var(--paper-cream);
  background-image:
    linear-gradient(rgba(43, 111, 212, .11) 1px, transparent 1px),
    linear-gradient(90deg, rgba(43, 111, 212, .11) 1px, transparent 1px);
  background-size: 26px 26px;
  border-bottom: 1.5px solid rgba(43, 111, 212, .5);
}`],

// 2) Başlık arkasındaki maskeli ızgara artık gereksiz — zemin zaten ızgaralı
[`/* --- Arka plandaki silik ızgara --- */
.hx-inner::before {
  content: "";
  position: absolute;
  left: -4%; right: -4%;
  top: 46px; height: 62%;
  pointer-events: none;
  background-image:
    linear-gradient(var(--grad-2) 1px, transparent 1px),
    linear-gradient(90deg, var(--grad-2) 1px, transparent 1px);
  background-size: 46px 46px;
  opacity: .12;
  -webkit-mask-image: radial-gradient(72% 58% at 50% 50%, #000 42%, transparent 100%);
  mask-image: radial-gradient(72% 58% at 50% 50%, #000 42%, transparent 100%);
}`,
`/* Başlığın arkasındaki ayrı ızgara kaldırıldı — zemin artık baştan sona
   ızgaralı, ikisi üst üste binince kare içinde kare çıkıyordu. Onun yerine
   başlığın arkasına yumuşak bir ışık: dev kelime ızgaradan ayrılsın. */
.hx-inner::before {
  content: "";
  position: absolute;
  left: 50%; top: 34%;
  width: 92%; height: 46%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  background: radial-gradient(60% 60% at 50% 50%, var(--paper-cream) 40%, transparent 100%);
}`],

// 3) Mobilde dolgu
[`@media (max-width: 960px) {
  .hx-objs { display: none; }
  .hx { padding: var(--s-5) var(--s-4) var(--s-6); }
  .hx-strip { margin-top: var(--s-6); }
}`,
`@media (max-width: 960px) {
  .hx-objs { display: none; }
  .hx { padding: var(--s-7) var(--s-4); background-size: 20px 20px; }
  .hx-strip { margin-top: var(--s-6); }
}`],
]

const bad = []
edits.forEach(([a], i) => {
  const n = s.split(a).length - 1
  if (n !== 1) bad.push(`  ${i + 1}. capa ${n} kez bulundu`)
})
if (bad.length) {
  console.error('DURDU — dosyaya dokunulmadi:\n' + bad.join('\n'))
  process.exit(1)
}
edits.forEach(([a, b]) => { s = s.replace(a, b) })
fs.writeFileSync(p, s)
console.log(`OK — ${edits.length} blok guncellendi`)
