import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDateTimeShort } from '@/lib/date'
import AyarlarDurum from '@/components/ayarlar-durum'

// Kod→metin eşlemesi. Action serbest metin değil KOD gönderiyor; metni burası
// seçiyor ki adres çubuğundan uydurma mesaj gösterilemesin.
const SONUC: Record<string, { metin: string; hataMi: boolean }> = {
  yayinlandi:    { metin: 'Duyuru yayınlandı ve üyelere gönderildi.', hataMi: false },
  alicisiz:      { metin: 'Duyuru yayınlandı. E-posta bildirimi açık üye yok.', hataMi: false },
  cok_uye:       { metin: 'Duyuru yayınlandı ama üye sayısı tek seferde e-posta göndermek için fazla. Sayfada görünüyor.', hataMi: true },
  guncellendi:   { metin: 'Duyuru güncellendi. Gönderilmiş e-posta değişmedi.', hataMi: false },
  silindi:       { metin: 'Duyuru silindi.', hataMi: false },
  posta_hatasi:  { metin: 'Duyuru yayınlandı ama e-posta gönderilemedi.', hataMi: true },
  kismi_gonderim: { metin: 'Duyuru yayınlandı ama bazı üyelere e-posta ulaşmadı.', hataMi: true },
  limit:         { metin: 'Çok fazla istek, biraz bekle', hataMi: true },
  gecersiz:      { metin: 'Başlık 3-120, metin 10-3000 karakter olmalı', hataMi: true },
  yetkisiz:      { metin: 'Bu toplulukta duyuru yayınlama yetkin yok', hataMi: true },
  gunluk:        { metin: 'Bu topluluk bugün 3 duyuru gönderdi, yarın tekrar dene', hataMi: true },
  kaydedilemedi: { metin: 'Kaydedilemedi, lütfen tekrar dene', hataMi: true },
}

export default async function DuyuruListesi({
  params, searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ sonuc?: string }>
}) {
  const { id } = await params
  const { sonuc } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=${encodeURIComponent(`/community/${id}/duyuru`)}`)

  const kayit = sonuc && Object.hasOwn(SONUC, sonuc) ? SONUC[sonuc] : undefined

  const { data: topluluk } = await supabase
    .from('communities').select('name').eq('id', id).single()

  const { data: yonetici } = await supabase.rpc('topluluk_yoneticisi_mi', {
    p_community_id: id,
  })

  // RLS zaten onaylı olmayan üyeye boş döndürür; ayrıca üye olup olmadığını
  // bilmek için bölümü hiç göstermemek gerekiyor.
  const { data: duyurular, error } = await supabase
    .from('community_announcements')
    .select('id, title, body, created_at, updated_at, sent_count')
    .eq('community_id', id)
    .order('created_at', { ascending: false })

  if (error) console.error('[duyuru] liste sorgusu:', error)

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '48px 24px 80px' }}>
      <div style={{ font: "500 12px 'IBM Plex Mono', monospace", letterSpacing: '0.08em', color: 'var(--muted)', textTransform: 'lowercase' }}>
        {topluluk?.name ?? 'topluluk'}
      </div>
      <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', margin: '6px 0 18px' }}>
        Duyurular
      </h1>

      {kayit && (
        <AyarlarDurum
          durum={kayit.hataMi ? undefined : 'ok'}
          hata={kayit.hataMi ? kayit.metin : undefined}
          mesaj={kayit.hataMi ? undefined : kayit.metin}
        />
      )}

      {yonetici && (
        <Link href={`/community/${id}/duyuru/yeni`} className="btn-primary btn-sm">
          Duyuru yaz
        </Link>
      )}

      {error && (
        <p style={{ marginTop: 20, fontSize: 15, color: 'var(--muted)' }}>
          Duyurular yüklenemedi, az sonra tekrar dene.
        </p>
      )}

      {!error && (duyurular?.length ?? 0) === 0 && (
        <p style={{ marginTop: 20, fontSize: 15, color: 'var(--muted)' }}>
          Henüz duyuru yok.
        </p>
      )}

      <div style={{ marginTop: 24 }}>
        {duyurular?.map((d) => (
          <article key={d.id} style={{ padding: '18px 0', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>{d.title}</h2>
            <div style={{ font: "500 12px 'IBM Plex Mono', monospace", color: 'var(--muted)', marginBottom: 8 }}>
              {formatDateTimeShort(d.created_at)}
              {d.updated_at ? ' · düzenlendi' : ''}
              {yonetici ? ` · ${d.sent_count} kişiye ulaştı` : ''}
            </div>
            <p style={{ fontSize: 15, lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>{d.body}</p>
            {yonetici && (
              <Link
                href={`/community/${id}/duyuru/${d.id}/duzenle`}
                style={{ display: 'inline-block', marginTop: 10, fontSize: 13.5, color: 'var(--muted)' }}
              >
                düzenle
              </Link>
            )}
          </article>
        ))}
      </div>

      <Link href={`/community/${id}`} style={{ marginTop: 26, display: 'inline-block', color: 'var(--muted)' }}>
        ← topluluğa dön
      </Link>
    </main>
  )
}
