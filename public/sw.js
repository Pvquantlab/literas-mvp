/**
 * literas service worker — YALNIZCA içerik-hash'li statik dosyalar.
 *
 * ÖNCEKİ SÜRÜMÜN SORUNLARI (hepsi bilinçli olarak kaldırıldı):
 *
 * 1. ASSETS içinde '/' vardı: ana sayfanın HTML'i install anında önbelleğe
 *    alınıyordu. Next.js HTML'i build id'ye bağlı JS parçalarına atıf yapar;
 *    yeni deploy sonrası önbellekteki eski HTML artık var olmayan parçaları
 *    ister ve uygulama kırılır. "Bayat HTML" probleminin ta kendisiydi.
 *
 * 2. HER GET yanıtı önbelleğe kopyalanıyordu — giriş yapmış kullanıcının
 *    kişiselleştirilmiş sayfası dahil (header'da adı, "Gidiyorum" listesi).
 *    Çıkış yaptıktan sonra ya da ağ koptuğunda o sayfa geri servis edilebiliyordu.
 *
 * 3. res.ok kontrolü yoktu: 404/500 yanıtlar da önbelleğe yazılıyordu, yani
 *    geçici bir hata kalıcı hâle gelebiliyordu.
 *
 * 4. Önbellek adı sabitti ve hiç yükseltilmiyordu; activate'teki temizlik
 *    yalnızca ad değişince çalıştığı için eski girdiler süresiz kalıyordu.
 *
 * 5. Başarısız her istekte caches.match('/') dönüyordu: bir görsel isteğine
 *    HTML yanıtı veriliyordu.
 *
 * ŞİMDİKİ KURAL: sadece /_next/static/* önbelleğe alınır. Bu dosyaların
 * adları içerik hash'i taşır, yani aynı URL her zaman aynı içeriktir —
 * bayatlama kavram olarak mümkün değil. Doküman (HTML), API ve diğer her şey
 * doğrudan ağdan geçer, hiç dokunulmaz.
 */

const CACHE = 'literas-static-v2'

self.addEventListener('install', () => {
  // Ön yükleme yok: neyin gerekeceğini isteğe göre öğreniyoruz.
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      // v1'de önbelleğe alınmış kişiselleştirilmiş HTML de böyle temizlenir.
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') return

  let url
  try {
    url = new URL(request.url)
  } catch {
    return
  }

  if (url.origin !== self.location.origin) return

  // Doküman isteklerine ASLA dokunma: kişisel veri içerir ve build id'ye bağlıdır.
  if (request.mode === 'navigate' || request.destination === 'document') return

  // Yalnızca içerik-hash'li statik dosyalar.
  if (!url.pathname.startsWith('/_next/static/')) return

  event.respondWith(
    caches.match(request).then((hit) => {
      // Hash'li URL: önbellekteki kopya her zaman doğru.
      if (hit) return hit

      return fetch(request).then((res) => {
        // Yalnızca gerçekten başarılı, kendi origin'imizden gelen yanıtları sakla.
        if (res.ok && res.type === 'basic') {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(request, copy))
        }
        return res
      })
    })
  )
})
