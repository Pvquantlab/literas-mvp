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
    .optional()
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

// PATCH için: her alan opsiyonel ama en az bir alan zorunlu
export const eventUpdateSchema = eventSchema
  .omit({ community_id: true })
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: 'Güncellenecek en az bir alan gönder',
  })
  // PATCH (tam güncelleme): community_id hariç tüm alanlar zorunlu.
// Düzenleme formu bütün alanları gönderdiği için tam doğrulama uygulanır.
export const eventEditSchema = eventSchema.omit({ community_id: true })

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
    error: 'Gecersiz durum',
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

// ---- Ortak yardımcı: hata cevabı ------------------------------------------

import { NextResponse } from 'next/server'

export function validationError(error: z.ZodError) {
  return NextResponse.json(
    { error: 'Geçersiz veri', details: error.flatten().fieldErrors },
    { status: 400 }
  )
}