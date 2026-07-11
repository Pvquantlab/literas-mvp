'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useWizard } from '../wizard-context'
import { saveDraft } from '../actions'

const MIN_LEN = 5
const MAX_LEN = 75

export default function AdStep() {
  const router = useRouter()
  const { draft, update, isSaving, setSaving } = useWizard()
  const [name, setName] = useState(draft.name ?? '')

  const trimmed = name.trim()
  const canProceed = trimmed.length >= MIN_LEN && trimmed.length <= MAX_LEN

  async function handleNext() {
    if (!canProceed || isSaving) return
    setSaving(true)
    try {
      update({ name: trimmed })
      await saveDraft({ name: trimmed }, 'aciklama')
      router.push('/community/new/aciklama')
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
        Grubunuza isim verin
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--muted)', margin: '0 0 20px' }}>
        Grubun ne hakkında olduğunu insanlara net bir şekilde anlatacak bir isim seçin.
      </p>

      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value.slice(0, MAX_LEN))}
        placeholder="ör. Kadıköy Kitap Kulübü"
        style={{ width: '100%' }}
      />
      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: 'var(--muted)', marginTop: '6px', textAlign: 'right' }}>
        {trimmed.length} / {MAX_LEN}
      </p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px' }}>
        <Link href="/community/new/konular" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px', color: 'var(--muted)', textDecoration: 'none' }}>
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
