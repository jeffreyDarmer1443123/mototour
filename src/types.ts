export type WaypointKind = 'start' | 'via' | 'fuel' | 'end'

export interface Waypoint {
  id: string
  lat: number
  lon: number
  name?: string
  kind: WaypointKind
}

export interface TourOptions {
  curviness: 0 | 1 | 2 | 3
  avoidHighways: boolean
  avoidFerries: boolean
}

export interface Tour {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  waypoints: Waypoint[]
  options: TourOptions
}

export interface RouteLeg {
  distanceKm: number
  durationMin: number
  endCoordinateIndex: number
}

export interface RouteResult {
  coordinates: [number, number][]
  distanceKm: number
  durationMin: number
  legs: RouteLeg[]
}

export const DEFAULT_OPTIONS: TourOptions = {
  curviness: 2,
  avoidHighways: false,
  avoidFerries: false,
}
