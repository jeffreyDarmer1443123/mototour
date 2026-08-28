import type { RouteResult } from '../types'

export type LonLat = [number, number]

const EARTH_RADIUS_KM = 6371

export function haversineKm(a: LonLat, b: LonLat): number {
  const toRad = Math.PI / 180
  const dLat = (b[1] - a[1]) * toRad
  const dLon = (b[0] - a[0]) * toRad
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a[1] * toRad) * Math.cos(b[1] * toRad) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(s))
}

export function nearestCoordinateIndex(coordinates: LonLat[], point: LonLat): number {
  let best = 0
  let bestDist = Infinity
  for (let i = 0; i < coordinates.length; i++) {
    const d = haversineKm(coordinates[i], point)
    if (d < bestDist) {
      bestDist = d
      best = i
    }
  }
  return best
}

export function insertionIndexForPoint(route: RouteResult, point: LonLat): number {
  const coordIndex = nearestCoordinateIndex(route.coordinates, point)
  for (let legIndex = 0; legIndex < route.legs.length; legIndex++) {
    if (coordIndex <= route.legs[legIndex].endCoordinateIndex) return legIndex + 1
  }
  return route.legs.length
}
