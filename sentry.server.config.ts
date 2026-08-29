/**
 * Sentry — SUNUCU tarafı (Node.js çalışma zamanı).
 *
 * NEDEN GEREKLİ: bu oturumda canlıda sessizce çöken bir sayfa vardı
 * (QR check-in, prototip zinciri) ve bunu ancak kullanıcı ekran görüntüsü
 * gönderince öğrendik. Sunucu tarafı hataların hiçbir yere düşmediği bir
 * kör nokta vardı; Sentry o noktayı kapatıyor.
 *
 * DSN YOKSA SESSİZCE KAPALI. init boş DSN ile çağrılınca SDK hiçbir şey
 * göndermez. Yerel geliştirme ve preview dağıtımları böylece kotayı
 * yemiyor; yalnızca env'e DSN konan ortam rapor gönderiyor.
 */
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // ORTAM ETİKETİ. Bu olmadan yerel geliştirmede tetiklenen hatalar canlı
  // hataların arasına karışır ve panelde ayırt edilemez. Vercel kendi
  // ortamını VERCEL_ENV ile bildiriyor (production / preview);
  // yerelde NODE_ENV'e düşüyor.
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,

  // KİŞİSEL VERİ GÖNDERİLMİYOR. sendDefaultPii true olsaydı IP adresi,
  // çerezler ve istek başlıkları da giderdi. Gizlilik sayfası KVKK'ya
  // atıfla işleyicileri tek tek sayıyor; oraya "hata kayıtları" olarak
  // giren şeyin içinde kullanıcı kimliği olmamalı.
  sendDefaultPii: false,

  // Yol haritası 1.5'te yazan değer. İzlerin %10'u örnekleniyor:
  // performans görünürlüğü için yeterli, ücretsiz kotayı yakmıyor.
  tracesSampleRate: 0.1,

  // Gürültü azaltma: geliştirmede konsola da yaz, canlıda yazma.
  debug: false,
})
