import { describe, expect, test } from 'vitest'
import { buildRouteRequest, parseRouteResponse } from '../src/services/routing'
import type { TourOptions, Waypoint } from '../src/types'
import { encodePolyline } from './helpers/encode'

const wp = (id: string, lat: number, lon: number): Waypoint => ({ id, lat, lon, kind: 'via' })

const opts = (over: Partial<TourOptions> = {}): TourOptions => ({
  curviness: 2,
  avoidHighways: false,
  avoidFerries: false,
  ...over,
})

describe('buildRouteRequest', () => {
  test('maps waypoints in order to break locations with motorcycle costing', () => {
    const req = buildRouteRequest([wp('a', 49.4, 8.7), wp('b', 49.5, 8.9)], opts())
    expect(req.costing).toBe('motorcycle')
    expect(req.locations).toEqual([
      { lat: 49.4, lon: 8.7, type: 'break' },
      { lat: 49.5, lon: 8.9, type: 'break' },
    ])
    expect(req.units).toBe('kilometers')
    expect(req.language).toBe('de-DE')
  })

  test('curviness 0 prefers highways, curviness 3 avoids them and seeks small roads', () => {
    const fast = buildRouteRequest([wp('a', 49, 8), wp('b', 50, 9)], opts({ curviness: 0 }))
    const curvy = buildRouteRequest([wp('a', 49, 8), wp('b', 50, 9)], opts({ curviness: 3 }))
    const fastMc = fast.costing_options.motorcycle
    const curvyMc = curvy.costing_options.motorcycle
    expect(fastMc.use_highways).toBeGreaterThan(curvyMc.use_highways)
    expect(curvyMc.use_highways).toBe(0)
    expect(curvyMc.use_trails).toBeGreaterThan(fastMc.use_trails)
  })

  test('avoidHighways forces use_highways to 0 even at curviness 0', () => {
    const req = buildRouteRequest(
      [wp('a', 49, 8), wp('b', 50, 9)],
      opts({ curviness: 0, avoidHighways: true }),
    )
    expect(req.costing_options.motorcycle.use_highways).toBe(0)
  })

  test('avoidFerries sets use_ferry to 0 and is otherwise absent', () => {
    const withFerry = buildRouteRequest([wp('a', 49, 8), wp('b', 50, 9)], opts())
    const noFerry = buildRouteRequest(
      [wp('a', 49, 8), wp('b', 50, 9)],
      opts({ avoidFerries: true }),
    )
    expect(withFerry.costing_options.motorcycle.use_ferry).toBeUndefined()
    expect(noFerry.costing_options.motorcycle.use_ferry).toBe(0)
  })
})

describe('parseRouteResponse', () => {
  const legA: [number, number][] = [
    [49.4, 8.7],
    [49.45, 8.75],
    [49.5, 8.8],
  ]
  const legB: [number, number][] = [
    [49.5, 8.8],
    [49.55, 8.9],
  ]
  const response = {
    trip: {
      legs: [
        { shape: encodePolyline(legA, 6), summary: { length: 12.4, time: 900 } },
        { shape: encodePolyline(legB, 6), summary: { length: 8.1, time: 600 } },
      ],
      summary: { length: 20.5, time: 1500 },
    },
  }

  test('concatenates leg shapes into lon/lat coordinates without duplicate joints', () => {
    const result = parseRouteResponse(response)
    expect(result.coordinates[0]).toEqual([8.7, 49.4])
    expect(result.coordinates.length).toBe(4)
    expect(result.coordinates[3]).toEqual([8.9, 49.55])
  })

  test('sums distance and duration from the trip summary', () => {
    const result = parseRouteResponse(response)
    expect(result.distanceKm).toBeCloseTo(20.5)
    expect(result.durationMin).toBeCloseTo(25)
    expect(result.legs).toEqual([
      { distanceKm: 12.4, durationMin: 15 },
      { distanceKm: 8.1, durationMin: 10 },
    ])
  })
})
