/** @type {import('next').NextConfig} */
const nextConfig = {
  // Güvenlik başlıkları: tarayıcı seviyesinde ek koruma katmanı.
  // (CSP bilinçli olarak yok — harita/OSM kaynakları ve inline script'ler
  // yüzünden dikkatli kurulmazsa siteyi bozabilir; ileride eklenebilir.)
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
          // Kamera/mikrofon/konum API'lerini kapat (site bunları kullanmıyor)
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
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
