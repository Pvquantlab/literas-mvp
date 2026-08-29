import './globals.css'
import { Marcellus, Instrument_Sans, IBM_Plex_Mono } from 'next/font/google'
import { createClient } from '@/lib/supabase-server'
import Footer from '@/components/footer'
import Header from '@/components/header'
import { SITE_URL } from '@/lib/site'
import RegisterSW from '@/components/register-sw'
import { IconSprite } from '@/components/category-art'
import type { Metadata, Viewport } from 'next'

/**
 * Fontlar artık globals.css'teki @import yerine burada.
 *
 * @import render'ı bloklayan bir zincir yaratıyordu: tarayıcı CSS'i indirip
 * ayrıştırmadan font isteğini başlatamıyor. next/font fontları build sırasında
 * indirip kendi domaininden servis eder — üçüncü taraf isteği yok, preload
 * otomatik, layout shift sıfır. globals.css'teki @import satırını sil.
 */

/**
 * MARCELLUS — referansın sesi.
 *
 * week.wild.plus'ın yazı karakteri Albertus Nova Light: Roma yazıtı kökenli,
 * uçları yayvan bir serif. Ölçüm 2045 metin düğümünün 1919'unun bu fontta
 * olduğunu gösterdi — yani sitenin sesi BU, ben onu sans'a çevirmekle
 * referanstan uzaklaşmıştım.
 *
 * Albertus ticari. Marcellus ücretsiz karşılığı: aynı yazıt kökeni, aynı
 * yayvan çıkışlar. Tek ağırlığı var (400) — referansın "light" hissi zaten
 * ince bir karakterden geliyordu, ağırlık kademesinden değil.
 *
 * Literata'nın yerini aldı: o çağdaş bir kitap serifi, bambaşka bir ses.
 */
const serif = Marcellus({
  subsets: ['latin-ext'],   // Türkçe ğ ı ş için latin-ext şart
  weight: ['400'],
  variable: '--font-serif',
  display: 'swap',
})

const sans = Instrument_Sans({
  subsets: ['latin-ext'],
  // NOT: referansin (week.wild.plus) imza agirligi 300 (olculdu: 2045 metin
  // dugumunun 1919'u). Bu yazi karakteri 300 TASIMIYOR -- en incesi 400.
  // O yuzden "ince" burada 400 demek. Gercekten 300 istenirse yazi karakteri
  // degismeli; bu ayri bir karar.
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
})

const mono = IBM_Plex_Mono({
  subsets: ['latin-ext'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'literaslab · kendi topluluğunu kur',
    template: '%s · literaslab',
  },
  description: 'Kitap kulübü, yürüyüş, dil pratiği. Topluluk burada başlar.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    siteName: 'literaslab',
    title: 'literaslab · kendi topluluğunu kur',
    description: 'Kitap kulübü, yürüyüş, dil pratiği. Topluluk burada başlar.',
    url: SITE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'literaslab · kendi topluluğunu kur',
    description: 'Kitap kulübü, yürüyüş, dil pratiği. Topluluk burada başlar.',
  },
  icons: {
    icon: [{ url: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'literas' },
}

export const viewport: Viewport = {
  themeColor: '#0755BB',
  width: 'device-width',
  initialScale: 1,
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  /**
   * getUser() doğru tercih — cookie'deki JWT'yi Supabase sunucusunda
   * doğrular. getSession() kullanma: o sadece cookie'yi okur ve
   * istemcide taklit edilebilir.
   */
  const { data: { user } } = await supabase.auth.getUser()

  let profile: { name: string | null; avatar_url: string | null } | null = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('name, avatar_url')
      .eq('id', user.id)
      .maybeSingle()   // .single() satır yoksa hata fırlatıp layout'u patlatıyordu
    profile = data
  }

  return (
    <html lang="tr" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <a href="#content" className="skip-link">İçeriğe atla</a>

        {/**
          * Kategori ikonlarının SVG tanımları. Görünmez (width=0), sayfada
          * bir kez duruyor; kartlar <use href="#ci-icon-..."> ile çağırıyor.
          * Buradan kaldırılırsa kapaklar boş çıkar.
          */}
        <IconSprite />

        <Header
          user={user ? { id: user.id } : null}
          profileName={profile?.name ?? null}
          profileAvatar={profile?.avatar_url ?? null}
        />

        {children}

        <Footer />
        {/* SİS GEÇİCİ OLARAK KAPALI -- components/sis.tsx duruyor.
            SisMotoru mount edildiğinde ana sayfa ve /kesfet "yükleniyor..."
            durumunda kilitleniyor: React akışlı içeriği gizli kutudan canlı
            ağaca hiç taşımıyor (iki <main>, kartlar görünmez). Hata
            FIRLAMIYOR, o yüzden sessiz.
            İzole edildi: layout'tan çıkarınca sayfa anında düzeliyor,
            geri koyunca bozuluyor -- iki kez doğrulandı. Canvas'ı hiç
            eklemeyecek hâle getirdiğimde bile bozuluyor, yani sebep DOM'a
            dokunmak değil, bileşenin kendisi.
            Çalışan ana sayfa sisten önemli; sebep bulunana kadar kapalı. */}
        <RegisterSW />
      </body>
    </html>
  )
}

/**
 * Service worker kaydı <RegisterSW /> bileşeninde (components/register-sw.tsx).
 * Inline script kullanılmıyor: dangerouslySetInnerHTML katı bir CSP kurmayı
 * engelliyor ('unsafe-inline' vermek zorunda kalırsın).
 */
