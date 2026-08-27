// lib/validations.ts
// literas — API ve server action girdi doğrulama şemaları
// Kullanım: const parsed = eventSchema.safeParse(await req.json())
// Not: `npm i zod` gerekli (zod v4).

import { z } from 'zod'

// ---- Yardımcılar ----------------------------------------------------------

const uuid = z.string().uuid({ message: 'Geçersiz kimlik' })

const trimmed = (min: number, max: number, alan: string) =>
  z
    .string({ error: `${alan} gerekli` })
    .trim()
    .min(min, `${alan} en az ${min} karakter olmalı`)
    .max(max, `${alan} en fazla ${max} karakter olabilir`)

// Boş string'i undefined'a çevirir (opsiyonel alanlar için)
const optionalUrl = z
  .union([z.string().trim().url('Geçersiz bağlantı'), z.literal('')])
  .optional()
  .transform((v) => (v ? v : undefined))

// ---- Etkinlik -------------------------------------------------------------

export const eventSchema = z.object({
  community_id: uuid,
  title: trimmed(3, 120, 'Başlık'),
  description: z
    .string()
    .trim()
    .max(5000, 'Açıklama en fazla 5000 karakter olabilir')
    .nullish() // hem undefined hem null kabul — formlar boş açıklamayı null gönderir
    .transform((v) => (v ? v : undefined)),
  location: trimmed(3, 200, 'Konum'),
  event_date: z.coerce
    .date({ error: 'Geçersiz tarih' })
    .refine((d) => d.getTime() > Date.now() - 60_000, {
      message: 'Etkinlik tarihi geçmişte olamaz',
    }),
  max_attendees: z.coerce
    .number()
    .int('Kontenjan tam sayı olmalı')
    .positive('Kontenjan pozitif olmalı')
    .max(10_000, 'Kontenjan çok yüksek')
    .optional()
    .nullable(),
  cover_image_url: optionalUrl,
})

// PATCH (tam güncelleme): community_id hariç tüm alanlar zorunlu.
// Düzenleme formu bütün alanları gönderdiği için tam doğrulama uygulanır.
//
// İki bilinçli fark var:
// 1. event_date'te "gelecekte olmalı" kısıtı YOK. Geçmiş bir etkinliğin
//    başlığındaki yazım hatası da düzeltilebilmeli.
// 2. cover_image_url üç durumu ayırır: alan yoksa (undefined) kapak
//    DOKUNULMAZ, boş string/null ise kaldırılır, URL ise değiştirilir.
//    Eskiden alan gönderilmediğinde kapak sessizce siliniyordu.
export const eventEditSchema = eventSchema.omit({ community_id: true }).extend({
  event_date: z.coerce.date({ error: 'Geçersiz tarih' }),
  cover_image_url: z
    .union([z.string().trim().url('Geçersiz bağlantı'), z.literal(''), z.null()])
    .optional(),
})

// ---- RSVP / Bekleme listesi ----------------------------------------------

export const waitlistSchema = z.object({
  event_id: uuid,
})

export const rsvpSchema = z.object({
  event_id: uuid,
})

// ---- Şikayet --------------------------------------------------------------

export const reportSchema = z.object({
  target_type: z.enum(['event', 'community', 'user'], {
    error: 'Geçersiz şikayet türü',
  }),
  target_id: uuid,
  reason: z.enum(
    ['spam', 'rahatsiz_edici', 'yanlis_bilgi', 'sahte_hesap', 'nefret_soylemi', 'diger'],
    { error: 'Geçersiz şikayet nedeni' }
  ),
  description: z
    .string()
    .trim()
    .max(500, 'Açıklama en fazla 500 karakter olabilir')
    .optional()
    .transform((v) => (v ? v : undefined)),
})

// ---- Sikayet (admin islemi) -----------------------------------------------

export const reportUpdateSchema = z.object({
  status: z.enum(['reviewed', 'dismissed', 'actioned'], {
    error: 'Geçersiz durum',
  }),
  admin_note: z
    .string()
    .trim()
    .max(500, 'Admin notu en fazla 500 karakter olabilir')
    .optional()
    .transform((v) => (v ? v : undefined)),
})

// ---- Topluluk (server action'lar için) ------------------------------------

export const communitySchema = z.object({
  name: trimmed(3, 80, 'Topluluk adı'),
  description: trimmed(20, 3000, 'Açıklama'),
  city: trimmed(2, 60, 'Şehir'),
  topics: z
    .array(z.string().trim().min(1))
    .min(1, 'En az bir konu seç')
    .max(10, 'En fazla 10 konu seçebilirsin'),
})

// ---- Topluluk üyelik işlemleri --------------------------------------------

// Rota parametreleri de doğrulanıyor: geçersiz uuid Postgres'ten ham 22P02
// hatası döndürüyordu.
export const memberActionSchema = z.object({
  action: z.enum(['toggle-admin', 'approve', 'reject'], {
    error: 'Geçersiz işlem',
  }),
  community_id: uuid,
  member_id: uuid,
})

// ---- Ayarlar (server action'lar) ------------------------------------------

// Yalnızca http/https kabul eder.
// NEDEN: z.string().url() "javascript:alert(1)" adresini de geçerli sayar.
// Bu değer profilde <a href> içine konduğunda tıklayan herkeste kod çalışır.
const httpUrl = z
  .union([
    z
      .string()
      .trim()
      .url('Geçersiz bağlantı')
      .refine((v) => /^https?:\/\//i.test(v), 'Bağlantı http:// veya https:// ile başlamalı'),
    z.literal(''),
  ])
  .optional()
  .transform((v) => (v ? v : null))

export const sosyalMedyaSchema = z.object({
  instagram_url: httpUrl,
  x_url: httpUrl,
  youtube_url: httpUrl,
  linkedin_url: httpUrl,
})

export const gizlilikSchema = z.object({
  contact_permission: z.enum(['everyone', 'community_members', 'nobody'], {
    error: 'Geçersiz iletişim izni',
  }),
  profile_visibility: z.enum(['public', 'private'], {
    error: 'Geçersiz profil görünürlüğü',
  }),
})

// email BİLİNÇLİ olarak yok: profiles.email artık profiles_guard trigger'ı ile
// kilitli ve giden tüm postanın kaynağı. Değişimi Supabase auth akışından
// geçmeli (doğrulama maili), formdan değil.
export const hesapSchema = z.object({
  language: z.enum(['tr', 'en'], { error: 'Geçersiz dil' }),
  timezone: z.enum(['Europe/Istanbul', 'Europe/London', 'Europe/Berlin', 'America/New_York'], {
    error: 'Geçersiz saat dilimi',
  }),
})

// Kullanıcı adı: kimliğe bürünmeyi zorlaştırmak için hem biçim hem de
// ayrılmış ad kontrolü. Eskiden hiçbir kontrol yoktu; biri "@admin" ya da
// "@literaslab" alabilirdi. DB'de unique index var ama çakışma hatası
// yutuluyordu — kullanıcı kaydettiğini sanıyordu.
const AYRILMIS_KULLANICI_ADLARI = new Set([
  'admin', 'administrator', 'yonetici', 'literas', 'literaslab', 'destek',
  'support', 'yardim', 'help', 'iletisim', 'contact', 'bilgi', 'info',
  'root', 'system', 'sistem', 'moderator', 'mod', 'resmi', 'official',
])

export const profilSchema = z.object({
  name: trimmed(2, 80, 'Ad'),
  username: z
    .string()
    .trim()
    .transform((v) => v.replace(/^@/, ''))
    .pipe(
      z
        .string()
        .min(3, 'Kullanıcı adı en az 3 karakter olmalı')
        .max(30, 'Kullanıcı adı en fazla 30 karakter olabilir')
        .regex(
          /^[a-zA-Z0-9._]+$/,
          'Kullanıcı adı yalnızca harf, rakam, nokta ve alt çizgi içerebilir'
        )
        .refine(
          (v) => !AYRILMIS_KULLANICI_ADLARI.has(v.toLowerCase()),
          'Bu kullanıcı adı ayrılmış, başka bir tane seç'
        )
    )
    .optional()
    .or(z.literal('').transform(() => undefined)),
  bio: z.string().trim().max(500, 'Hakkında en fazla 500 karakter olabilir').optional(),
  location: z.string().trim().max(120, 'Konum en fazla 120 karakter olabilir').optional(),
  avatar_url: httpUrl,
})

export const kisiselSchema = z.object({
  birth_date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Geçersiz doğum tarihi')
    .refine((v) => {
      const d = new Date(v + 'T00:00:00Z')
      if (Number.isNaN(d.getTime())) return false
      const yas = (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000)
      return yas >= 13 && yas <= 120
    }, 'Doğum tarihi gerçekçi olmalı (en az 13 yaşında)')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  gender: z.enum(['unspecified', 'woman', 'man', 'non_binary'], {
    error: 'Geçersiz seçim',
  }),
  looking_for: z.array(z.enum(['hobbies', 'socialize', 'friends', 'networking'])).max(4),
  life_stages: z
    .array(z.enum(['graduate', 'student', 'new_in_town', 'new_parent', 'retired', 'career_change']))
    .max(6),
})

export const ilgiAlanlariSchema = z.object({
  interests: z.array(z.string().trim().min(1).max(60)).max(30, 'En fazla 30 ilgi alanı seçebilirsin'),
  match_distance_km: z.coerce
    .number()
    .int()
    .min(1, 'Mesafe en az 1 km olmalı')
    .max(2000, 'Mesafe çok büyük'),
})

// ---- Ortak yardımcı: hata cevabı ------------------------------------------

import { NextResponse } from 'next/server'

export function validationError(error: z.ZodError) {
  return NextResponse.json(
    { error: 'Geçersiz veri', details: error.flatten().fieldErrors },
    { status: 400 }
  )
}