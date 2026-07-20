import './globals.css'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import Footer from '@/components/footer'
import Header from '@/components/header'

import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.literaslab.com'),
  title: {
    default: 'literaslab — kendi topluluğunu kur',
    template: '%s — literaslab',
  },
  description: 'Kitap kulübü, yürüyüş, dil pratiği. Topluluk burada başlar.',
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
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'literas',
  },
}

export const viewport: Viewport = {
  themeColor: '#1E3A2B',
  width: 'device-width',
  initialScale: 1,
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('name, avatar_url')
      .eq('id', user.id)
      .single()
    profile = data
  }

  return (
    <html lang="tr">
      <body>
        <Header
          user={user ? { id: user.id } : null}
          profileName={profile?.name ?? null}
          profileAvatar={profile?.avatar_url ?? null}
        />
        {children}
        <Footer />
        <script
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator) { window.addEventListener('load', function () { navigator.serviceWorker.register('/sw.js').catch(function () {}) }) }`,
          }}
        />
      </body>
    </html>
  )
}