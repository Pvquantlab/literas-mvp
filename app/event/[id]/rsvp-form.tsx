'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type Props = {
  eventId: string
  userId: string
  userHasRsvp: boolean
  userInWaitlist: boolean
  isFull: boolean
}

const primaryBtn =
  'block w-full rounded-full bg-brand py-3 text-center text-[15px] font-bold text-white transition hover:bg-brand-dark disabled:opacity-60 disabled:cursor-not-allowed'
const secondaryBtn =
  'inline-flex rounded-full border-[1.5px] border-line px-[18px] py-2 text-[13.5px] font-bold text-ink transition hover:bg-warm disabled:opacity-60 disabled:cursor-not-allowed'

export default function RsvpForm(props: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleRsvp() {
    setLoading(true)
    setError('')

    const { error } = await supabase
      .from('rsvps')
      .insert({ event_id: props.eventId, user_id: props.userId })

    if (error) {
      if (error.message && error.message.indexOf('EVENT_FULL') !== -1) {
        setError('Bu etkinlik az önce doldu. Bekleme listesine girebilirsin.')
        router.refresh()
      } else {
        setError('Katılım kaydedilemedi. Lütfen tekrar dene.')
      }
      setLoading(false)
      return
    }
    router.refresh()
  }

  async function handleCancel() {
    setLoading(true)
    setError('')

    const { error } = await supabase
      .from('rsvps')
      .delete()
      .eq('event_id', props.eventId)
      .eq('user_id', props.userId)

    if (error) {
      setError('İptal başarısız. Lütfen tekrar dene.')
      setLoading(false)
      return
    }
    router.refresh()
  }

  async function handleJoinWaitlist() {
    setLoading(true)
    setError('')

    const res = await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: props.eventId }),
    })

    if (!res.ok) {
      const data = await res.json().catch(function () {
        return {}
      })
      setError(data.error || 'Bekleme listesine eklenemedi')
      setLoading(false)
      return
    }
    router.refresh()
  }

  async function handleLeaveWaitlist() {
    setLoading(true)
    setError('')

    const res = await fetch('/api/waitlist?event_id=' + props.eventId, {
      method: 'DELETE',
    })

    if (!res.ok) {
      const data = await res.json().catch(function () {
        return {}
      })
      setError(data.error || 'Bekleme listesinden çıkılamadı')
      setLoading(false)
      return
    }
    router.refresh()
  }

  // Durum 1: RSVP vermiş
  if (props.userHasRsvp) {
    return (
      <div className="rounded-xl border border-[#D2E3D8] bg-[#EDF5EF] p-4">
        <p className="mb-3.5 flex items-center gap-2 text-[15px] font-bold text-ink">
          <span className="grid h-[22px] w-[22px] place-items-center rounded-full bg-forest text-[13px] text-white">
            {'\u2713'}
          </span>
          Katılıyorsun. Görüşmek üzere.
        </p>
        <button onClick={handleCancel} disabled={loading} className={secondaryBtn}>
          {loading ? 'İptal ediliyor...' : 'Katılımı iptal et'}
        </button>
        {error ? <div className={errorClass}>{error}</div> : null}
      </div>
    )
  }

  // Durum 2: Waitlist'te
  if (props.userInWaitlist) {
    return (
      <div className="rounded-xl border border-[#EFE3C0] bg-[#FBF3DF] p-4">
        <p className="mb-2 text-[15px] font-bold text-ink">
          Bekleme listesindesin.
        </p>
        <p className="mb-3.5 text-[13.5px] leading-[1.5] text-body">
          Bir kişi katılımı iptal ederse yerine otomatik geçirilirsin.
        </p>
        <button onClick={handleLeaveWaitlist} disabled={loading} className={secondaryBtn}>
          {loading ? 'Çıkılıyor...' : 'Bekleme listesinden çık'}
        </button>
        {error ? <div className={errorClass}>{error}</div> : null}
      </div>
    )
  }

  // Durum 3: Etkinlik dolu, waitlist'e girme seçeneği
  if (props.isFull) {
    return (
      <div>
        <div className="mb-3 rounded-xl border border-line bg-warm px-4 py-3 text-[13.5px] text-body">
          Etkinlik dolu. Bekleme listesine girebilirsin.
        </div>
        <button onClick={handleJoinWaitlist} disabled={loading} className={primaryBtn}>
          {loading ? 'Ekleniyor...' : 'Bekleme listesine gir'}
        </button>
        {error ? <div className={errorClass}>{error}</div> : null}
      </div>
    )
  }

  // Durum 4: Normal RSVP
  return (
    <div>
      <button onClick={handleRsvp} disabled={loading} className={primaryBtn}>
        {loading ? 'Kaydediliyor...' : 'Katılıyorum'}
      </button>
      {error ? <div className={errorClass}>{error}</div> : null}
    </div>
  )
}

const errorClass =
  'mt-3 rounded-xl border border-[#F5C6C0] bg-[#FDECEA] px-3.5 py-2.5 text-[13.5px] font-semibold text-[#B3261E]'
