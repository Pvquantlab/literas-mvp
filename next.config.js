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

module.exports = nextConfig
