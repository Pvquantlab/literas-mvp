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

    // GELİŞTİRMEDE KAYDETME. Dev derlemesinde /_next/static/* adları içerik
    // hash'i taşımıyor; service worker onları önbelleğe alınca sonraki
    // derlemeye BAYAT JS servis ediyor ve sayfa "yükleniyor..."da kalıyor.
    // Ayrıca zaten kayıtlı olan varsa kaldırılıyor: bir kez zehirlenen
    // tarayıcı kendini böyle toparlıyor.
    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations().then((rs) => {
        rs.forEach((r) => r.unregister())
      }).catch(() => {})
      return
    }

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
