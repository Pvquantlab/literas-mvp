'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWizard } from '../wizard-context'
import { saveDraft } from '../actions'

export default function KonumStep() {
  const router = useRouter()
  const { draft, update, isSaving, setSaving } = useWizard()
  const [locationName, setLocationName] = useState(draft.location_name ?? '')
  const [locationType, setLocationType] = useState<'physical' | 'online'>(
    draft.location_type ?? 'physical'
  )

  const canProceed =
    locationType === 'online' || (locationType === 'physical' && locationName.trim().length > 0)

  async function handleNext() {
    if (!canProceed || isSaving) return
    setSaving(true)
    try {
      const finalName = locationType === 'online' ? 'Online / Türkiye geneli' : locationName.trim()
      update({ location_type: locationType, location_name: finalName })
      await saveDraft(
        { location_type: locationType, location_name: finalName },
        'konular'
      )
      router.push('/community/new/konular')
    } catch (e) {
      console.error(e)
      alert('Kaydedilemedi. Tekrar dener misin?')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="auth-card" style={{ padding: '32px' }}>
      <h2 className="serif" style={{ fontSize: '24px', margin: '0 0 6px', color: 'var(--ink)' }}>
        Öncelikle grubunuz için konumunuzu belirleyin
      </h2>
      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12.5px', color: 'var(--muted)', margin: '0 0 24px' }}>
        [Aşama C1'de dolacak: otomatik tamamlama, tarayıcı konumu, 81 il]
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <input
            type="radio"
            name="loctype"
            checked={locationType === 'physical'}
            onChange={() => setLocationType('physical')}
          />
          <span>Fiziksel konum</span>
        </label>
        {locationType === 'physical' && (
          <input
            type="text"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            placeholder="ör. Kadıköy, İstanbul"
            style={{ marginLeft: '26px' }}
          />
        )}

        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <input
            type="radio"
            name="loctype"
            checked={locationType === 'online'}
            onChange={() => setLocationType('online')}
          />
          <span>Çevrimiçi grup</span>
        </label>
      </div>

      <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
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
