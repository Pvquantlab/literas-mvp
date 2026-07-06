'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

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
      <div style={containerStyle}>
        <div style={loadingStyle}>harita yukleniyor...</div>
      </div>
    )
  }

  if (!coords) return null

  const mapsUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(location + (city ? ', ' + city : ''))

  return (
    <div style={{ marginTop: '16px' }}>
      <div style={containerStyle}>
        <MapContainer
          center={coords}
          zoom={approx ? 12 : 15}
          scrollWheelZoom={false}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            attribution="OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={coords} icon={icon}>
            <Popup>{location}</Popup>
          </Marker>
        </MapContainer>
      </div>
      <div style={footerStyle}>
        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
          {approx ? 'yaklasik konum' : ''}
        </span>
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={linkStyle}>
          yol tarifi al
        </a>
      </div>
    </div>
  )
}

const containerStyle: React.CSSProperties = {
  width: '100%',
  height: '280px',
  borderRadius: '18px',
  overflow: 'hidden',
  border: '1.5px solid var(--border)',
  background: 'var(--paper-cream)',
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
  marginTop: '10px',
  fontFamily: "'IBM Plex Mono', monospace",
}

const linkStyle: React.CSSProperties = {
  fontSize: '13px',
  color: 'var(--ink)',
  textDecoration: 'underline',
  textUnderlineOffset: '3px',
}