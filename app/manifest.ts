import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'literas — topluluğunu kur',
    short_name: 'literas',
    description: 'Kitap kulübü, yürüyüş, dil pratiği. Topluluk burada başlar.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F5F1E8',
    theme_color: '#1E3A2B',
    lang: 'tr',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
