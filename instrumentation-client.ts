/**
 * Sentry — TARAYICI tarafı.
 *
 * SESSION REPLAY BİLİNÇLİ OLARAK YOK: kullanıcının ekranını kaydediyor
 * (gizlilik) ve istemci paketini kayda değer şişiriyor. Hata + düşük
 * oranlı iz yeterli.
 */
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  sendDefaultPii: false,
  tracesSampleRate: 0.1,
})

/** Sayfa geçişlerinin iz kaydına girmesi için gereken kanca. */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
