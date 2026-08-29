'use client'

import { useEffect, useSyncExternalStore } from 'react'

/**
 * SİS — yapım talimatı §6, referansın "imza etkileşimi".
 *
 * Kütüphanesiz canvas 2D. İki katman:
 *   1. Bulut dokusu: 3 oktavlı fBm value-noise, yatay akıyor.
 *   2. Maske: fare gezdikçe yumuşak radyal gradyanla siliniyor
 *      (destination-out), her karede düşük alfayla geri doluyor,
 *      yani iz zamanla tekrar sise gömülüyor.
 *
 * TARİFTEN SAPMA (performans): doküman gürültüyü HER KARE düşük çözünürlükte
 * üretmeyi söylüyor. 1400x400'lük bir alanda bu, karede ~105 bin gürültü
 * hesabı demek. Bunun yerine doku BİR KEZ üretiliyor (yatayda dikişsiz
 * tekrarlanacak şekilde iki kat genişlikte) ve her kare yalnızca kaydırılıp
 * çiziliyor. Görsel sonuç aynı: bulutlar yatay akıyor. Kare başına maliyet
 * iki drawImage'e düşüyor.
 *
 * Erişilebilirlik: prefers-reduced-motion açıksa tek statik kare çizilir,
 * rAF döngüsü hiç başlamaz. Görünür alanda değilken IntersectionObserver
 * döngüyü durdurur. Dokunmatikte touchmove aynı işi görür.
 */

export type SisModu = 'logotype' | 'tam' | 'yok'

const VARSAYILAN: SisModu = 'logotype'
const ANAHTAR = 'literas-sis'
const OLAY = 'literas-sis-degisti'

/** Sis rengi — ölçülmüş değer (doküman §2, --fog). */
const SIS_RENGI = [62, 61, 56] as const

export function sisModuOku(): SisModu {
  if (typeof window === 'undefined') return VARSAYILAN
  const v = window.localStorage.getItem(ANAHTAR)
  return v === 'tam' || v === 'yok' || v === 'logotype' ? v : VARSAYILAN
}

export function sisModuYaz(m: SisModu) {
  window.localStorage.setItem(ANAHTAR, m)
  window.dispatchEvent(new CustomEvent(OLAY))
}

/**
 * Sis modu bir DIŞ KAYNAK (localStorage) ve React'in bunu izleme yolu
 * useSyncExternalStore. Önce effect içinde setState ile okuyordum; lint
 * haklı olarak "efekt içinde senkron setState zincirleme render tetikler"
 * dedi. Sunucu anlık görüntüsü varsayılanı döndürüyor, yani hidrasyon
 * uyuşmazlığı da olmuyor.
 */
function abone(cb: () => void) {
  window.addEventListener(OLAY, cb)
  window.addEventListener('storage', cb)
  return () => {
    window.removeEventListener(OLAY, cb)
    window.removeEventListener('storage', cb)
  }
}
const sunucuAnlik = () => VARSAYILAN

function useSisModu(): SisModu {
  return useSyncExternalStore(abone, sisModuOku, sunucuAnlik)
}

/** Sabit tohumlu karıştırma: sunucu/istemci farkı ve kare kare titreme olmasın. */
function permTablosu(): Uint8Array {
  const p = new Uint8Array(512)
  const temel = new Uint8Array(256)
  for (let i = 0; i < 256; i++) temel[i] = i
  let tohum = 1337
  for (let i = 255; i > 0; i--) {
    tohum = (tohum * 1103515245 + 12345) & 0x7fffffff
    const j = tohum % (i + 1)
    const t = temel[i]; temel[i] = temel[j]; temel[j] = t
  }
  for (let i = 0; i < 512; i++) p[i] = temel[i & 255]
  return p
}

const PERM = permTablosu()
const yumusat = (t: number) => t * t * (3 - 2 * t)
const karistir = (a: number, b: number, t: number) => a + (b - a) * t

function deger(x: number, y: number): number {
  const xi = Math.floor(x) & 255, yi = Math.floor(y) & 255
  const xf = x - Math.floor(x), yf = y - Math.floor(y)
  const u = yumusat(xf), v = yumusat(yf)
  const aa = PERM[PERM[xi] + yi], ab = PERM[PERM[xi] + ((yi + 1) & 255)]
  const ba = PERM[PERM[(xi + 1) & 255] + yi], bb = PERM[PERM[(xi + 1) & 255] + ((yi + 1) & 255)]
  return karistir(karistir(aa, ba, u), karistir(ab, bb, u), v) / 255
}

/** 3 oktav fBm. */
function fbm(x: number, y: number): number {
  let t = 0, genlik = 0.5, frekans = 1
  for (let i = 0; i < 3; i++) {
    t += genlik * deger(x * frekans, y * frekans)
    frekans *= 2
    genlik *= 0.5
  }
  return t / 0.875
}

/**
 * Yatayda dikişsiz tekrarlanabilen bulut dokusu.
 * Dikişsizlik için x ekseninde gürültü periyodik örnekleniyor.
 */
function dokuUret(g: number, y: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = g; c.height = y
  const ctx = c.getContext('2d')!
  const img = ctx.createImageData(g, y)
  const d = img.data
  const olcek = 3.2
  for (let j = 0; j < y; j++) {
    for (let i = 0; i < g; i++) {
      // x periyodik: i ve i+g aynı değeri versin diye iki örnek harmanlanıyor
      const t = i / g
      const a = fbm((i / g) * olcek, (j / y) * olcek)
      const b = fbm(((i / g) - 1) * olcek, (j / y) * olcek)
      const n = a * (1 - t) + b * t
      const k = (j * g + i) * 4
      d[k] = SIS_RENGI[0]; d[k + 1] = SIS_RENGI[1]; d[k + 2] = SIS_RENGI[2]
      // Yoğunluk eğrisi: ortayı koyult, uçları saydamlaştır
      d[k + 3] = Math.max(0, Math.min(255, (n - 0.28) * 420))
    }
  }
  ctx.putImageData(img, 0, 0)
  return c
}

/**
 * NEDEN CANVAS'I REACT DEĞİL DE BU BİLEŞEN ELLE OLUŞTURUYOR:
 * İlk hâlde canvas JSX'te dönülüyordu. Sayfa bir sunucu bileşeni ve akışlı
 * (streaming) render ediliyor; canvas React'in Suspense sınırının içinde,
 * gizli bir `DIV#S:0` kutusunda kalıp canlı ağaca hiç geçmedi. Belirti
 * şuydu: DOM'da canvas VAR ama offsetWidth 0, getComputedStyle width "100%"
 * (piksel değil, yani düzen ağacında değil) ve efekt hiç çalışmıyor.
 * Sunucunun HTML'i doğruydu (curl ile doğrulandı) -- sorun yerleşimdeydi.
 *
 * Çözüm: bileşen React'e hiç DOM vermiyor (her zaman null döner), canvas'ı
 * effect içinde kendisi oluşturup hedef elemana ekliyor. Böylece SSR,
 * hidrasyon ve Suspense denklemden tamamen çıkıyor.
 */
export function SisKatmani({
  hedef,
  hedefId,
  tavan,
}: {
  /** Bu katman hangi modda görünür. */
  hedef: Exclude<SisModu, 'yok'>
  /** Canvas'ın ekleneceği elemanın id'si. Yoksa hiçbir şey yapılmaz. */
  hedefId: string
  /** Sisin en yoğun hâli. logotype modunda marka okunur kalsın diye düşük. */
  tavan?: number
}) {
  const mod = useSisModu()

  const gorunur = mod === hedef
  const yogunlukTavani = tavan ?? (hedef === 'tam' ? 0.92 : 0.45)

  useEffect(() => {
    if (!gorunur) return

    // HEDEF HENÜZ OLMAYABİLİR: layout, sayfanın akışlı (streaming) içeriğinden
    // ÖNCE hidrasyona giriyor. Efekt ilk çalıştığında #sis-logotype daha
    // DOM'da değildi ve tek seferlik arama sessizce başarısız oluyordu --
    // belirti: hiç canvas yok, hata da yok. Hedef belirene kadar bekleniyor.
    let temizle: (() => void) | null = null
    let gozlemci: MutationObserver | null = null

    const dene = () => {
      const k = document.getElementById(hedefId)
      if (!k) return false
      gozlemci?.disconnect()
      gozlemci = null
      temizle = kur(k)
      return true
    }

    if (!dene()) {
      gozlemci = new MutationObserver(() => { dene() })
      gozlemci.observe(document.body, { childList: true, subtree: true })
    }

    return () => {
      gozlemci?.disconnect()
      temizle?.()
    }

    function kur(kutu: HTMLElement): () => void {
    const cv = document.createElement('canvas')
    cv.setAttribute('aria-hidden', 'true')
    Object.assign(cv.style, {
      position: 'absolute', inset: '0', width: '100%', height: '100%',
      display: 'block', zIndex: '2',
      // Altındaki bağlantılar tıklanabilir kalsın.
      pointerEvents: 'none',
    } as CSSStyleDeclaration)
    kutu.appendChild(cv)
    const ctx = cv.getContext('2d')
    if (!ctx) { cv.remove(); return () => {} }

    const azMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    let g = 0, y = 0
    let doku: HTMLCanvasElement | null = null
    let maske: HTMLCanvasElement | null = null
    let mctx: CanvasRenderingContext2D | null = null
    let rafId = 0
    let gorunurAlanda = true
    let x = 0

    function boyutla() {
      const r = cv!.getBoundingClientRect()
      g = Math.max(1, Math.round(r.width))
      y = Math.max(1, Math.round(r.height))
      cv!.width = Math.round(g * dpr)
      cv!.height = Math.round(y * dpr)
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)

      // Doku düşük çözünürlükte; büyütülünce bulanıklık bedavaya geliyor.
      doku = dokuUret(Math.max(24, Math.round(g / 4)), Math.max(16, Math.round(y / 4)))

      maske = document.createElement('canvas')
      maske.width = cv!.width; maske.height = cv!.height
      mctx = maske.getContext('2d')
      mctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      // Başlangıç: sis tam kapalı. Tavan zaten yoğunluğu sınırlıyor.
      mctx!.fillStyle = 'rgba(0,0,0,1)'
      mctx!.fillRect(0, 0, g, y)
    }

    function ciz() {
      if (!doku || !maske) return
      ctx!.clearRect(0, 0, g, y)
      ctx!.imageSmoothingEnabled = true
      ctx!.globalAlpha = yogunlukTavani
      // Dikişsiz yatay akış: doku iki kez, biri x'te biri x-g'de
      ctx!.drawImage(doku, x, 0, g, y)
      ctx!.drawImage(doku, x - g, 0, g, y)
      ctx!.globalAlpha = 1
      // Maske uygulanıyor: sis YALNIZ maskenin opak olduğu yerde kalır
      ctx!.globalCompositeOperation = 'destination-in'
      ctx!.drawImage(maske, 0, 0, g, y)
      ctx!.globalCompositeOperation = 'source-over'
    }

    function kare() {
      if (!gorunurAlanda) { rafId = 0; return }
      x = (x + 0.18) % g
      // Sis yavaşça geri kapanıyor
      mctx!.globalCompositeOperation = 'source-over'
      mctx!.fillStyle = 'rgba(0,0,0,0.012)'
      mctx!.fillRect(0, 0, g, y)
      ciz()
      rafId = requestAnimationFrame(kare)
    }

    function sil(cx: number, cyy: number) {
      if (!mctx) return
      const r = 120
      const gr = mctx.createRadialGradient(cx, cyy, 0, cx, cyy, r)
      gr.addColorStop(0, 'rgba(0,0,0,0.55)')
      gr.addColorStop(0.55, 'rgba(0,0,0,0.22)')
      gr.addColorStop(1, 'rgba(0,0,0,0)')
      mctx.globalCompositeOperation = 'destination-out'
      mctx.fillStyle = gr
      mctx.fillRect(cx - r, cyy - r, r * 2, r * 2)
      mctx.globalCompositeOperation = 'source-over'
    }

    // DİKKAT: canvas'ta pointer-events:none var (altındaki bağlantılar
    // tıklanabilir kalsın diye), o yüzden olay canvas'a GELMEZ. Dinleyici
    // pencerede duruyor, koordinat canvas'a göre çevriliyor ve alan dışı
    // hareketler eleniyor.
    function isaretci(e: PointerEvent | TouchEvent) {
      const r = cv!.getBoundingClientRect()
      const p = 'touches' in e ? e.touches[0] : e
      if (!p) return
      const cx = p.clientX - r.left, cyy = p.clientY - r.top
      if (cx < -140 || cyy < -140 || cx > r.width + 140 || cyy > r.height + 140) return
      sil(cx, cyy)
    }

    boyutla()

    if (azMotion) {
      // Tek statik kare: hareket yok, döngü yok.
      ctx.globalAlpha = yogunlukTavani * 0.6
      ctx.drawImage(doku!, 0, 0, g, y)
      ctx.globalAlpha = 1
      return () => { cv.remove() }
    }

    // Açılışta sis %60 seyreltilmiş başlasın ki içerik hiç görünmez kalmasın
    // (dokümanın kendi mobil kuralı; burada her cihazda uygulanıyor).
    mctx!.globalCompositeOperation = 'destination-out'
    mctx!.fillStyle = 'rgba(0,0,0,0.6)'
    mctx!.fillRect(0, 0, g, y)
    mctx!.globalCompositeOperation = 'source-over'

    const io = new IntersectionObserver((girisler) => {
      gorunurAlanda = girisler[0]?.isIntersecting ?? false
      if (gorunurAlanda && !rafId) rafId = requestAnimationFrame(kare)
    }, { threshold: 0 })
    io.observe(cv)

    const ro = new ResizeObserver(() => { boyutla() })
    ro.observe(cv)

    window.addEventListener('pointermove', isaretci as EventListener, { passive: true })
    window.addEventListener('touchmove', isaretci as EventListener, { passive: true })

    rafId = requestAnimationFrame(kare)

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      io.disconnect(); ro.disconnect()
      window.removeEventListener('pointermove', isaretci as EventListener)
      window.removeEventListener('touchmove', isaretci as EventListener)
      cv.remove()
    }
    }
  }, [gorunur, yogunlukTavani, hedefId])

  return null
}

/**
 * Sis motoru: iki katmanı da mount eder.
 *
 * NEDEN LAYOUT'TA, SAYFADA DEĞİL: SisKatmani önce app/page.tsx içinde
 * render ediliyordu ve effect'i HİÇ çalışmadı -- sayfanın istemci
 * bileşenleri o Suspense sınırında hidrasyona ulaşmıyordu (layout'taki
 * SisSecici sorunsuz çalışırken). Katman zaten hedefe id ile tutunduğu
 * için nerede mount edildiği önemsiz; layout güvenli yer.
 * Hedef id yoksa (ana sayfa dışındaki rotalar) hiçbir şey yapmaz.
 */
export function SisMotoru() {
  return (
    <>
      <SisKatmani hedef="logotype" hedefId="sis-logotype" />
      <SisKatmani hedef="tam" hedefId="sis-hero" />
    </>
  )
}

/**
 * Dev-only seçici. Üç sis modunu canlı karşılaştırmak için.
 * Üretimde hiç render edilmez.
 */
export function SisSecici() {
  const mod = useSisModu()
  if (process.env.NODE_ENV !== 'development') return null

  const secenekler: { m: SisModu; ad: string }[] = [
    { m: 'logotype', ad: 'Logotype' },
    { m: 'tam', ad: 'Tam hero' },
    { m: 'yok', ad: 'Sis yok' },
  ]

  return (
    <div
      style={{
        position: 'fixed', left: 12, bottom: 12, zIndex: 9999,
        display: 'flex', gap: 6, padding: 8,
        background: 'var(--paper-cream)', borderRadius: 4,
        border: '1px solid var(--border-mid)',
      }}
    >
      <span style={{
        font: "400 10px var(--font-mono), monospace", letterSpacing: '.16em',
        textTransform: 'uppercase', color: 'var(--muted)', alignSelf: 'center',
        marginRight: 4,
      }}>
        sis
      </span>
      {secenekler.map((s) => (
        <button
          key={s.m}
          type="button"
          onClick={() => sisModuYaz(s.m)}
          style={{
            font: "400 12px var(--font-sans), system-ui, sans-serif",
            padding: '6px 10px', borderRadius: 4, cursor: 'pointer',
            border: 'none',
            background: mod === s.m ? 'var(--ink)' : 'var(--panel)',
            color: mod === s.m ? '#fff' : 'var(--ink)',
          }}
        >
          {s.ad}
        </button>
      ))}
    </div>
  )
}
