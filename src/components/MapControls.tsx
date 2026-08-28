import { useState } from 'react'
import { Marker } from 'maplibre-gl'
import { flyTo, mapHandle } from '../state/mapHandle'
import { useApp } from '../state/store'

let locationMarker: Marker | null = null

export default function MapControls() {
  const [locating, setLocating] = useState(false)
  const fuelVisible = useApp((s) => s.fuelVisible)
  const fuelStatus = useApp((s) => s.fuelStatus)
  const hasRoute = useApp((s) => s.route !== null)
  const toggleFuel = useApp((s) => s.toggleFuel)

  const locate = () => {
    if (!navigator.geolocation || locating) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        const { latitude, longitude } = pos.coords
        const map = mapHandle.current
        if (!map) return
        if (!locationMarker) {
          const el = document.createElement('div')
          el.className = 'loc-dot'
          locationMarker = new Marker({ element: el })
        }
        locationMarker.setLngLat([longitude, latitude]).addTo(map)
        flyTo(longitude, latitude, 12)
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <>
      <div className="fab-col">
        <button className={'fab' + (locating ? ' is-busy' : '')} title="Mein Standort" onClick={locate}>
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            <circle cx="12" cy="12" r="8" />
          </svg>
        </button>
        {hasRoute && (
          <button
            className={'fab' + (fuelVisible ? ' is-on' : '') + (fuelStatus === 'loading' ? ' is-busy' : '')}
            title={fuelVisible ? 'Tankstellen ausblenden' : 'Tankstellen an der Route zeigen'}
            onClick={toggleFuel}
          >
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 20V6a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v14M3 20h11M13 10h2a1 1 0 0 1 1 1v4a1.5 1.5 0 0 0 3 0V8.5L17.5 6M6.5 8h4" />
            </svg>
          </button>
        )}
      </div>
      {fuelStatus === 'error' && (
        <div className="toast">Tankstellen konnten nicht geladen werden. Versuch es gleich nochmal.</div>
      )}
    </>
  )
}
