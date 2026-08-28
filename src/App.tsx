import { useEffect } from 'react'
import MapControls from './components/MapControls'
import MapView from './components/MapView'
import SearchBar from './components/SearchBar'
import TourListDrawer from './components/TourListDrawer'
import TourPanel from './components/TourPanel'
import { useRoute } from './hooks/useRoute'
import { useFuelStations } from './hooks/useFuelStations'
import { useAutoSave } from './hooks/useAutoSave'
import { useApp } from './state/store'

export default function App() {
  useRoute()
  useFuelStations()
  useAutoSave()
  const sharedTourLoaded = useApp((s) => s.sharedTourLoaded)
  const dismissSharedToast = useApp((s) => s.dismissSharedToast)

  useEffect(() => {
    if (!sharedTourLoaded) return
    const timer = setTimeout(dismissSharedToast, 6000)
    return () => clearTimeout(timer)
  }, [sharedTourLoaded, dismissSharedToast])
  return (
    <div className="app">
      <MapView />
      <div className="chrome-top">
        <div className="brand" title="MotoTour">
          <svg width="26" height="26" viewBox="0 0 128 128" aria-hidden="true">
            <rect width="128" height="128" rx="28" fill="none" />
            <path
              d="M 24 108 C 52 96, 30 68, 58 58 S 96 66, 88 40 S 96 24, 106 20"
              fill="none"
              stroke="#e8541d"
              strokeWidth="13"
              strokeLinecap="round"
            />
            <circle cx="24" cy="108" r="10" fill="#fdfcfa" />
            <circle cx="106" cy="20" r="10" fill="#fdfcfa" />
          </svg>
          <span className="brand-name">
            Moto<em>Tour</em>
          </span>
        </div>
        <SearchBar />
      </div>
      <TourPanel />
      <MapControls />
      <TourListDrawer />
      {sharedTourLoaded && (
        <div className="toast">Geteilte Tour geladen – sie liegt jetzt auch in deinen Touren.</div>
      )}
    </div>
  )
}
