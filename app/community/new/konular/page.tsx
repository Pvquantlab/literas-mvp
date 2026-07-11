'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useWizard } from '../wizard-context'
import { saveDraft } from '../actions'

export default function KonularStep() {
  const router = useRouter()
  const { draft, update, isSaving, setSaving } = useWizard()
  const [topicIds] = useState<number[]>(draft.topic_ids ?? [])

  const canProceed = topicIds.length >= 1

  async function handleNext() {
    if (!canProceed || isSaving) return
    setSaving(true)
    try {
      update({ topic_ids: topicIds })
      await saveDraft({ topic_ids: topicIds }, 'ad')
      router.push('/community/new/ad')
    } catch (e) {
      console.error(e)
      alert('Kaydedilemedi.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="auth-card" style={{ padding: '32px' }}>
      <h2 className="serif" style={{ fontSize: '24px', margin: '0 0 6px', color: 'var(--ink)' }}>
        Grubunuz için konular seçin
      </h2>
      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12.5px', color: 'var(--muted)', margin: '0 0 24px' }}>
        [Aşama C2'de dolacak: arama, chip listesi, "Seçtikleriniz" bölümü, konu öner linki]
      </p>

      <p style={{ fontSize: '14px', color: 'var(--muted)', margin: '0 0 16px' }}>
        Seçilen konu sayısı: <strong>{topicIds.length}</strong>
      </p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px' }}>
        <Link href="/community/new/konum" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px', color: 'var(--muted)', textDecoration: 'none' }}>
          ← Geri
        </Link>
        <button
          className="btn-primary"
          onClick={handleNext}
          disabled={!canProceed || isSaving}
        >
          {isSaving ? 'Kaydediliyor…' : 'İleri →'}
        </button>
      </div>
    </div>
  )
}
