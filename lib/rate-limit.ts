// lib/rate-limit.ts
// literas — Upstash tabanlı rate limiting
// Gerekli paketler: npm i @upstash/ratelimit @upstash/redis
// Gerekli env (.env.local + Vercel): UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
// Env yoksa (lokal geliştirme) limit sessizce devre dışı kalır — build kırılmaz.

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

type Tier = 'normal' | 'strict'

const hasEnv =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN

const redis = hasEnv ? Redis.fromEnv() : null

const limiters: Record<Tier, Ratelimit | null> = {
  // Genel yazma uçları: dakikada 10 istek
  normal: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, '1 m'),
        prefix: 'rl:normal',
      })
    : null,
  // Hassas uçlar (şikayet, waitlist, etkinlik oluşturma): dakikada 3
  strict: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(3, '1 m'),
        prefix: 'rl:strict',
      })
    : null,
}

function clientKey(req: Request, userId: string | null): string {
  if (userId) return `u:${userId}`
  const fwd = req.headers.get('x-forwarded-for')
  const ip = fwd ? fwd.split(',')[0].trim() : 'unknown'
  return `ip:${ip}`
}

export async function checkRateLimit(
  req: Request,
  userId: string | null,
  tier: Tier = 'normal'
): Promise<{ ok: boolean; headers: Record<string, string> }> {
  const limiter = limiters[tier]
  if (!limiter) return { ok: true, headers: {} } // env yok → devre dışı

  try {
    const { success, limit, remaining, reset } = await limiter.limit(
      clientKey(req, userId)
    )
    return {
      ok: success,
      headers: {
        'X-RateLimit-Limit': String(limit),
        'X-RateLimit-Remaining': String(remaining),
        'X-RateLimit-Reset': String(reset),
      },
    }
  } catch (err) {
    // Redis erişilemezse isteği engelleme — servis kesintisi rate limit'ten önemli
    console.error('[rate-limit] hata, istek serbest bırakıldı:', err)
    return { ok: true, headers: {} }
  }
}