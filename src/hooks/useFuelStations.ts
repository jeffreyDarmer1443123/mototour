import { useEffect } from 'react'
import { fetchFuelStations } from '../services/fuelStations'
import { useApp } from '../state/store'

export function useFuelStations() {
  const fuelVisible = useApp((s) => s.fuelVisible)
  const route = useApp((s) => s.route)
  const setFuelState = useApp((s) => s.setFuelState)

  useEffect(() => {
    if (!fuelVisible || !route) {
      setFuelState([], 'idle')
      return
    }
    const controller = new AbortController()
    setFuelState(useApp.getState().fuelStations, 'loading')
    const timer = setTimeout(async () => {
      try {
        const stations = await fetchFuelStations(route.coordinates, controller.signal)
        if (!controller.signal.aborted) setFuelState(stations, 'idle')
      } catch {
        if (!controller.signal.aborted) setFuelState([], 'error')
      }
    }, 400)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [fuelVisible, route, setFuelState])
}
