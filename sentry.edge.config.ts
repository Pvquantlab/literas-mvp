/**
 * Sentry — EDGE çalışma zamanı (proxy.ts / middleware burada koşuyor).
 * Ayarlar sunucu tarafıyla aynı; Edge'in kendi SDK giriş noktası var.
 */
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // ORTAM ETİKETİ. Bu olmadan yerel geliştirmede tetiklenen hatalar canlı
  // hataların arasına karışır ve panelde ayırt edilemez. Vercel kendi
  // ortamını VERCEL_ENV ile bildiriyor (production / preview);
  // yerelde NODE_ENV'e düşüyor.
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  sendDefaultPii: false,
  tracesSampleRate: 0.1,
})
