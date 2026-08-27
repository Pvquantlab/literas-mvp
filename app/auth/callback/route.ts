import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

/**
 * OAuth ve e-posta doğrulama dönüş noktası.
 *
 * `next` hedefi burada da doğrulanıyor. login/signup sayfaları aynı kontrolü
 * istemcide yapıyordu ama bu rota doğrudan çağrılabilir; tek savunma katmanı
 * istemcide durmamalı.
 */
function guvenliNext(raw: string | null): string {
  if (!raw) return '/'
  // Site içi mutlak yol olmalı: "//host" ve "/\host" dışarı çıkar.
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return '/'
  return raw
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = guvenliNext(searchParams.get('next'))

  // Supabase hata durumunda kendi parametrelerini ekler; bunları ayırt edip
  // kullanıcıya doğru mesajı gösterebilmek için login'e taşıyoruz.
  const saglayiciHatasi = searchParams.get('error_code') ?? searchParams.get('error')

  if (!code) {
    const kod =
      saglayiciHatasi && /expired|otp_expired/i.test(saglayiciHatasi)
        ? 'link_expired'
        : 'no_code'
    return NextResponse.redirect(`${origin}/login?error=${kod}`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] oturum kurulamadı:', error.message)
    const kod = /expired/i.test(error.message) ? 'link_expired' : 'auth_failed'
    return NextResponse.redirect(`${origin}/login?error=${kod}`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
