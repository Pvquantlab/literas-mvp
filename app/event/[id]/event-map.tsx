'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

/**
 * Harita iğnesi. Eski hâli #C8EB4B lime + #1E3A2B koyu yeşildi — ikisi de
 * Temmuz paletinden kalmıştı ve sitede başka hiçbir yerde kullanılmıyor.
 * Leaflet ikonu ham HTML dizesi olarak istediği için burada CSS değişkeni
 * geçmiyor; değerler --paper-cream ve --ink'in kendisi.
 */
const PIN_SVG = `
<svg width="38" height="47" viewBox="0 0 38 47" xmlns="http://www.w3.org/2000/svg">
  <path d="M19 46 C19 46 33.8 26.6 33.8 17 A14.8 14.8 0 1 0 4.2 17 C4.2 26.6 19 46 19 46 Z" fill="#F1F0EA" stroke="#0755BB" stroke-width="2.4" stroke-linejoin="round"/>
  <circle cx="19" cy="17" r="5.6" fill="#0755BB"/>
</svg>`

const icon = L.divIcon({
  className: 'lit-pin',
  html: PIN_SVG,
  iconSize: [38, 47],
  iconAnchor: [19, 46],
  popupAnchor: [0, -42],
})

const CITY_COORDS: Record<string, [number, number]> = {
  istanbul: [41.0082, 28.9784],
  ankara: [39.9334, 32.8597],
  izmir: [38.4237, 27.1428],
  bursa: [40.1826, 29.0665],
  antalya: [36.8969, 30.7133],
}

export default function EventMap(props: { location: string; city?: string }) {
  const { location, city } = props
  const [coords, setCoords] = useState<[number, number] | null>(null)
  const [loading, setLoading] = useState(true)
  const [approx, setApprox] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function geocode() {
      const q = city ? location + ', ' + city + ', Türkiye' : location + ', Türkiye'
      try {
        const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=tr&q=' + encodeURIComponent(q)
        const res = await fetch(url)
        const data = await res.json()
        if (cancelled) return
        if (data && data.length > 0) {
          setCoords([parseFloat(data[0].lat), parseFloat(data[0].lon)])
          setLoading(false)
          return
        }
        const key = city ? city.toLocaleLowerCase('tr') : ''
        if (key && CITY_COORDS[key]) {
          setCoords(CITY_COORDS[key])
          setApprox(true)
          setLoading(false)
          return
        }
        setLoading(false)
      } catch (err) {
        if (!cancelled) setLoading(false)
      }
    }
    geocode()
    return () => {
      cancelled = true
    }
  }, [location, city])

  if (loading) {
    return (
      <div style={{ marginTop: '24px' }}>
        <MapTitle />
        <div style={containerStyle}>
          <div style={loadingStyle}>harita yükleniyor...</div>
        </div>
      </div>
    )
  }

  if (!coords) return null

  const mapsUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(location + (city ? ', ' + city : ''))

  return (
    <div style={{ marginTop: '24px' }}>
      <style>{`
        .lit-pin { background: none; border: none; }
        .leaflet-popup-content-wrapper {
          background: var(--ink);
          color: #fff;
          border-radius: var(--r-md);
          padding: 4px 6px;
          box-shadow: none;
        }
        .leaflet-popup-content {
          margin: 10px 14px;
          font-family: 'Instrument Sans', system-ui, sans-serif;
        }
        .leaflet-popup-tip { background: var(--ink); }
        .popup-title {
          font-weight: 600;
          font-size: 14.5px;
          margin: 0 0 2px;
          letter-spacing: .02em;
        }
        .popup-sub {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          color: rgba(255,255,255,.72);
        }
        .leaflet-control-zoom {
          border: 1px solid var(--border) !important;
          border-radius: var(--r-md) !important;
          overflow: hidden;
          box-shadow: none !important;
        }
        .leaflet-control-zoom a {
          background: rgba(255,255,255,.94);
          color: var(--ink);
          border: none !important;
          font-weight: 600;
          width: 30px;
          height: 30px;
          line-height: 30px;
        }
        .leaflet-control-zoom a:first-child {
          border-bottom: 1px solid var(--border) !important;
        }
        .leaflet-control-zoom a:hover { background: #FFFFFF; }
        .leaflet-control-attribution {
          background: rgba(255,255,255,.72) !important;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 9.5px !important;
          color: rgba(30,58,43,.5) !important;
        }
        .leaflet-control-attribution a { color: rgba(30,58,43,.65) !important; }
      `}</style>
      <MapTitle />
      <div style={containerStyle}>
        <MapContainer
          center={coords}
          zoom={approx ? 12 : 15}
          scrollWheelZoom={false}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          <Marker position={coords} icon={icon}>
            <Popup>
              <div className="popup-title">{location}</div>
              <div className="popup-sub">{approx ? 'yaklaşık konum' : 'buluşma yeri'}</div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>
      <div style={footerStyle}>
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '12px',
          color: 'var(--muted)',
        }}>
          {approx ? 'yaklaşık konum · tam adres için yol tarifine tıkla' : 'buluşma noktası'}
        </span>
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={pillButtonStyle}>
          yol tarifi al
        </a>
      </div>
    </div>
  )
}

function MapTitle() {
  return (
    <h3 className="serif" style={{
      fontWeight: 600,
      fontSize: 'clamp(20px, 2.4vw, 26px)',
      color: 'var(--ink)',
      margin: '0 0 12px',
      letterSpacing: '-0.01em',
    }}>
      Buluşma <span className="highlight-yellow">yeri</span>
    </h3>
  )
}

const containerStyle: React.CSSProperties = {
  width: '100%',
  height: '340px',
  borderRadius: '22px',
  overflow: 'hidden',
  border: '2px solid var(--ink)',
  background: 'var(--paper-cream)',
  boxShadow: '4px 5px 0 rgba(30,58,43,.12)',
}

const loadingStyle: React.CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  height: '100%',
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: '13px',
  color: 'var(--muted)',
}

const footerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: '14px',
  flexWrap: 'wrap',
  gap: '12px',
}

const pillButtonStyle: React.CSSProperties = {
  background: 'var(--lime)',
  color: 'var(--ink)',
  border: '2px solid var(--ink)',
  borderRadius: '999px',
  padding: '8px 20px',
  fontFamily: "'Instrument Sans', system-ui, sans-serif",
  fontSize: '14px',
  fontWeight: 600,
  textDecoration: 'none',
  boxShadow: '3px 4px 0 var(--ink)',
  transition: 'transform 0.18s ease',
  display: 'inline-block',
}
