'use client'

import { useEffect } from 'react'

/**
 * Service worker kaydı.
 *
 * NEDEN AYRI BİR BİLEŞEN: kayıt eskiden layout'ta dangerouslySetInnerHTML ile
 * inline script olarak yapılıyordu. Inline script, katı bir CSP kurmayı
 * engelliyor ('unsafe-inline' vermek zorunda kalırsın ve CSP'nin XSS koruması
 * çöker). Sonra inline script kaldırıldı ama yerine bu bileşen hiç yazılmadı;
 * public/sw.js aylarca ölü kod olarak durdu — üstelik daha ÖNCE kaydolmuş
 * tarayıcılarda eski (hatalı) sürüm çalışmaya devam ediyordu.
 *
 * Yeni sw.js yalnızca /_next/static/* önbelleğe alır ve activate anında eski
 * önbellekleri siler; yani bu kayıt, eskiden kalan bayat HTML'i de temizler.
 */
export default function RegisterSW() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    // Sayfa yüklemesiyle yarışmasın: kayıt kritik yolda değil.
    const kaydet = () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('[sw] kaydedilemedi:', err)
      })
    }

    if (document.readyState === 'complete') {
      kaydet()
    } else {
      window.addEventListener('load', kaydet, { once: true })
      return () => window.removeEventListener('load', kaydet)
    }
  }, [])

  return null
}
