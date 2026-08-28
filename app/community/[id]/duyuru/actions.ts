'use server'

import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { checkUserRateLimit } from '@/lib/rate-limit'
import { duyuruSchema } from '@/lib/validations'
import { sendChunkedEmail, escapeHtml } from '@/lib/email'
import { SITE_URL } from '@/lib/site'

const PARCA_BOYU = 5
const PARCALAR_ARASI_MS = 1000
const ANLIK_ALICI_TAVANI = 100
const GUNLUK_DUYURU_SINIRI = 3

/**
 * Sonuç kodları. Serbest METİN DEĞİL: `?sonuc=` adres çubuğundan geliyor,
 * yani bağlantıyı kuran kişi doldurabilir. Metin gönderseydik biri
 * organizatöre kendi yazdığı bir "sistem mesajını" gösterebilirdi.
 * (QR turunda kapatılan içerik sahteciliği vektörünün aynısı.)
 */
export type DuyuruSonuc =
  | 'yayinlandi' | 'alicisiz' | 'cok_uye' | 'guncellendi' | 'silindi'
  | 'posta_hatasi' | 'limit' | 'gecersiz' | 'yetkisiz' | 'gunluk' | 'kaydedilemedi'

/**
 * Action sonucunu kullanıcıya taşır: `<form action={fn}>` deseninde dönüş
 * değeri kullanıcıya ULAŞMAZ. redirect() istisna fırlatır — try/catch'e alma.
 */
function sonuc(communityId: string, kod: DuyuruSonuc): never {
  redirect(`/community/${encodeURIComponent(communityId)}/duyuru?sonuc=${kod}`)
}

export async function duyuruYayinla(formData: FormData): Promise<never> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const rawId = String(formData.get('community_id') ?? '')

  if (!(await checkUserRateLimit(user.id, 'normal'))) {
    sonuc(rawId, 'limit')
  }

  const parsed = duyuruSchema.safeParse({
    community_id: rawId,
    title: formData.get('title'),
    body: formData.get('body'),
  })
  if (!parsed.success) sonuc(rawId, 'gecersiz')

  const { community_id, title, body } = parsed.data

  const { data: yetkili } = await supabase.rpc('topluluk_yoneticisi_mi', {
    p_community_id: community_id,
  })
  if (!yetkili) sonuc(community_id, 'yetkisiz')

  // Günlük sınır. Sayım satırlara bakıyor: yönetici duyurularını silerek
  // sınırı aşabilir. Bilinçli kabul — amaç kötü niyetliyi durdurmak değil,
  // dalgınlıkla üyelerin gelen kutusunu doldurmayı engellemek.
  const birGunOnce = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count: bugunkuler } = await supabase
    .from('community_announcements')
    .select('id', { count: 'exact', head: true })
    .eq('community_id', community_id)
    .gte('created_at', birGunOnce)
  if ((bugunkuler ?? 0) >= GUNLUK_DUYURU_SINIRI) sonuc(community_id, 'gunluk')

  const { data: duyuru, error: yazmaHatasi } = await supabase
    .from('community_announcements')
    .insert({ community_id, author_id: user.id, title, body })
    .select('id')
    .single()

  if (yazmaHatasi || !duyuru) {
    console.error('[duyuru] kaydedilemedi:', yazmaHatasi)
    sonuc(community_id, 'kaydedilemedi')
  }

  // Alıcılar: RPC hem founder/admin doğrulaması yapıyor hem de
  // email_izni(user,'announcement') ile süzüyor. Yazarın kendisi hariç.
  const { data: emailRows, error: aliciHatasi } = await supabase.rpc('get_member_emails', {
    p_community_id: community_id,
    p_exclude: user.id,
  })
  if (aliciHatasi) {
    console.error('[duyuru] alici listesi alinamadi:', aliciHatasi)
    revalidatePath(`/community/${community_id}`)
    sonuc(community_id, 'posta_hatasi')
  }

  const alicilar = (emailRows ?? []) as string[]
  revalidatePath(`/community/${community_id}`)
  revalidatePath(`/community/${community_id}/duyuru`)

  if (alicilar.length === 0) sonuc(community_id, 'alicisiz')

  const { data: topluluk } = await supabase
    .from('communities').select('name').eq('id', community_id).single()
  const { data: yazar } = await supabase
    .from('profiles').select('name').eq('id', user.id).single()

  const html = duyuruHtml({
    baslik: title,
    metin: body,
    topluluk: topluluk?.name ?? 'Topluluk',
    yazar: yazar?.name ?? 'Bir yönetici',
    communityId: community_id,
  })
  const konu = `${topluluk?.name ?? 'Topluluk'} — duyuru`

  // Tavanın üstünde istek içinde gönderemeyiz (60 sn fonksiyon tavanı).
  //
  // Spec'te bir kuyruk yedeği öngörülmüştü, KESİLDİ: cron'daki buildMail
  // yalnızca 'reminder', 'promotion' ve 'join_request' şablonlarını tanıyor,
  // başkasında null dönüyor. Yani kuyruğa yazılan 'announcement' satırları
  // hiçbir zaman gönderilmez, üstelik sessizce. Çalışır hâle getirmek cron'u
  // -- platformun en hassas zamanlanmış işini -- değiştirmeyi gerektiriyordu.
  // Bugün hiçbir topluluk bu tavanın yakınında değil (en kalabalığı bir avuç
  // kişi), yani bozuk bir yedek yerine tanımlı bir ret daha dürüst.
  //
  // Bir topluluk tavana yaklaşırsa yapılacak iş: buildMail'e 'announcement'
  // dalı ekle (payload'da title/body/community_name taşı), sonra burayı
  // kuyruğa yazacak şekilde geri aç.
  if (alicilar.length > ANLIK_ALICI_TAVANI) {
    console.error(
      `[duyuru] alici sayisi tavani asti (${alicilar.length} > ${ANLIK_ALICI_TAVANI}), posta gonderilmedi:`,
      community_id
    )
    sonuc(community_id, 'cok_uye')
  }

  const { gonderildi } = await sendChunkedEmail(
    { to: alicilar, subject: konu, html },
    'duyuru/topluluk-duyurusu',
    { parcaBoyu: PARCA_BOYU, bekleMs: PARCALAR_ARASI_MS }
  )

  await supabase
    .from('community_announcements')
    .update({ sent_count: gonderildi })
    .eq('id', duyuru.id)

  revalidatePath(`/community/${community_id}/duyuru`)
  if (gonderildi === 0) sonuc(community_id, 'posta_hatasi')
  sonuc(community_id, 'yayinlandi')
}

export async function duyuruGuncelle(formData: FormData): Promise<never> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const rawId = String(formData.get('community_id') ?? '')
  const duyuruId = String(formData.get('duyuru_id') ?? '')

  if (!(await checkUserRateLimit(user.id, 'normal'))) sonuc(rawId, 'limit')

  const parsed = duyuruSchema.safeParse({
    community_id: rawId,
    title: formData.get('title'),
    body: formData.get('body'),
  })
  if (!parsed.success) sonuc(rawId, 'gecersiz')

  const { community_id, title, body } = parsed.data

  const { data: yetkili } = await supabase.rpc('topluluk_yoneticisi_mi', {
    p_community_id: community_id,
  })
  if (!yetkili) sonuc(community_id, 'yetkisiz')

  // Düzenleme yeniden POSTA GÖNDERMEZ: giden posta gitmiştir (spec K4).
  const { error } = await supabase
    .from('community_announcements')
    .update({ title, body, updated_at: new Date().toISOString() })
    .eq('id', duyuruId)

  if (error) {
    console.error('[duyuru] guncellenemedi:', error)
    sonuc(community_id, 'kaydedilemedi')
  }

  revalidatePath(`/community/${community_id}`)
  revalidatePath(`/community/${community_id}/duyuru`)
  sonuc(community_id, 'guncellendi')
}

export async function duyuruSil(formData: FormData): Promise<never> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const communityId = String(formData.get('community_id') ?? '')
  const duyuruId = String(formData.get('duyuru_id') ?? '')

  if (!(await checkUserRateLimit(user.id, 'normal'))) sonuc(communityId, 'limit')

  const { data: yetkili } = await supabase.rpc('topluluk_yoneticisi_mi', {
    p_community_id: communityId,
  })
  if (!yetkili) sonuc(communityId, 'yetkisiz')

  const { error } = await supabase
    .from('community_announcements')
    .delete()
    .eq('id', duyuruId)

  if (error) {
    console.error('[duyuru] silinemedi:', error)
    sonuc(communityId, 'kaydedilemedi')
  }

  revalidatePath(`/community/${communityId}`)
  revalidatePath(`/community/${communityId}/duyuru`)
  sonuc(communityId, 'silindi')
}

/** app/api/event/route.ts'teki serif şablonun aynısı. Her değişken kaçırılır. */
function duyuruHtml({
  baslik, metin, topluluk, yazar, communityId,
}: {
  baslik: string; metin: string; topluluk: string; yazar: string; communityId: string
}): string {
  const b = escapeHtml(baslik)
  const t = escapeHtml(topluluk)
  const y = escapeHtml(yazar)
  // Satır sonları korunsun: kaçırdıktan SONRA <br> koyuyoruz.
  const m = escapeHtml(metin).replace(/\n/g, '<br />')
  const adres = `${SITE_URL}/community/${communityId}`

  return `
    <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
      <p style="font-style: italic; color: #B8541A;">${t}</p>
      <h1 style="color: #1F4A3D; font-weight: 500; font-size: 1.5rem;">${b}</h1>
      <p style="color: #1F2A24; line-height: 1.6;">${m}</p>
      <p style="font-style: italic; color: #1F2A24; opacity: 0.6; margin-top: 2rem;">
        <em>${y}</em> yazdı
      </p>
      <p style="margin-top: 1.5rem;">
        <a href="${adres}" style="color: #1F4A3D;">Topluluğun sayfasına git</a>
      </p>
      <p style="font-style: italic; color: #1F2A24; opacity: 0.6;">literas</p>
    </div>
  `
}
