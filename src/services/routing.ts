import type { RouteResult, TourOptions, Waypoint } from '../types'
import { decodePolyline } from '../utils/polyline'

const VALHALLA_URL = 'https://valhalla1.openstreetmap.de/route'

interface MotorcycleCostingOptions {
  use_highways: number
  use_trails: number
  use_ferry?: number
}

export interface ValhallaRequest {
  locations: { lat: number; lon: number; type: 'break' }[]
  costing: 'motorcycle'
  costing_options: { motorcycle: MotorcycleCostingOptions }
  units: 'kilometers'
  language: string
}

const CURVINESS_PROFILE: Record<TourOptions['curviness'], MotorcycleCostingOptions> = {
  0: { use_highways: 1, use_trails: 0 },
  1: { use_highways: 0.4, use_trails: 0 },
  2: { use_highways: 0.1, use_trails: 0.05 },
  3: { use_highways: 0, use_trails: 0.15 },
}

export function buildRouteRequest(waypoints: Waypoint[], options: TourOptions): ValhallaRequest {
  const motorcycle: MotorcycleCostingOptions = { ...CURVINESS_PROFILE[options.curviness] }
  if (options.avoidHighways) motorcycle.use_highways = 0
  if (options.avoidFerries) motorcycle.use_ferry = 0
  return {
    locations: waypoints.map((w) => ({ lat: w.lat, lon: w.lon, type: 'break' })),
    costing: 'motorcycle',
    costing_options: { motorcycle },
    units: 'kilometers',
    language: 'de-DE',
  }
}

interface ValhallaLeg {
  shape: string
  summary: { length: number; time: number }
}

interface ValhallaResponse {
  trip: {
    legs: ValhallaLeg[]
    summary: { length: number; time: number }
  }
}

export function parseRouteResponse(response: ValhallaResponse): RouteResult {
  const coordinates: [number, number][] = []
  const legs = []
  for (const leg of response.trip.legs) {
    const points = decodePolyline(leg.shape, 6)
    for (const [lat, lon] of points) {
      const last = coordinates[coordinates.length - 1]
      if (last && last[0] === lon && last[1] === lat) continue
      coordinates.push([lon, lat])
    }
    legs.push({
      distanceKm: leg.summary.length,
      durationMin: leg.summary.time / 60,
      endCoordinateIndex: coordinates.length - 1,
    })
  }
  return {
    coordinates,
    distanceKm: response.trip.summary.length,
    durationMin: response.trip.summary.time / 60,
    legs,
  }
}

export class RoutingError extends Error {}

export async function fetchRoute(
  waypoints: Waypoint[],
  options: TourOptions,
  signal?: AbortSignal,
): Promise<RouteResult> {
  const body = JSON.stringify(buildRouteRequest(waypoints, options))
  let res: Response
  try {
    res = await fetch(VALHALLA_URL, { method: 'POST', body, signal })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    throw new RoutingError('Routing-Dienst nicht erreichbar. Bist du online?')
  }
  if (!res.ok) {
    let detail = ''
    try {
      const err = (await res.json()) as { error?: string }
      detail = err.error ?? ''
    } catch {
      detail = ''
    }
    if (res.status === 400) {
      throw new RoutingError(
        detail.includes('No path')
          ? 'Keine Route gefunden. Liegt ein Wegpunkt abseits befahrbarer Straßen?'
          : 'Route konnte nicht berechnet werden.',
      )
    }
    throw new RoutingError('Routing-Dienst meldet einen Fehler. Versuch es gleich nochmal.')
  }
  return parseRouteResponse((await res.json()) as ValhallaResponse)
}
