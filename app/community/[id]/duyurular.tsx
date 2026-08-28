import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { formatDateTimeShort } from '@/lib/date'

const GOSTERILEN = 5

/**
 * Topluluk sayfasındaki "Duyurular" bölümü.
 *
 * Yalnızca onaylı üyeye render edilir (çağıran taraf karar verir). RLS de
 * aynı kuralı uyguluyor; bu ikinci kapı, tek kapı değil.
 */
export default async function Duyurular({
  communityId, yonetici,
}: {
  communityId: string
  yonetici: boolean
}) {
  const supabase = await createClient()

  const { data: duyurular, error } = await supabase
    .from('community_announcements')
    .select('id, title, body, created_at')
    .eq('community_id', communityId)
    .order('created_at', { ascending: false })
    .limit(GOSTERILEN + 1)

  if (error) console.error('[duyuru] bolum sorgusu:', error)

  const gosterilecek = (duyurular ?? []).slice(0, GOSTERILEN)
  const dahaVar = (duyurular?.length ?? 0) > GOSTERILEN

  return (
    <section className="cp-block">
      <h2 className="cp-h2">Duyurular</h2>

      {yonetici && (
        <Link href={`/community/${communityId}/duyuru/yeni`} className="btn-primary btn-sm">
          Duyuru yaz
        </Link>
      )}

      {error && (
        <div className="cp-empty"><p>Duyurular yüklenemedi, az sonra tekrar dene.</p></div>
      )}

      {!error && gosterilecek.length === 0 && (
        <div className="cp-empty"><p>Henüz duyuru yok.</p></div>
      )}

      <div style={{ marginTop: 14 }}>
        {gosterilecek.map((d) => (
          <article key={d.id} style={{ padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 15.5, fontWeight: 700, marginBottom: 2 }}>{d.title}</div>
            <div style={{ font: "500 12px 'IBM Plex Mono', monospace", color: 'var(--muted)', marginBottom: 6 }}>
              {formatDateTimeShort(d.created_at)}
            </div>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>{d.body}</p>
          </article>
        ))}
      </div>

      {(dahaVar || gosterilecek.length > 0) && (
        <Link
          href={`/community/${communityId}/duyuru`}
          style={{ display: 'inline-block', marginTop: 14, fontSize: 13.5, color: 'var(--muted)' }}
        >
          tüm duyurular →
        </Link>
      )}
    </section>
  )
}
