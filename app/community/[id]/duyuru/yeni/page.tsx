import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { duyuruYayinla } from '../actions'

/**
 * Duyuru gönderimi bu rota segmentinden tetikleniyor ve parçalı gönderici
 * alıcılar arasında kasıtlı olarak bekliyor: 100 alıcılık tavanda ~20 saniye.
 * Süreyi açıkça yazmazsak o tavan anlamsız kalır.
 *
 * Vercel Hobby'de tavan zaten 60; daha büyük bir değer yazmanın faydası yok,
 * plan tavanına çekilir. Emsal: app/api/cron/reminders/route.ts.
 */
export const maxDuration = 60

export default async function YeniDuyuru({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=${encodeURIComponent(`/community/${id}/duyuru/yeni`)}`)

  const { data: yonetici } = await supabase.rpc('topluluk_yoneticisi_mi', {
    p_community_id: id,
  })
  if (!yonetici) {
    return (
      <main style={sayfaStil}>
        <h1 style={baslikStil}>Yetkin yok</h1>
        <p style={altStil}>Bu toplulukta duyuru yayınlama yetkin yok.</p>
      </main>
    )
  }

  const { data: topluluk } = await supabase
    .from('communities').select('name').eq('id', id).single()

  // Tahmini alıcı sayısı: kesin sayı gönderimden sonra sent_count'ta olacak.
  // get_member_emails bildirimi kapatmış üyeleri süzdüğü için bu sayı üst sınır.
  const { count: uyeSayisi } = await supabase
    .from('community_members')
    .select('id', { count: 'exact', head: true })
    .eq('community_id', id)
    .eq('status', 'approved')
    .neq('user_id', user.id)

  return (
    <main style={sayfaStil}>
      <div style={ustBilgiStil}>{topluluk?.name ?? 'topluluk'}</div>
      <h1 style={baslikStil}>Duyuru yaz</h1>
      <p style={altStil}>
        Bu duyuru en fazla <strong>{uyeSayisi ?? 0} üyeye</strong> e-posta olarak
        gidecek. Bildirimlerini kapatmış üyelere gönderilmez.
      </p>

      <form action={duyuruYayinla} style={{ marginTop: 22 }}>
        <input type="hidden" name="community_id" value={id} />

        <label style={etiketStil} htmlFor="title">Başlık</label>
        <input id="title" name="title" required minLength={3} maxLength={120} style={girdiStil} />

        <label style={etiketStil} htmlFor="body">Duyuru</label>
        <textarea id="body" name="body" required minLength={10} maxLength={3000} rows={9} style={{ ...girdiStil, resize: 'vertical' }} />

        <button type="submit" className="btn-primary" style={{ marginTop: 18 }}>
          Yayınla ve gönder
        </button>
      </form>

      <Link href={`/community/${id}/duyuru`} style={{ marginTop: 22, display: 'inline-block', color: 'var(--muted)' }}>
        ← duyurulara dön
      </Link>
    </main>
  )
}

const sayfaStil = { maxWidth: 640, margin: '0 auto', padding: '48px 24px 80px' } as const
const baslikStil = { fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', margin: '6px 0 10px' } as const
const altStil = { fontSize: 15, lineHeight: 1.6, color: 'var(--muted)', margin: 0 } as const
const ustBilgiStil = {
  font: "500 12px 'IBM Plex Mono', monospace",
  letterSpacing: '0.08em',
  color: 'var(--muted)',
  textTransform: 'lowercase',
} as const
const etiketStil = { display: 'block', fontSize: 13.5, fontWeight: 700, margin: '16px 0 6px' } as const
const girdiStil = {
  width: '100%',
  padding: '11px 14px',
  border: '1.5px solid var(--border)',
  borderRadius: 12,
  fontSize: 15,
  fontFamily: 'inherit',
  background: 'var(--paper-cream)',
  color: 'var(--ink)',
} as const
