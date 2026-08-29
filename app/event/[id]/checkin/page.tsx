import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDateTimeShort } from '@/lib/date'
import AyarlarDurum from '@/components/ayarlar-durum'
import { girisiOnayla, girisiGeriAl } from './actions'

// Action'lar serbest metin değil KOD gönderiyor (bkz. actions.ts CheckinHata).
// Metin buradan seçiliyor: `?hata=` adres çubuğundan gelebildiği için, aksi
// halde okutulan QR'ı kuran kişi organizatöre kendi yazdığı bir mesajı
// gösterebilirdi. Tanınmayan kod genel mesaja düşer.
const HATA_MESAJLARI: Record<string, string> = {
  limit: 'Çok fazla istek, biraz bekle',
  gecersiz: 'Geçersiz kod',
  yetkisiz: 'Bu etkinliği yönetme yetkin yok',
  basarisiz: 'İşlem başarısız, tekrar dene',
}

export default async function CheckinPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ t?: string; hata?: string }>
}) {
  const { id } = await params
  const { t, hata } = await searchParams
  const supabase = await createClient()

  const hataMesaji = hata ? (HATA_MESAJLARI[hata] ?? HATA_MESAJLARI.basarisiz) : undefined

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    // next kodlanıyor: kodlanmadığında hedefin kendi `?t=` parametresi
    // /login'in query dizesine karışıyor ve adres bozuk kuruluyordu.
    const hedef = `/event/${id}/checkin${t ? `?t=${t}` : ''}`
    redirect(`/login?next=${encodeURIComponent(hedef)}`)
  }

  // Yetki kapısı: rsvps SELECT politikası USING (true), sayfa kendi
  // yetkisini kontrol etmezse giriş yapmış herkes katılımcı listesini
  // görebilir. etkinlik_yoneticisi_mi içeride auth.uid() kullanır, yani
  // çağıran yalnızca KENDİ yetkisini sorgulayabilir.
  const { data: yetkili } = await supabase.rpc('etkinlik_yoneticisi_mi', { p_event_id: id })
  if (!yetkili) return <Mesaj baslik="Yetkin yok" alt="Bu etkinliği yönetme yetkin yok." />

  // Token varsa: tek kişilik onay görünümü
  if (t) {
    const { data, error } = await supabase.rpc('checkin_dogrula', { p_token: t })
    // Derinlemesine savunma: RPC de kendi içinde yetki kontrolü yapıyor.
    if (error?.message?.includes('yetkisiz')) return <Mesaj baslik="Yetkin yok" alt="Bu etkinliği yönetme yetkin yok." />
    const kayit = data?.[0]
    if (!kayit) return <Mesaj baslik="Geçersiz kod" alt="Bu kod geçersiz." />

    // Token'ın etkinliği ile adresteki etkinlik aynı olmalı. Aynı kişinin iki
    // etkinliğini yönettiği durumda, A'nın sayfasında B'nin QR'ı okutulursa
    // yetki kapısı geçiliyordu (ikisinde de yetkili) ve giriş yanlış
    // etkinliğin sayfasından onaylanıyordu.
    if (kayit.event_id !== id) {
      return <Mesaj baslik="Başka etkinlik" alt="Bu QR bu etkinliğe ait değil." />
    }

    return (
      <main style={sayfaStil}>
        <h1 style={baslikStil}>{kayit.katilimci_adi}</h1>
        <AyarlarDurum hata={hataMesaji} />
        {kayit.checked_in_at ? (
          <>
            <p style={altStil}>{formatDateTimeShort(kayit.checked_in_at)}&apos;te giriş yapmış.</p>
            <form action={girisiGeriAl}>
              <input type="hidden" name="event_id" value={id} />
              <input type="hidden" name="token" value={t} />
              <button type="submit" className="btn-secondary">Girişi geri al</button>
            </form>
          </>
        ) : (
          <form action={girisiOnayla}>
            <input type="hidden" name="event_id" value={id} />
            <input type="hidden" name="token" value={t} />
            <button type="submit" className="btn-primary" style={{ fontSize: 17, padding: '14px 30px' }}>
              Girişi onayla
            </button>
          </form>
        )}
        <Link href={`/event/${id}/checkin`} style={{ marginTop: 22, display: 'inline-block', color: 'var(--muted)' }}>
          ← tüm girişler
        </Link>
      </main>
    )
  }

  // Token yoksa: sayaç + liste
  // rsvps'te user:profiles(...) gömmesi kullanılmıyor: rsvps -> profiles
  // arasında checked_in_by ile ikinci bir FK var, ipucusuz gömme PGRST201
  // ile belirsizlik hatası veriyor. Ayrıca profiles'ın SELECT politikası
  // yalnızca kendi satırını görmeye izin veriyor — organizatör başka
  // katılımcıların profiles satırını okuyamaz. İsimler bunun yerine
  // event/[id]/page.tsx'teki desenle public_profiles'tan ayrıca çekilir.
  const { data: kayitlar, error: kayitlarError } = await supabase
    .from('rsvps')
    .select('id, user_id, checked_in_at')
    .eq('event_id', id)
    .order('checked_in_at', { ascending: false, nullsFirst: false })

  if (kayitlarError) console.error('[checkin] liste sorgusu:', kayitlarError)

  const attendeeIds = (kayitlar ?? []).map((k) => k.user_id).filter(Boolean)
  const { data: attendeeProfiles, error: profilError } = attendeeIds.length > 0
    ? await supabase.from('public_profiles').select('id, name').in('id', attendeeIds)
    : { data: [] as { id: string; name: string | null }[], error: null }

  if (profilError) console.error('[checkin] profil sorgusu:', profilError)

  const adById = new Map((attendeeProfiles ?? []).map((p) => [p.id, p.name]))

  const toplam = kayitlar?.length ?? 0
  const giren = kayitlar?.filter((k) => k.checked_in_at).length ?? 0
  const listeHatasi = kayitlarError || profilError

  return (
    <main style={sayfaStil}>
      <h1 style={baslikStil}>Girişler</h1>
      <AyarlarDurum hata={hataMesaji} />
      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 15, color: 'var(--muted)' }}>
        {toplam} kayıt · {giren} giriş
      </p>
      <ul style={{ listStyle: 'none', padding: 0, marginTop: 20 }}>
        {kayitlar?.map((k) => (
          <li key={k.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
            <span>{adById.get(k.user_id) ?? 'İsimsiz'}</span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: k.checked_in_at ? 'var(--ink)' : 'var(--muted)' }}>
              {k.checked_in_at ? formatDateTimeShort(k.checked_in_at) : 'gelmedi'}
            </span>
          </li>
        ))}
      </ul>
      {listeHatasi && <p style={altStil}>Liste yüklenemedi, az sonra tekrar dene.</p>}
      {!listeHatasi && toplam === 0 && <p style={altStil}>Henüz kimse katılmıyor.</p>}
    </main>
  )
}

function Mesaj({ baslik, alt }: { baslik: string; alt: string }) {
  return (
    <main style={sayfaStil}>
      <h1 style={baslikStil}>{baslik}</h1>
      <p style={altStil}>{alt}</p>
    </main>
  )
}

const sayfaStil = { maxWidth: 520, margin: '0 auto', padding: '48px 24px 80px' } as const
const baslikStil = { fontSize: 30, fontWeight: 400, letterSpacing: '0.02em', margin: '0 0 10px' } as const
const altStil = { fontSize: 15, lineHeight: 1.6, color: 'var(--muted)' } as const
