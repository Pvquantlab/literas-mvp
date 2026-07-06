'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Standart Leaflet marker
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
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
      const q = city ? location + ', ' + city + ', Turkiye' : location + ', Turkiye'
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
          <div style={loadingStyle}>harita yukleniyor...</div>
        </div>
      </div>
    )
  }

  if (!coords) return null

  const mapsUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(location + (city ? ', ' + city : ''))

  return (
    <div style={{ marginTop: '24px' }}>
      <style>{`
        .leaflet-popup-content-wrapper {
          background: #1E3A2B;
          color: #FAF4E8;
          border-radius: 14px;
          padding: 4px 6px;
          box-shadow: 0 6px 20px rgba(30,58,43,.25);
        }
        .leaflet-popup-content {
          margin: 10px 14px;
          font-family: 'Schibsted Grotesk', system-ui, sans-serif;
        }
        .leaflet-popup-tip {
          background: #1E3A2B;
        }
        .popup-title {
          font-family: 'Playfair Display', serif;
          font-weight: 800;
          font-size: 15px;
          margin: 0 0 2px;
        }
        .popup-sub {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          color: rgba(250,244,232,.7);
        }
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
              <div className="popup-sub">{approx ? 'yaklasik konum' : 'bulusma yeri'}</div>
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
          {approx ? '✿ yaklasik konum · tam adres icin yol tarifine tikla' : '✿ tam konum'}
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
    <h3 style={{
      fontFamily: "'Playfair Display', serif",
      fontWeight: 800,
      fontSize: 'clamp(20px, 2.4vw, 26px)',
      color: 'var(--ink)',
      margin: '0 0 12px',
      letterSpacing: '-0.01em',
    }}>
      Bulusma <span className="highlight-yellow">yeri</span>
    </h3>
  )
}

const containerStyle: React.CSSProperties = {
  width: '100%',
  height: '320px',
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
  fontFamily: "'Schibsted Grotesk', system-ui, sans-serif",
  fontSize: '14px',
  fontWeight: 800,
  textDecoration: 'none',
  boxShadow: '3px 4px 0 var(--ink)',
  transition: 'transform 0.18s ease',
  display: 'inline-block',
}