/**
 * Next.js bu dosyayı sunucu başlarken BİR KEZ çalıştırıyor.
 * Hangi çalışma zamanındaysak ilgili Sentry yapılandırmasını yüklüyor.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

/**
 * Sunucu bileşenlerinde ve route handler'larda oluşan hataları yakalar.
 * BU KANCA OLMADAN Next 15+ sunucu hatalarının çoğu Sentry'ye HİÇ ULAŞMAZ --
 * tam da bu oturumda kaçırdığımız türden sessiz çökmeler.
 */
export { captureRequestError as onRequestError } from '@sentry/nextjs'
