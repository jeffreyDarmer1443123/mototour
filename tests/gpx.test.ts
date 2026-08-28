import { describe, expect, test } from 'vitest'
import { buildGpx } from '../src/services/gpx'
import type { RouteResult, Tour } from '../src/types'

const tour: Tour = {
  id: 't',
  name: 'Spessart & Rhön <Runde>',
  createdAt: 0,
  updatedAt: 0,
  waypoints: [
    { id: 'a', lat: 49.4077, lon: 8.6908, name: 'Start "Heidelberg"', kind: 'via' },
    { id: 'b', lat: 49.44, lon: 8.8, kind: 'fuel' },
    { id: 'c', lat: 49.4665, lon: 8.9908, name: 'Eberbach', kind: 'via' },
  ],
  options: { curviness: 2, avoidHighways: false, avoidFerries: false },
}

const route: RouteResult = {
  coordinates: [
    [8.6908, 49.4077],
    [8.75, 49.42],
    [8.9908, 49.4665],
  ],
  distanceKm: 31,
  durationMin: 40,
  legs: [{ distanceKm: 31, durationMin: 40, endCoordinateIndex: 2 }],
}

describe('buildGpx', () => {
  const gpx = buildGpx(tour, route)

  test('is a GPX 1.1 document with escaped tour name', () => {
    expect(gpx).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(gpx).toContain('version="1.1"')
    expect(gpx).toContain('creator="MotoTour"')
    expect(gpx).toContain('Spessart &amp; Rhön &lt;Runde&gt;')
  })

  test('contains one wpt per waypoint with escaped names', () => {
    expect(gpx.match(/<wpt /g)?.length).toBe(3)
    expect(gpx).toContain('Start &quot;Heidelberg&quot;')
    expect(gpx).toContain('lat="49.407700"')
    expect(gpx).toContain('lon="8.690800"')
  })

  test('marks fuel stops with a symbol', () => {
    expect(gpx).toContain('<sym>Gas Station</sym>')
  })

  test('contains the full track geometry', () => {
    expect(gpx.match(/<trkpt /g)?.length).toBe(3)
    expect(gpx).toContain('<trkpt lat="49.420000" lon="8.750000"')
  })
})
