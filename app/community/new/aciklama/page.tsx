'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useWizard } from '../wizard-context'
import { saveDraft } from '../actions'

const MIN_LEN = 50
const MAX_LEN = 2000

export default function AciklamaStep() {
  const router = useRouter()
  const { draft, update, isSaving, setSaving } = useWizard()
  const [description, setDescription] = useState(draft.description ?? '')

  const trimmed = description.trim()
  const canProceed = trimmed.length >= MIN_LEN && trimmed.length <= MAX_LEN

  async function handleNext() {
    if (!canProceed || isSaving) return
    setSaving(true)
    try {
      update({ description: trimmed })
      await saveDraft({ description: trimmed }, 'gonder')
      router.push('/community/new/gonder')
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
        Grubunuzu tanımlayın
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--muted)', margin: '0 0 20px' }}>
        Grubunuzu tanıtırken insanlar bunu görecek, ancak daha sonra da güncelleyebilirsiniz. İnsan bağlantısını önemsiyoruz, bu yüzden grubunuzun{' '}
        <Link href="/topluluk-kurallari" style={{ color: 'var(--ink)', textDecoration: 'underline' }}>topluluk kuralları</Link>{' '}
        ile uyumlu olduğundan emin olmak için biri tarafından incelenecek.
      </p>

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value.slice(0, MAX_LEN))}
        rows={8}
        placeholder="Kendi tanımınızı yazın."
        style={{ width: '100%' }}
      />
      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: 'var(--muted)', marginTop: '6px', textAlign: 'right' }}>
        {trimmed.length} / {MAX_LEN} {trimmed.length < MIN_LEN && `(en az ${MIN_LEN})`}
      </p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px' }}>
        <Link href="/community/new/ad" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px', color: 'var(--muted)', textDecoration: 'none' }}>
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
