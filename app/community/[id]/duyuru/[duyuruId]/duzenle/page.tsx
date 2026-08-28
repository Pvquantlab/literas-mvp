import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { duyuruGuncelle, duyuruSil } from '../../actions'

export default async function DuyuruDuzenle({
  params,
}: {
  params: Promise<{ id: string; duyuruId: string }>
}) {
  const { id, duyuruId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/community/${id}/duyuru/${duyuruId}/duzenle`)}`)
  }

  const { data: yonetici } = await supabase.rpc('topluluk_yoneticisi_mi', {
    p_community_id: id,
  })
  if (!yonetici) {
    return (
      <main style={sayfaStil}>
        <h1 style={baslikStil}>Yetkin yok</h1>
        <p style={altStil}>Bu toplulukta duyuru düzenleme yetkin yok.</p>
      </main>
    )
  }

  const { data: duyuru } = await supabase
    .from('community_announcements')
    .select('id, title, body, community_id')
    .eq('id', duyuruId)
    .maybeSingle()

  if (!duyuru || duyuru.community_id !== id) {
    return (
      <main style={sayfaStil}>
        <h1 style={baslikStil}>Duyuru bulunamadı</h1>
        <p style={altStil}>Bu duyuru silinmiş ya da bu topluluğa ait değil.</p>
      </main>
    )
  }

  return (
    <main style={sayfaStil}>
      <h1 style={baslikStil}>Duyuruyu düzenle</h1>
      <p style={altStil}>
        <strong>Düzenleme, gönderilmiş e-postayı değiştirmez.</strong> Değişiklik
        yalnızca bu sayfada görünür ve yeniden e-posta gönderilmez.
      </p>

      <form action={duyuruGuncelle} style={{ marginTop: 22 }}>
        <input type="hidden" name="community_id" value={id} />
        <input type="hidden" name="duyuru_id" value={duyuru.id} />

        <label style={etiketStil} htmlFor="title">Başlık</label>
        <input id="title" name="title" defaultValue={duyuru.title} required minLength={3} maxLength={120} style={girdiStil} />

        <label style={etiketStil} htmlFor="body">Duyuru</label>
        <textarea id="body" name="body" defaultValue={duyuru.body} required minLength={10} maxLength={3000} rows={9} style={{ ...girdiStil, resize: 'vertical' }} />

        <button type="submit" className="btn-primary" style={{ marginTop: 18 }}>
          Kaydet
        </button>
      </form>

      <form action={duyuruSil} style={{ marginTop: 26 }}>
        <input type="hidden" name="community_id" value={id} />
        <input type="hidden" name="duyuru_id" value={duyuru.id} />
        <button type="submit" className="btn-secondary" style={{ fontSize: 13.5, padding: '8px 18px' }}>
          Duyuruyu sil
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
