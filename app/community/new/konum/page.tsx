'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useWizard } from '../wizard-context'
import { saveDraft } from '../actions'
import { searchLocations, findNearestLocation, type LocationSuggestion } from '../location-actions'

export default function KonumStep() {
  const router = useRouter()
  const { draft, update, isSaving, setSaving } = useWizard()

  // 'physical' seçili + display_name tut; 'online' ayrı buton
  const [mode, setMode] = useState<'physical' | 'online'>(
    draft.location_type ?? 'physical'
  )
  const [selectedName, setSelectedName] = useState<string>(
    draft.location_type === 'physical' ? (draft.location_name ?? '') : ''
  )
  const [query, setQuery] = useState<string>('')
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Debounced arama
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length < 2) {
      setSuggestions([])
      return
    }
    setIsSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchLocations(query)
        setSuggestions(results)
        setShowDropdown(true)
      } catch (e) {
        console.error(e)
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  const handleGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError('Tarayıcın konum servisini desteklemiyor.')
      return
    }
    setGeoLoading(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const nearest = await findNearestLocation(pos.coords.latitude, pos.coords.longitude)
          if (nearest) {
            setSelectedName(nearest.display_name)
            setMode('physical')
            setQuery('')
            setShowDropdown(false)
          } else {
            setGeoError('Yakın bir konum bulunamadı.')
          }
        } catch (e) {
          console.error(e)
          setGeoError('Konum işlenirken bir sorun oldu.')
        } finally {
          setGeoLoading(false)
        }
      },
      (err) => {
        setGeoLoading(false)
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError('Konum izni verilmedi. Elle arama yapabilirsin.')
        } else {
          setGeoError('Konum alınamadı.')
        }
      },
      { timeout: 8000, maximumAge: 60000 }
    )
  }, [])

  function handleSelect(loc: LocationSuggestion) {
    setSelectedName(loc.display_name)
    setMode('physical')
    setQuery('')
    setSuggestions([])
    setShowDropdown(false)
  }

  function handleClear() {
    setSelectedName('')
    setQuery('')
    setSuggestions([])
    inputRef.current?.focus()
  }

  const canProceed =
    (mode === 'physical' && selectedName.trim().length > 0) ||
    mode === 'online'

  async function handleNext() {
    if (!canProceed || isSaving) return
    setSaving(true)
    try {
      const finalName = mode === 'online' ? 'Online / Türkiye geneli' : selectedName.trim()
      update({ location_type: mode, location_name: finalName })
      await saveDraft(
        { location_type: mode, location_name: finalName },
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
      <h2 className="serif" style={{ fontSize: '24px', margin: '0 0 20px', color: 'var(--ink)' }}>
        Öncelikle grubunuz için konumunuzu belirleyin
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
        <span>Gruplar yerel olarak, yüz yüze veya çevrimiçi buluşur. Konum, sizinle aynı bölgedeki insanlarla bağlantı kurmamıza yardımcı olur.</span>
      </div>


      {/* Konumumu kullan butonu */}
      <button
        type="button"
        onClick={handleGeolocation}
        disabled={geoLoading}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          borderRadius: '999px',
          background: 'var(--paper-soft, rgba(30, 58, 43, 0.06))',
          border: '1.5px solid rgba(30, 58, 43, 0.15)',
          color: 'var(--ink)',
          fontSize: '13.5px',
          fontFamily: "'IBM Plex Mono', monospace",
          cursor: geoLoading ? 'wait' : 'pointer',
          marginBottom: '16px',
        }}
      >
        📍 {geoLoading ? 'Konum alınıyor…' : 'Konumumu kullan'}
      </button>

      {geoError && (
        <p style={{ fontSize: '12.5px', color: 'var(--coral-deep, #b04330)', marginTop: '-8px', marginBottom: '16px' }}>
          {geoError}
        </p>
      )}

      {/* Seçili konum chip'i */}
      {mode === 'physical' && selectedName && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            borderRadius: '999px',
            background: 'var(--lime, #D6FF3F)',
            color: 'var(--ink)',
            fontWeight: 600,
            fontSize: '14px',
            marginBottom: '16px',
          }}
        >
          📍 {selectedName}
          <button
            type="button"
            onClick={handleClear}
            aria-label="Konumu kaldır"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
              lineHeight: 1,
              padding: 0,
              color: 'var(--ink)',
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Arama kutusu */}
      {(!selectedName || mode === 'online') && (
        <div style={{ position: 'relative', marginBottom: '20px' }}>
          <div style={{
            position: 'absolute',
            left: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '16px',
            pointerEvents: 'none',
          }}>
            🔍
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setMode('physical')
            }}
            onFocus={() => query.length >= 2 && setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            placeholder="Şehir veya ilçe ara — örn. Kadıköy, Ankara, Bodrum"
            style={{ width: '100%', paddingLeft: '40px' }}
            autoComplete="off"
          />
          {showDropdown && (isSearching || suggestions.length > 0 || query.trim().length >= 2) && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                background: 'var(--paper-cream, #FFFDF6)',
                border: '1.5px solid rgba(30, 58, 43, 0.15)',
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                maxHeight: '320px',
                overflowY: 'auto',
                zIndex: 10,
              }}
            >
              {isSearching && (
                <div style={{ padding: '14px 16px', color: 'var(--muted)', fontSize: '13.5px' }}>
                  Aranıyor…
                </div>
              )}
              {!isSearching && suggestions.length === 0 && query.trim().length >= 2 && (
                <div style={{ padding: '14px 16px', color: 'var(--muted)', fontSize: '13.5px' }}>
                  Sonuç yok.
                </div>
              )}
              {!isSearching &&
                suggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(s)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '12px 16px',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid rgba(30, 58, 43, 0.08)',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: 'var(--ink)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(30,58,43,0.05)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ marginRight: '8px' }}>
                      {s.type === 'ilce' ? '📍' : '🏙️'}
                    </span>
                    {s.display_name}
                    <span style={{ marginLeft: '8px', fontSize: '11.5px', color: 'var(--muted)', fontFamily: "'IBM Plex Mono', monospace" }}>
                      {s.type === 'ilce' ? 'ilçe' : 'il'}
                    </span>
                  </button>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Ayırıcı */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          margin: '24px 0',
          color: 'var(--muted)',
          fontSize: '11.5px',
          fontFamily: "'IBM Plex Mono', monospace",
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        <div style={{ flex: 1, height: '1px', background: 'rgba(30,58,43,0.1)' }} />
        <span>ya da</span>
        <div style={{ flex: 1, height: '1px', background: 'rgba(30,58,43,0.1)' }} />
      </div>

      {/* Çevrimiçi grup */}
      <button
        type="button"
        onClick={() => {
          setMode('online')
          setSelectedName('')
        }}
        style={{
          width: '100%',
          padding: '14px 16px',
          borderRadius: '12px',
          background: mode === 'online' ? 'var(--ink)' : 'transparent',
          color: mode === 'online' ? 'var(--paper-cream, #FFFDF6)' : 'var(--ink)',
          border: mode === 'online' ? '1.5px solid var(--ink)' : '1.5px solid rgba(30, 58, 43, 0.2)',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <span style={{ fontSize: '18px' }}>🌐</span>
        <span>
          Çevrimiçi grup
          <span style={{ display: 'block', fontSize: '12px', fontWeight: 400, opacity: 0.8, marginTop: '2px' }}>
            Türkiye geneli, uzaktan buluşan bir topluluk
          </span>
        </span>
      </button>

      {/* İleri butonu */}
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
