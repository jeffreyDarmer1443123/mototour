import { haversineKm, type LonLat } from '../utils/geo'

export interface FuelStation {
  id: number
  lat: number
  lon: number
  name?: string
  brand?: string
}

export interface FuelStationOnRoute extends FuelStation {
  kmAlong: number
}

export interface BoundingBox {
  south: number
  west: number
  north: number
  east: number
}

const KM_PER_DEGREE_LAT = 111.32

export function corridorBoundingBox(coordinates: LonLat[], marginKm: number): BoundingBox {
  let west = Infinity
  let east = -Infinity
  let south = Infinity
  let north = -Infinity
  for (const [lon, lat] of coordinates) {
    if (lon < west) west = lon
    if (lon > east) east = lon
    if (lat < south) south = lat
    if (lat > north) north = lat
  }
  const latMargin = marginKm / KM_PER_DEGREE_LAT
  const midLat = (south + north) / 2
  const lonMargin = marginKm / (KM_PER_DEGREE_LAT * Math.cos((midLat * Math.PI) / 180))
  return {
    south: south - latMargin,
    north: north + latMargin,
    west: west - lonMargin,
    east: east + lonMargin,
  }
}

export function distanceAlongRouteKm(coordinates: LonLat[], point: LonLat): number {
  let best = 0
  let bestDist = Infinity
  let cumulative = 0
  const cumulativeAt: number[] = [0]
  for (let i = 1; i < coordinates.length; i++) {
    cumulative += haversineKm(coordinates[i - 1], coordinates[i])
    cumulativeAt.push(cumulative)
  }
  for (let i = 0; i < coordinates.length; i++) {
    const d = haversineKm(coordinates[i], point)
    if (d < bestDist) {
      bestDist = d
      best = i
    }
  }
  return cumulativeAt[best]
}

function pointToSegmentKm(p: LonLat, a: LonLat, b: LonLat): number {
  const cosLat = Math.cos((p[1] * Math.PI) / 180)
  const ax = a[0] * cosLat
  const bx = b[0] * cosLat
  const px = p[0] * cosLat
  const dx = bx - ax
  const dy = b[1] - a[1]
  const lengthSq = dx * dx + dy * dy
  let t = lengthSq === 0 ? 0 : ((px - ax) * dx + (p[1] - a[1]) * dy) / lengthSq
  t = Math.max(0, Math.min(1, t))
  const nearest: LonLat = [(ax + t * dx) / cosLat, a[1] + t * dy]
  return haversineKm(p, nearest)
}

export function filterByCorridor<T extends { lat: number; lon: number }>(
  stations: T[],
  coordinates: LonLat[],
  maxDistKm: number,
): T[] {
  return stations.filter((s) => {
    const p: LonLat = [s.lon, s.lat]
    for (let i = 1; i < coordinates.length; i++) {
      if (pointToSegmentKm(p, coordinates[i - 1], coordinates[i]) <= maxDistKm) return true
    }
    return false
  })
}

export function buildOverpassQuery(bbox: BoundingBox): string {
  const box = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`
  return `[out:json][timeout:25];(node["amenity"="fuel"](${box});way["amenity"="fuel"](${box}););out center;`
}

interface OverpassElement {
  type: string
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: { name?: string; brand?: string }
}

export function parseOverpassResponse(json: { elements?: OverpassElement[] }): FuelStation[] {
  const stations: FuelStation[] = []
  for (const el of json.elements ?? []) {
    const lat = el.lat ?? el.center?.lat
    const lon = el.lon ?? el.center?.lon
    if (lat === undefined || lon === undefined) continue
    stations.push({
      id: el.id,
      lat,
      lon,
      name: el.tags?.name ?? el.tags?.brand ?? 'Tankstelle',
      brand: el.tags?.brand,
    })
  }
  return stations
}

export class FuelError extends Error {}

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const CORRIDOR_KM = 2

export async function fetchFuelStations(
  coordinates: LonLat[],
  signal?: AbortSignal,
): Promise<FuelStationOnRoute[]> {
  const query = buildOverpassQuery(corridorBoundingBox(coordinates, CORRIDOR_KM))
  let res: Response
  try {
    res = await fetch(OVERPASS_URL, { method: 'POST', body: query, signal })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    throw new FuelError('Tankstellen-Dienst nicht erreichbar.')
  }
  if (!res.ok) throw new FuelError('Tankstellen konnten nicht geladen werden.')
  const stations = parseOverpassResponse((await res.json()) as { elements?: OverpassElement[] })
  const thinned = coordinates.filter((_, i) => i % 5 === 0 || i === coordinates.length - 1)
  return filterByCorridor(stations, thinned, CORRIDOR_KM)
    .map((s) => ({ ...s, kmAlong: distanceAlongRouteKm(coordinates, [s.lon, s.lat]) }))
    .sort((a, b) => a.kmAlong - b.kmAlong)
}
