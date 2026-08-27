import { redirect } from 'next/navigation'

/**
 * Ayarlar server action'larının sonucunu kullanıcıya taşır.
 *
 * NEDEN: `<form action={serverAction}>` deseninde action'ın dönüş değeri
 * kullanıcıya ulaşmıyor. Eskiden bu yüzden supabase hataları (RLS reddi,
 * unique ihlali) sessizce yutuluyor, kullanıcı "kaydedildi" sanıyordu.
 * Sonucu query parametresiyle sayfaya geri taşıyoruz; sayfa AyarlarDurum
 * bileşeniyle gösteriyor.
 *
 * redirect() istisna fırlatır — try/catch içine alma.
 */
export function ayarlarSonucu(path: string, hata?: string): never {
  redirect(hata ? `${path}?hata=${encodeURIComponent(hata)}` : `${path}?durum=ok`)
}

/** zod flatten çıktısından kullanıcıya gösterilecek ilk hatayı seçer. */
export function ilkHata(fieldErrors: Record<string, string[] | undefined>): string {
  return Object.values(fieldErrors).flat().filter(Boolean)[0] ?? 'Geçersiz veri'
}
