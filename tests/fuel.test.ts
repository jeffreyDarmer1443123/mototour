import { describe, expect, test } from 'vitest'
import {
  buildOverpassQuery,
  corridorBoundingBox,
  distanceAlongRouteKm,
  filterByCorridor,
  parseOverpassResponse,
} from '../src/services/fuelStations'
import type { LonLat } from '../src/utils/geo'

const route: LonLat[] = [
  [8.7, 49.4],
  [8.8, 49.4],
  [8.9, 49.4],
  [9.0, 49.4],
]

describe('corridorBoundingBox', () => {
  test('spans the route plus margin on every side', () => {
    const bbox = corridorBoundingBox(route, 2)
    expect(bbox.south).toBeLessThan(49.4)
    expect(bbox.north).toBeGreaterThan(49.4)
    expect(bbox.west).toBeLessThan(8.7)
    expect(bbox.east).toBeGreaterThan(9.0)
    expect(bbox.north - 49.4).toBeCloseTo(2 / 111.32, 3)
  })
})

describe('distanceAlongRouteKm', () => {
  test('is zero at the start and grows monotonically', () => {
    expect(distanceAlongRouteKm(route, [8.7, 49.4])).toBe(0)
    const mid = distanceAlongRouteKm(route, [8.9, 49.4])
    const end = distanceAlongRouteKm(route, [9.0, 49.4])
    expect(mid).toBeGreaterThan(0)
    expect(end).toBeGreaterThan(mid)
    expect(end).toBeCloseTo(21.7, 0)
  })

  test('snaps an off-route point to the nearest vertex', () => {
    const nearSecond = distanceAlongRouteKm(route, [8.802, 49.41])
    expect(nearSecond).toBeCloseTo(distanceAlongRouteKm(route, [8.8, 49.4]), 5)
  })
})

describe('filterByCorridor', () => {
  test('keeps stations near the route and drops distant ones', () => {
    const stations = [
      { id: 1, lat: 49.405, lon: 8.85, name: 'Nah' },
      { id: 2, lat: 49.9, lon: 8.85, name: 'Fern' },
    ]
    const kept = filterByCorridor(stations, route, 2)
    expect(kept.map((s) => s.id)).toEqual([1])
  })
})

describe('buildOverpassQuery', () => {
  test('queries fuel nodes and ways within the bbox', () => {
    const q = buildOverpassQuery({ south: 49.3, west: 8.6, north: 49.5, east: 9.1 })
    expect(q).toContain('amenity"="fuel')
    expect(q).toContain('49.3,8.6,49.5,9.1')
    expect(q).toContain('out center')
  })
})

describe('parseOverpassResponse', () => {
  test('maps nodes and way centers to stations', () => {
    const parsed = parseOverpassResponse({
      elements: [
        { type: 'node', id: 11, lat: 49.41, lon: 8.75, tags: { name: 'Aral Nord', brand: 'Aral' } },
        { type: 'way', id: 22, center: { lat: 49.42, lon: 8.85 }, tags: { brand: 'Shell' } },
        { type: 'node', id: 33, lat: 49.43, lon: 8.95 },
      ],
    })
    expect(parsed).toEqual([
      { id: 11, lat: 49.41, lon: 8.75, name: 'Aral Nord', brand: 'Aral' },
      { id: 22, lat: 49.42, lon: 8.85, name: 'Shell', brand: 'Shell' },
      { id: 33, lat: 49.43, lon: 8.95, name: 'Tankstelle', brand: undefined },
    ])
  })
})
