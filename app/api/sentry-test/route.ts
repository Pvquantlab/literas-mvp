import { NextResponse } from 'next/server'

/**
 * Sentry doğrulama ucu — YALNIZCA GELİŞTİRMEDE.
 *
 * Yol haritası 1.5 "kasıtlı test hatasıyla doğrula" diyor. Bu uç bilerek
 * hata fırlatır; Sentry doğru kuruluysa hata birkaç saniye içinde panele
 * düşer.
 *
 * ÜRETİMDE 404 DÖNER. Canlıda çağrılabilen bir "hata fırlat" ucu bırakmak
 * gereksiz bir yüzey; ayrıca gerçek hata kayıtlarının arasına gürültü
 * katardı.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Bulunamadı', { status: 404 })
  }
  throw new Error('Sentry kurulum testi — bu hata bilerek fırlatıldı')
}

/** Uç çalışıyor mu diye bakmak için: hata fırlatmadan durum döner. */
export async function HEAD() {
  return NextResponse.json({ ok: process.env.NODE_ENV !== 'production' })
}
