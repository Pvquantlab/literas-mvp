/**
 * Sentry — EDGE çalışma zamanı (proxy.ts / middleware burada koşuyor).
 * Ayarlar sunucu tarafıyla aynı; Edge'in kendi SDK giriş noktası var.
 */
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  sendDefaultPii: false,
  tracesSampleRate: 0.1,
})
