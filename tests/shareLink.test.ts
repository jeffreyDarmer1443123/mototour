import { describe, expect, test } from 'vitest'
import { decodeTourFragment, encodeTourFragment, ShareLinkError } from '../src/services/shareLink'
import type { Tour } from '../src/types'

const tour: Tour = {
  id: 'orig-id',
  name: 'Schwarzwald-Runde über Höllental',
  createdAt: 1700000000000,
  updatedAt: 1700000100000,
  waypoints: [
    { id: 'a', lat: 47.99609, lon: 7.84941, name: 'Freiburg', kind: 'via' },
    { id: 'b', lat: 47.9059, lon: 8.03422, name: 'Hinterzarten', kind: 'fuel' },
    { id: 'c', lat: 47.86541, lon: 8.34073, kind: 'via' },
  ],
  options: { curviness: 3, avoidHighways: true, avoidFerries: false },
}

describe('encodeTourFragment / decodeTourFragment', () => {
  test('round-trips name, options, coordinates, kinds and waypoint names', () => {
    const decoded = decodeTourFragment(encodeTourFragment(tour))
    expect(decoded.name).toBe(tour.name)
    expect(decoded.options).toEqual(tour.options)
    expect(decoded.waypoints.length).toBe(3)
    decoded.waypoints.forEach((wp, i) => {
      expect(wp.lat).toBeCloseTo(tour.waypoints[i].lat, 5)
      expect(wp.lon).toBeCloseTo(tour.waypoints[i].lon, 5)
      expect(wp.kind).toBe(tour.waypoints[i].kind)
      expect(wp.name).toBe(tour.waypoints[i].name)
    })
  })

  test('gives the decoded tour a fresh identity', () => {
    const decoded = decodeTourFragment(encodeTourFragment(tour))
    expect(decoded.id).not.toBe(tour.id)
    expect(decoded.waypoints[0].id).not.toBe('a')
  })

  test('produces a URL-safe fragment', () => {
    const fragment = encodeTourFragment(tour)
    expect(fragment).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  test('stays compact for a 50-stop tour', () => {
    const big: Tour = {
      ...tour,
      waypoints: Array.from({ length: 50 }, (_, i) => ({
        id: String(i),
        lat: 47 + i * 0.01,
        lon: 8 + i * 0.01,
        kind: 'via' as const,
      })),
    }
    expect(encodeTourFragment(big).length).toBeLessThan(1000)
  })

  test('rejects garbage input', () => {
    expect(() => decodeTourFragment('nicht-gueltig!!')).toThrow(ShareLinkError)
    expect(() => decodeTourFragment('AAAA')).toThrow(ShareLinkError)
  })
})
