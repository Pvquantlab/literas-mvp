import { redirect } from 'next/navigation'

/**
 * Bu sayfa /ayarlar/profil'e yönlendiriyor.
 *
 * NEDEN: aynı veriyi düzenleyen İKİ ayrı sayfa vardı. Bu sayfadaki form
 * doğrudan istemciden `profiles` tablosuna yazıyordu — zod yok, uzunluk
 * sınırı yok, rate limit yok. Yani /ayarlar/profil'e eklenen tüm doğrulamalar
 * bu URL üzerinden atlanabiliyordu (bio megabaytlarca olabilirdi).
 *
 * Sayfayı silmek yerine yönlendiriyoruz ki eski bağlantılar ve yer imleri
 * 404 vermesin. /ayarlar/profil aynı işi yapıyor ve fazladan ad, kullanıcı
 * adı ve konum alanları da orada.
 */
export default async function EditProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await params
  redirect('/ayarlar/profil')
}
