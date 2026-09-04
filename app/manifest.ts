import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'literas — topluluğunu kur',
    short_name: 'literas',
    description: 'Kitap kulübü, yürüyüş, dil pratiği. Topluluk burada başlar.',
    start_url: '/',
    display: 'standalone',
    background_color: '#CBCBCB',    // --paper (zemin); manifest CSS değişkeni okuyamaz, globals ile senkron
    theme_color: '#0755BB',    // --ink; layout.tsx viewport.themeColor ile aynı
    lang: 'tr',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
