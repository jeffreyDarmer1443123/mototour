import { useEffect } from 'react'
import { saveTour, setActiveTourId } from '../services/storage'
import { useApp } from '../state/store'

export function useAutoSave() {
  const tour = useApp((s) => s.tour)

  useEffect(() => {
    if (tour.waypoints.length === 0) return
    const timer = setTimeout(() => {
      try {
        saveTour(tour)
        setActiveTourId(tour.id)
      } catch {
        /* Speicher voll oder gesperrt – Planung funktioniert trotzdem */
      }
    }, 800)
    return () => clearTimeout(timer)
  }, [tour])
}
