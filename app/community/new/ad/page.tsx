'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useWizard } from '../wizard-context'
import { saveDraft } from '../actions'
import { getTopicsByIds } from '../topic-actions'

const MIN_LEN = 5
const MAX_LEN = 75

export default function AdStep() {
  const router = useRouter()
  const { draft, update, isSaving, setSaving } = useWizard()
  const [name, setName] = useState(draft.name ?? '')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [suggestionsLoaded, setSuggestionsLoaded] = useState(false)

  // Otomatik isim önerileri: konum + ilk 1-2 konu adı
  useEffect(() => {
    let cancelled = false
    async function build() {
      const locName = draft.location_name
      const topicIds = draft.topic_ids ?? []
      if (topicIds.length === 0 || !locName) {
        setSuggestionsLoaded(true)
        return
      }
      const topics = await getTopicsByIds(topicIds.slice(0, 3))
      if (cancelled) return

      const shortLoc = locName === 'Online / Türkiye geneli'
        ? 'Türkiye'
        : locName.split(',')[0].trim() // "Kadıköy, İstanbul" → "Kadıköy"

      const uniq: string[] = []
      // Öneri 1: {konum} {konu1} Kulübü
      if (topics[0]) uniq.push(`${shortLoc} ${topics[0].name} Kulübü`)
      // Öneri 2: {konum} {konu1} Grubu
      if (topics[0]) uniq.push(`${shortLoc} ${topics[0].name} Grubu`)
      // Öneri 3: {konum} {konu1} & {konu2}
      if (topics[0] && topics[1]) {
        uniq.push(`${shortLoc} ${topics[0].name} & ${topics[1].name}`)
      }

      setSuggestions(uniq.filter((s) => s.length <= MAX_LEN))
      setSuggestionsLoaded(true)
    }
    build()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      <h2 className="serif" style={{ fontSize: '24px', margin: '0 0 8px', color: 'var(--ink)' }}>
        Grubunuza isim verin
      </h2>

      <div className="wizard-hint-inline" style={{
        display: 'flex',
        gap: '10px',
        alignItems: 'flex-start',
        padding: '12px 14px',
        borderRadius: '10px',
        background: 'rgba(214, 255, 63, 0.15)',
        border: '1.5px solid rgba(214, 255, 63, 0.4)',
        marginBottom: '20px',
        fontSize: '13px',
        lineHeight: 1.5,
        color: 'var(--ink)',
      }}>
        <span style={{ fontSize: '15px', lineHeight: 1 }}>💡</span>
        <span>Bunu sonradan düzenleyebilirsiniz, ancak şimdi uygun bir isim seçmeniz önemlidir, çünkü grubunuz oluşturulduğunda incelenecektir.</span>
      </div>

      <p style={{ fontSize: '14px', color: 'var(--muted)', margin: '0 0 24px', lineHeight: 1.5 }}>
        Grubun ne hakkında olduğunu insanlara net bir şekilde anlatacak bir isim seçin.
      </p>

      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value.slice(0, MAX_LEN))}
        placeholder="ör. Kadıköy Kitap Kulübü"
        style={{ width: '100%', fontSize: '16px' }}
        autoFocus
      />
      <p style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '11.5px',
        color: trimmed.length >= MIN_LEN && trimmed.length <= MAX_LEN
          ? 'var(--muted)'
          : trimmed.length > 0 && trimmed.length < MIN_LEN
            ? 'var(--coral-deep, #b04330)'
            : 'var(--muted)',
        marginTop: '6px',
        textAlign: 'right',
      }}>
        {trimmed.length} / {MAX_LEN}
        {trimmed.length > 0 && trimmed.length < MIN_LEN && ` (en az ${MIN_LEN})`}
      </p>

      {/* Otomatik öneriler */}
      {suggestionsLoaded && suggestions.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '11.5px',
            color: 'var(--muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '10px',
          }}>
            öneriler
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setName(s)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '999px',
                  background: 'transparent',
                  border: '1.5px solid rgba(30, 58, 43, 0.2)',
                  color: 'var(--ink)',
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(30,58,43,0.05)'
                  e.currentTarget.style.borderColor = 'rgba(30,58,43,0.4)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.borderColor = 'rgba(30,58,43,0.2)'
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Alt navigasyon */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '32px',
        paddingTop: '20px',
        borderTop: '1px solid rgba(30, 58, 43, 0.1)',
      }}>
        <Link
          href="/community/new/konular"
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '13px',
            color: 'var(--muted)',
            textDecoration: 'none',
          }}
        >
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
