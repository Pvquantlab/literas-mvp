/**
 * Görsel yükleme kuralları — tek kaynak.
 *
 * NEDEN: kurallar iki bileşende ayrı ayrı yazılmıştı ve ayrışmıştı.
 * components/image-upload.tsx doğru yapıyordu; ayarlar/profil/avatar-editor.tsx
 * yalnızca boyuta bakıyor, uzantıyı kullanıcının dosya adından alıyor ve
 * contentType vermiyordu.
 *
 * GÜVENLİK NOTU: buradaki kontroller KULLANICI DENEYİMİ içindir, güvenlik
 * sınırı değildir. Gerçek sınır Supabase Storage'da:
 *   - kovalarda allowed_mime_types tanımlı → text/html 415 ile reddediliyor
 *   - INSERT politikası yalnızca authenticated → anonim yükleme RLS'e takılıyor
 * İkisi de canlıda curl ile doğrulandı. Buradaki kontroller kullanıcıya ham
 * İngilizce Supabase hatası yerine anlaşılır Türkçe mesaj göstermek için var.
 */

export const IZINLI_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const

/** Uzantıyı MIME'dan türetiyoruz; kullanıcının dosya adı güvenilir değil. */
const MIME_UZANTI: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

/**
 * Kova başına boyut limitleri — Supabase kova ayarlarıyla AYNI olmalı.
 * Eşleşmezse kullanıcı istemci kontrolünü geçip sunucudan ham hata alır;
 * avatar yüklemede tam olarak bu oluyordu (istemci 5 MB, kova 2 MB).
 */
export const KOVA_LIMIT_MB: Record<string, number> = {
  avatars: 2,
  'community-covers': 5,
  'event-covers': 5,
}

const VARSAYILAN_LIMIT_MB = 5

export function kovaLimitMb(bucket: string): number {
  return KOVA_LIMIT_MB[bucket] ?? VARSAYILAN_LIMIT_MB
}

export type DogrulamaSonucu = { ok: true } | { ok: false; mesaj: string }

export function dosyayiDogrula(file: File, bucket: string): DogrulamaSonucu {
  if (!IZINLI_MIME.includes(file.type as (typeof IZINLI_MIME)[number])) {
    return { ok: false, mesaj: 'Sadece JPG, PNG veya WebP görseller yüklenebilir.' }
  }
  const limit = kovaLimitMb(bucket)
  if (file.size > limit * 1024 * 1024) {
    return { ok: false, mesaj: `Görsel en fazla ${limit} MB olabilir.` }
  }
  return { ok: true }
}

/** Çakışmayan, uzantısı MIME ile tutarlı dosya adı. */
export function guvenliDosyaAdi(mimeType: string): string {
  const ext = MIME_UZANTI[mimeType] ?? 'jpg'
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
}
