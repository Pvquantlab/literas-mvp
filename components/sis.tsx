'use client'

import { useEffect } from 'react'

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

/**
 * KARAR VERİLDİ: sis hem künye ızgarasının hem dev logotype hücresinin
 * üstünde. Üç modlu deneme sistemi ve dev seçicisi kaldırıldı; karar
 * verildikten sonra ölü koddu.
 */

/** Sis rengi — ölçülmüş değer (doküman §2, --fog). */
const SIS_RENGI = [62, 61, 56] as const

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
  hedefId,
  tavan = 0.9,
}: {
  /** Canvas'ın ekleneceği elemanın id'si. Yoksa hiçbir şey yapılmaz. */
  hedefId: string
  /** Sisin en yoğun hâli. */
  tavan?: number
}) {
  const yogunlukTavani = tavan

  useEffect(() => {

    // HEDEF GEÇ GELİR VE DEĞİŞEBİLİR. İki ayrı tuzak yaşandı:
    //   1. Layout, sayfanın akışlı (streaming) içeriğinden ÖNCE hidrasyona
    //      giriyor; ilk aramada #sis-logotype henüz DOM'da yok.
    //   2. Tek seferlik arama başarılı olsa bile canvas, akış sırasındaki
    //      GEÇİCİ kopyaya ekleniyor; React nihai içeriği yerleştirince o
    //      kopya (ve canvas) yok oluyor. Belirti: hedefler doğru boyutta
    //      ama içlerinde canvas yok, hata da yok.
    // Bu yüzden gözlemci KAPANMIYOR: hedef kaybolursa yeniden kuruluyor.
    // Ayrıca hedef GÖRÜNÜR ve gerçek boyutta olmadan kurulum yapılmıyor.
    let temizle: (() => void) | null = null
    let bagliKutu: HTMLElement | null = null

    // BOYUT KOŞULU YOK. Önce "gerçek boyutu olsun" diye şart koymuştum ve
    // hiç bağlanmadı: bu ağaçta hedefler effect anında 0x0 ölçülüyor,
    // gerçek boyuta ancak akış bittikten sonra kavuşuyorlar. Bağlanma
    // elemanın VARLIĞINA bakıyor; doğru boyut, kare döngüsündeki yeniden
    // ölçüm ve konteyneri izleyen ResizeObserver ile sonradan oturuyor.
    const uygunHedef = (): HTMLElement | null =>
      document.querySelector<HTMLElement>('#' + CSS.escape(hedefId))

    const esitle = () => {
      const k = uygunHedef()
      if (!k) return
      // Zaten doğru kutuya bağlıysak ve canvas hâlâ oradaysa dokunma.
      if (bagliKutu === k && bagliKutu.querySelector('canvas')) return
      temizle?.()
      temizle = kur(k)
      bagliKutu = k
    }

    // MutationObserver TEK BAŞINA YETMİYOR: hedef, son DOM mutasyonundan
    // SONRA yerleşip ölçülebilir hâle gelebiliyor (akış biterken). O anda
    // gözlemciyi tetikleyecek bir mutasyon kalmadığı için bağlanma hiç
    // gerçekleşmiyordu. Kısa bir kare döngüsü bu boşluğu kapatıyor.
    let denemeId = 0
    const sonKare = performance.now() + 5000
    const dogrula = () => {
      esitle()
      if (!bagliKutu && performance.now() < sonKare) {
        denemeId = requestAnimationFrame(dogrula)
      } else {
        denemeId = 0
      }
    }
    dogrula()

    // Gözlemci açık kalıyor: hedef sonradan değişirse yeniden bağlanır.
    const gozlemci = new MutationObserver(esitle)
    gozlemci.observe(document.body, { childList: true, subtree: true })

    return () => {
      if (denemeId) cancelAnimationFrame(denemeId)
      gozlemci.disconnect()
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

    /** Ölçü geçerliyse kurar ve true döner; değilse DOKUNMAZ. */
    function boyutla(): boolean {
      // KONTEYNERİ ölç, canvas'ı DEĞİL. Canvas position:absolute + %100;
      // layout'un effect'i sayfa yerleşmeden önce çalıştığı için canvas'ın
      // kendi rect'i 0x0 çıkıyordu -> backing store 2x2 kalıyor ve 2x2'lik
      // görüntü tüm alana geriliyordu. Ekranda "sis gibi" duruyordu ama
      // bulut dokusu da, ortaya çıkarma da yoktu.
      const r = kutu.getBoundingClientRect()
      const gw = Math.round(r.width || kutu.offsetWidth || kutu.clientWidth)
      const gy = Math.round(r.height || kutu.offsetHeight || kutu.clientHeight)
      // GEÇERSİZ ÖLÇÜYE KURULUM YAPMA. Eskiden 0 ölçü 1x1'e yuvarlanıp
      // 2x2'lik bir doku üretiyordu; o doku tüm alana gerilince ekranda
      // "sis gibi" duran düz bir bulanıklık çıkıyor, bulut da ortaya
      // çıkarma da olmuyordu. Artık ölçü oturana kadar bekleniyor.
      if (gw < 8 || gy < 8) return false
      g = gw
      y = gy
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
      return true
    }

    function ciz() {
      if (!doku || !maske || g < 8 || y < 8) return
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
      // Yerleşim geç oturur: ölçü geçerli olana kadar her karede dene.
      if (g < 8 || y < 8) {
        if (!boyutla()) { rafId = requestAnimationFrame(kare); return }
      }
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
      // Hareket istenmiyor: TEK statik kare, sürekli döngü yok, fare
      // dinleyicisi yok. Ölçü henüz oturmadıysa yalnızca ölçü için birkaç
      // kare beklenir, sonra bir kez çizilip durulur.
      let sabitId = 0
      const birKez = () => {
        if (g < 8 || y < 8) {
          if (!boyutla()) { sabitId = requestAnimationFrame(birKez); return }
        }
        ctx.globalAlpha = yogunlukTavani * 0.6
        ctx.drawImage(doku!, 0, 0, g, y)
        ctx.globalAlpha = 1
        sabitId = 0
      }
      birKez()
      return () => {
        if (sabitId) cancelAnimationFrame(sabitId)
        cv.remove()
      }
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

    // Konteyner izleniyor: boyutu o belirliyor.
    const ro = new ResizeObserver(() => { boyutla() })
    ro.observe(kutu)

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
  }, [yogunlukTavani, hedefId])

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
      {/* Künye ızgarası: yoğun. Referansın kendi düzeni de bu. */}
      <SisKatmani hedefId="sis-hero" tavan={0.9} />
      {/* Logotype hücresi: tavan DAHA DÜŞÜK. Maske birkaç saniyede tavana
          doluyor; 0.9 olsaydı fare hiç oynamadığında marka adı kalıcı
          olarak sisin altında kalırdı. 0.55'te sis açıkça görünüyor ama
          "literaslab" okunur kalıyor. */}
      <SisKatmani hedefId="sis-logotype" tavan={0.55} />
    </>
  )
}
