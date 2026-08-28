import { describe, expect, test } from 'vitest'
import { haversineKm, insertionIndexForPoint, nearestCoordinateIndex } from '../src/utils/geo'
import type { RouteResult } from '../src/types'

describe('haversineKm', () => {
  test('measures the Berlin-Hamburg distance to within a kilometre', () => {
    const d = haversineKm([13.405, 52.52], [9.9937, 53.5511])
    expect(d).toBeGreaterThan(254)
    expect(d).toBeLessThan(256)
  })

  test('returns zero for identical points', () => {
    expect(haversineKm([8.7, 49.4], [8.7, 49.4])).toBe(0)
  })
})

describe('nearestCoordinateIndex', () => {
  const coords: [number, number][] = [
    [8.7, 49.4],
    [8.8, 49.45],
    [8.9, 49.5],
    [9.0, 49.55],
  ]
  test('finds the closest vertex to a probe point', () => {
    expect(nearestCoordinateIndex(coords, [8.81, 49.46])).toBe(1)
    expect(nearestCoordinateIndex(coords, [9.0, 49.55])).toBe(3)
  })
})

describe('insertionIndexForPoint', () => {
  const route: RouteResult = {
    coordinates: [
      [8.7, 49.4],
      [8.75, 49.42],
      [8.8, 49.45],
      [8.85, 49.47],
      [8.9, 49.5],
    ],
    distanceKm: 30,
    durationMin: 40,
    legs: [
      { distanceKm: 15, durationMin: 20, endCoordinateIndex: 2 },
      { distanceKm: 15, durationMin: 20, endCoordinateIndex: 4 },
    ],
  }

  test('a click on the first leg inserts after waypoint 0', () => {
    expect(insertionIndexForPoint(route, [8.75, 49.42])).toBe(1)
  })

  test('a click on the second leg inserts after waypoint 1', () => {
    expect(insertionIndexForPoint(route, [8.86, 49.475])).toBe(2)
  })
})
