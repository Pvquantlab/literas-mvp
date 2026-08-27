import './globals.css'
import { Literata, Instrument_Sans, IBM_Plex_Mono } from 'next/font/google'
import { createClient } from '@/lib/supabase-server'
import Footer from '@/components/footer'
import Header from '@/components/header'
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

const serif = Literata({
  subsets: ['latin-ext'],   // Türkçe ğ ı ş için latin-ext şart
  weight: ['400', '600'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
})

const sans = Instrument_Sans({
  subsets: ['latin-ext'],
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
  metadataBase: new URL('https://www.literaslab.com'),
  title: {
    default: 'literaslab — kendi topluluğunu kur',
    template: '%s — literaslab',
  },
  description: 'Kitap kulübü, yürüyüş, dil pratiği. Topluluk burada başlar.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    siteName: 'literaslab',
    title: 'literaslab — kendi topluluğunu kur',
    description: 'Kitap kulübü, yürüyüş, dil pratiği. Topluluk burada başlar.',
    url: 'https://www.literaslab.com',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'literaslab — kendi topluluğunu kur',
    description: 'Kitap kulübü, yürüyüş, dil pratiği. Topluluk burada başlar.',
  },
  icons: {
    icon: [{ url: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'literas' },
}

export const viewport: Viewport = {
  themeColor: '#1E3A2B',
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
