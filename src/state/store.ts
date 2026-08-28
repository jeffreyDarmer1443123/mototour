import { create } from 'zustand'
import type { RouteResult, Tour, TourOptions, Waypoint, WaypointKind } from '../types'
import { DEFAULT_OPTIONS } from '../types'
import type { FuelStationOnRoute } from '../services/fuelStations'
import { decodeTourFragment } from '../services/shareLink'
import { getActiveTourId, loadTour } from '../services/storage'

export function newTour(): Tour {
  return {
    id: crypto.randomUUID(),
    name: 'Neue Tour',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    waypoints: [],
    options: { ...DEFAULT_OPTIONS },
  }
}

export type RouteStatus = 'idle' | 'loading' | 'error'

function initialTour(): { tour: Tour; fromShare: boolean } {
  if (typeof window !== 'undefined') {
    const match = window.location.hash.match(/^#t=([A-Za-z0-9_-]+)$/)
    if (match) {
      try {
        const tour = decodeTourFragment(match[1])
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
        return { tour, fromShare: true }
      } catch {
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
      }
    }
    try {
      const activeId = getActiveTourId()
      if (activeId) {
        const stored = loadTour(activeId)
        if (stored) return { tour: stored, fromShare: false }
      }
    } catch {
      /* localStorage gesperrt – mit leerer Tour starten */
    }
  }
  return { tour: newTour(), fromShare: false }
}

interface AppState {
  tour: Tour
  route: RouteResult | null
  routeStatus: RouteStatus
  routeError: string | null
  fuelVisible: boolean
  fuelStations: FuelStationOnRoute[]
  fuelStatus: RouteStatus
  drawerOpen: boolean
  sharedTourLoaded: boolean

  addWaypoint: (lat: number, lon: number, extra?: { kind?: WaypointKind; name?: string; index?: number }) => void
  updateWaypoint: (id: string, patch: Partial<Pick<Waypoint, 'lat' | 'lon' | 'name'>>) => void
  removeWaypoint: (id: string) => void
  reorderWaypoint: (from: number, to: number) => void
  setOptions: (patch: Partial<TourOptions>) => void
  setTourName: (name: string) => void
  setTour: (tour: Tour) => void
  clearTour: () => void
  setRouteState: (route: RouteResult | null, status: RouteStatus, error?: string | null) => void
  toggleFuel: () => void
  setFuelState: (stations: FuelStationOnRoute[], status: RouteStatus) => void
  setDrawerOpen: (open: boolean) => void
  dismissSharedToast: () => void
}

function touch(tour: Tour, waypoints?: Waypoint[], options?: TourOptions): Tour {
  return {
    ...tour,
    waypoints: waypoints ?? tour.waypoints,
    options: options ?? tour.options,
    updatedAt: Date.now(),
  }
}

const initial = initialTour()

export const useApp = create<AppState>((set) => ({
  tour: initial.tour,
  route: null,
  routeStatus: 'idle',
  routeError: null,
  fuelVisible: false,
  fuelStations: [],
  fuelStatus: 'idle',
  drawerOpen: false,
  sharedTourLoaded: initial.fromShare,

  addWaypoint: (lat, lon, extra) =>
    set((s) => {
      const wp: Waypoint = {
        id: crypto.randomUUID(),
        lat,
        lon,
        kind: extra?.kind ?? 'via',
        name: extra?.name,
      }
      const list = [...s.tour.waypoints]
      list.splice(extra?.index ?? list.length, 0, wp)
      return { tour: touch(s.tour, list) }
    }),

  updateWaypoint: (id, patch) =>
    set((s) => ({
      tour: touch(
        s.tour,
        s.tour.waypoints.map((w) => (w.id === id ? { ...w, ...patch } : w)),
      ),
    })),

  removeWaypoint: (id) =>
    set((s) => ({
      tour: touch(
        s.tour,
        s.tour.waypoints.filter((w) => w.id !== id),
      ),
    })),

  reorderWaypoint: (from, to) =>
    set((s) => {
      const list = [...s.tour.waypoints]
      if (from < 0 || from >= list.length || to < 0 || to >= list.length) return {}
      const [moved] = list.splice(from, 1)
      list.splice(to, 0, moved)
      return { tour: touch(s.tour, list) }
    }),

  setOptions: (patch) =>
    set((s) => ({ tour: touch(s.tour, undefined, { ...s.tour.options, ...patch }) })),

  setTourName: (name) => set((s) => ({ tour: { ...touch(s.tour), name } })),

  setTour: (tour) => set({ tour, route: null, routeStatus: 'idle', routeError: null }),

  clearTour: () => set({ tour: newTour(), route: null, routeStatus: 'idle', routeError: null }),

  setRouteState: (route, status, error = null) =>
    set({ route, routeStatus: status, routeError: error }),

  toggleFuel: () =>
    set((s) => ({
      fuelVisible: !s.fuelVisible,
      fuelStations: s.fuelVisible ? [] : s.fuelStations,
      fuelStatus: 'idle',
    })),

  setFuelState: (stations, status) => set({ fuelStations: stations, fuelStatus: status }),

  setDrawerOpen: (open) => set({ drawerOpen: open }),

  dismissSharedToast: () => set({ sharedTourLoaded: false }),
}))

if (import.meta.env.DEV) {
  ;(window as unknown as Record<string, unknown>).__app = useApp
}

export function waypointLabel(index: number, total: number, kind: WaypointKind): string {
  if (index === 0) return 'S'
  if (index === total - 1 && kind !== 'fuel') return 'Z'
  return String(index)
}
