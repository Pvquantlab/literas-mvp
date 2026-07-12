'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useWizard } from '../wizard-context'
import { saveDraft } from '../actions'
import {
  searchTopics,
  getPopularTopics,
  getTopicsByIds,
  suggestTopic,
  type TopicSuggestion,
} from '../topic-actions'

const MIN_TOPICS = 1
const RECOMMENDED_TOPICS = 3
const MAX_TOPICS = 15

export default function KonularStep() {
  const router = useRouter()
  const { draft, update, isSaving, setSaving } = useWizard()

  const [selectedIds, setSelectedIds] = useState<number[]>(draft.topic_ids ?? [])
  const [selectedTopics, setSelectedTopics] = useState<TopicSuggestion[]>([])
  const [results, setResults] = useState<TopicSuggestion[]>([])
  const [popular, setPopular] = useState<TopicSuggestion[]>([])
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestForm, setShowSuggestForm] = useState(false)
  const [suggestName, setSuggestName] = useState('')
  const [suggestMsg, setSuggestMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // İlk yüklemede: popüler konular + seçili konuların detayı
  useEffect(() => {
    let cancelled = false
    Promise.all([
      getPopularTopics(30),
      selectedIds.length > 0 ? getTopicsByIds(selectedIds) : Promise.resolve([]),
    ]).then(([pop, sel]) => {
      if (cancelled) return
      setPopular(pop)
      setResults(pop)
      setSelectedTopics(sel)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Arama (debounced)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (query.trim().length === 0) {
      setResults(popular)
      return
    }

    setIsLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await searchTopics(query, 60)
        setResults(r)
      } catch (e) {
        console.error(e)
      } finally {
        setIsLoading(false)
      }
    }, 200)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, popular])

  function toggle(topic: TopicSuggestion) {
    const isSelected = selectedIds.includes(topic.id)
    if (isSelected) {
      setSelectedIds((prev) => prev.filter((id) => id !== topic.id))
      setSelectedTopics((prev) => prev.filter((t) => t.id !== topic.id))
    } else {
      if (selectedIds.length >= MAX_TOPICS) return
      setSelectedIds((prev) => [...prev, topic.id])
      setSelectedTopics((prev) => [...prev, topic])
    }
  }

  function removeSelected(id: number) {
    setSelectedIds((prev) => prev.filter((x) => x !== id))
    setSelectedTopics((prev) => prev.filter((t) => t.id !== id))
  }

  async function handleSuggest() {
    if (!suggestName.trim()) return
    const res = await suggestTopic(suggestName)
    setSuggestMsg({ ok: res.ok, text: res.message })
    if (res.ok) {
      setSuggestName('')
      setTimeout(() => {
        setShowSuggestForm(false)
        setSuggestMsg(null)
      }, 2500)
    }
  }

  const canProceed = selectedIds.length >= MIN_TOPICS

  async function handleNext() {
    if (!canProceed || isSaving) return
    setSaving(true)
    try {
      update({ topic_ids: selectedIds })
      await saveDraft({ topic_ids: selectedIds }, 'ad')
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
      <h2 className="serif" style={{ fontSize: '24px', margin: '0 0 8px', color: 'var(--ink)' }}>
        Grubunuz için konular seçin
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
        <span>Belirgin olun! Bu, grubunuzu doğru kişilere tanıtmamıza yardımcı olur. Bir sonraki adıma geçmeden önce en az 3 konu seçmeye çalışın.</span>
      </div>

      <p style={{ fontSize: '13.5px', color: 'var(--muted)', margin: '0 0 20px' }}>
        En az {MIN_TOPICS}, önerilen {RECOMMENDED_TOPICS}, maksimum {MAX_TOPICS} konu seçebilirsin.
      </p>

      {/* Seçtikleriniz */}
      {selectedTopics.length > 0 && (
        <div
          style={{
            marginBottom: '20px',
            padding: '16px',
            borderRadius: '14px',
            background: 'rgba(214, 255, 63, 0.15)',
            border: '1.5px solid rgba(214, 255, 63, 0.5)',
          }}
        >
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '11.5px',
            color: 'var(--muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '10px',
          }}>
            seçtikleriniz ({selectedTopics.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {selectedTopics.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => removeSelected(t.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  borderRadius: '999px',
                  background: 'var(--lime, #D6FF3F)',
                  color: 'var(--ink)',
                  border: 'none',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {t.name}
                <span style={{ fontSize: '16px', lineHeight: 1, opacity: 0.7 }}>×</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Arama kutusu */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <div style={{
          position: 'absolute',
          left: '14px',
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '15px',
          pointerEvents: 'none',
        }}>
          🔍
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Konuları ara — örn. şiir, doğa yürüyüşü, python"
          style={{ width: '100%', paddingLeft: '40px' }}
          autoComplete="off"
        />
      </div>

      {/* Chip listesi */}
      <div style={{ minHeight: '120px' }}>
        {isLoading && (
          <div style={{ color: 'var(--muted)', fontSize: '13.5px', padding: '20px 0' }}>
            Aranıyor…
          </div>
        )}
        {!isLoading && results.length === 0 && query.trim().length > 0 && (
          <div style={{ padding: '16px 0' }}>
            <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '10px' }}>
              "{query}" için sonuç bulunamadı.
            </p>
            <button
              type="button"
              onClick={() => {
                setSuggestName(query)
                setShowSuggestForm(true)
              }}
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '12.5px',
                color: 'var(--ink)',
                background: 'transparent',
                border: 'none',
                textDecoration: 'underline',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              → "{query}" için konu öner
            </button>
          </div>
        )}
        {!isLoading && results.length > 0 && (
          <>
            {query.trim().length === 0 && (
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '11.5px',
                color: 'var(--muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '10px',
              }}>
                popüler konular
              </div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {results.map((t) => {
                const isSelected = selectedIds.includes(t.id)
                const atMax = selectedIds.length >= MAX_TOPICS && !isSelected
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggle(t)}
                    disabled={atMax}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 12px',
                      borderRadius: '999px',
                      background: isSelected ? 'var(--ink)' : 'transparent',
                      color: isSelected ? 'var(--paper-cream, #FFFDF6)' : 'var(--ink)',
                      border: isSelected ? '1.5px solid var(--ink)' : '1.5px solid rgba(30, 58, 43, 0.2)',
                      fontSize: '13.5px',
                      fontWeight: isSelected ? 600 : 500,
                      cursor: atMax ? 'not-allowed' : 'pointer',
                      opacity: atMax ? 0.4 : 1,
                      transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ fontSize: '15px', lineHeight: 1 }}>
                      {isSelected ? '✓' : '⊕'}
                    </span>
                    {t.name}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Bulunamadı kutusu (arama yaparken sonuç varsa da alt kısımda) */}
      {!showSuggestForm && query.trim().length === 0 && (
        <div style={{ marginTop: '16px' }}>
          <button
            type="button"
            onClick={() => setShowSuggestForm(true)}
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '12.5px',
              color: 'var(--muted)',
              background: 'transparent',
              border: 'none',
              textDecoration: 'underline',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Aradığın konuyu bulamadın mı? Bize öner
          </button>
        </div>
      )}

      {/* Konu öner formu */}
      {showSuggestForm && (
        <div
          style={{
            marginTop: '20px',
            padding: '16px',
            borderRadius: '12px',
            background: 'var(--paper-soft, rgba(30, 58, 43, 0.04))',
            border: '1.5px solid rgba(30, 58, 43, 0.1)',
          }}
        >
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '12.5px',
            color: 'var(--muted)',
            marginBottom: '10px',
          }}>
            yeni konu öner (admin onayıyla havuza eklenir)
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={suggestName}
              onChange={(e) => setSuggestName(e.target.value)}
              placeholder="ör. Kaligrafik Yazı"
              maxLength={60}
              style={{ flex: 1, minWidth: '200px' }}
            />
            <button
              type="button"
              onClick={handleSuggest}
              disabled={!suggestName.trim()}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '13.5px' }}
            >
              Gönder
            </button>
            <button
              type="button"
              onClick={() => {
                setShowSuggestForm(false)
                setSuggestMsg(null)
              }}
              style={{
                padding: '8px 12px',
                background: 'transparent',
                border: 'none',
                color: 'var(--muted)',
                fontSize: '13.5px',
                cursor: 'pointer',
              }}
            >
              iptal
            </button>
          </div>
          {suggestMsg && (
            <p style={{
              marginTop: '10px',
              fontSize: '12.5px',
              color: suggestMsg.ok ? 'var(--ink)' : 'var(--coral-deep, #b04330)',
            }}>
              {suggestMsg.text}
            </p>
          )}
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
          href="/community/new/konum"
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '13px',
            color: 'var(--muted)',
            textDecoration: 'none',
          }}
        >
          ← Geri
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '12.5px',
            color: selectedIds.length < RECOMMENDED_TOPICS ? 'var(--muted)' : 'var(--ink)',
          }}>
            {selectedIds.length} / {MAX_TOPICS}
          </span>
          <button
            className="btn-primary"
            onClick={handleNext}
            disabled={!canProceed || isSaving}
          >
            {isSaving ? 'Kaydediliyor…' : 'İleri →'}
          </button>
        </div>
      </div>
    </div>
  )
}
