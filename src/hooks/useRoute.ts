import { useEffect } from 'react'
import { fetchRoute, RoutingError } from '../services/routing'
import { useApp } from '../state/store'

const DEBOUNCE_MS = 600

export function useRoute() {
  const waypoints = useApp((s) => s.tour.waypoints)
  const options = useApp((s) => s.tour.options)
  const setRouteState = useApp((s) => s.setRouteState)

  useEffect(() => {
    if (waypoints.length < 2) {
      setRouteState(null, 'idle')
      return
    }
    const controller = new AbortController()
    const prev = useApp.getState().route
    setRouteState(prev, 'loading')
    const timer = setTimeout(async () => {
      try {
        const route = await fetchRoute(waypoints, options, controller.signal)
        if (!controller.signal.aborted) setRouteState(route, 'idle')
      } catch (e) {
        if (controller.signal.aborted) return
        const message =
          e instanceof RoutingError ? e.message : 'Unerwarteter Fehler bei der Routenberechnung.'
        setRouteState(null, 'error', message)
      }
    }, DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [waypoints, options, setRouteState])
}
