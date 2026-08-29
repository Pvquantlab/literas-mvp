import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.1.104'],
  // Supabase Storage'daki kapak görselleri için. next/image bu izin
  // olmadan dış adresten görsel yüklemez.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'gwcanlhrzkvhrlbueakb.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // Güvenlik başlıkları: tarayıcı seviyesinde ek koruma katmanı.
  // (CSP hâlâ yok — harita kaynakları yüzünden ayrı bir adım olarak ele alacağız.)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Tarayıcının içerik türünü tahmin etmesini engelle (MIME sniffing)
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Site başka sitelerde iframe içinde açılamaz (clickjacking koruması)
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Dış bağlantılarda referer bilgisini sınırla
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Kamera ve mikrofon kapalı. Konum SADECE kendi sitemize açık:
          // "Konumumu kullan" butonu bunu gerektiriyor. Eski değer
          // geolocation=() idi ve o butonu sessizce kırıyordu.
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          // HTTPS'i 2 yıl boyunca zorunlu tut
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ]
  },
}

/**
 * Sentry sarmalayıcısı.
 *
 * Kaynak haritası yüklemesi SENTRY_AUTH_TOKEN varsa yapılır. Token yoksa
 * derleme yine geçer, yalnızca canlıdaki yığın izleri küçültülmüş hâlde
 * okunur. Yani token opsiyonel; DSN olmadan da her şey sessizce kapalı.
 *
 * Kaynak haritaları istemciye SERVİS EDİLMİYOR (hideSourceMaps): Sentry'ye
 * yüklenip tarayıcıdan gizleniyorlar, aksi halde kodun tamamı okunabilir
 * hâle gelirdi.
 */
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  silent: !process.env.CI,
  hideSourceMaps: true,
  // disableLogger KALDIRILDI: kullanımdan kalkmış ve SDK'nın kendi uyarısına
  // göre Turbopack'te zaten etkisiz. Uyarı üreten ölü ayar tutmuyoruz.

  // Reklam engelleyiciler /monitoring gibi yolları kesebiliyor; Sentry
  // isteklerini kendi alan adımız üzerinden geçiriyoruz.
  tunnelRoute: '/monitoring',
})
