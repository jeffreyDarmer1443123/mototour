import { describe, expect, test } from 'vitest'
import { appleMapsLink, googleMapsSingleLink, googleMapsStageLinks } from '../src/services/mapsExport'
import type { Waypoint } from '../src/types'

const wp = (i: number): Waypoint => ({
  id: String(i),
  lat: 49 + i * 0.01,
  lon: 8 + i * 0.01,
  kind: 'via',
})

const many = (n: number) => Array.from({ length: n }, (_, i) => wp(i))

function params(url: string): URLSearchParams {
  return new URL(url).searchParams
}

describe('googleMapsStageLinks', () => {
  test('a short tour becomes a single link without waypoints', () => {
    const links = googleMapsStageLinks(many(2))
    expect(links.length).toBe(1)
    const p = params(links[0])
    expect(p.get('api')).toBe('1')
    expect(p.get('travelmode')).toBe('driving')
    expect(p.get('origin')).toBe('49.00000,8.00000')
    expect(p.get('destination')).toBe('49.01000,8.01000')
    expect(p.get('waypoints')).toBeNull()
  })

  test('intermediate stops appear pipe-separated', () => {
    const p = params(googleMapsStageLinks(many(4))[0])
    expect(p.get('waypoints')).toBe('49.01000,8.01000|49.02000,8.02000')
  })

  test('12 stops split into two stages that connect seamlessly', () => {
    const links = googleMapsStageLinks(many(12))
    expect(links.length).toBe(2)
    const p1 = params(links[0])
    const p2 = params(links[1])
    expect(p1.get('waypoints')?.split('|').length).toBe(9)
    expect(p2.get('origin')).toBe(p1.get('destination'))
    expect(p2.get('destination')).toBe('49.11000,8.11000')
  })

  test('every stage stays within the 9-waypoint limit', () => {
    for (const link of googleMapsStageLinks(many(40))) {
      const w = params(link).get('waypoints')
      if (w) expect(w.split('|').length).toBeLessThanOrEqual(9)
    }
  })
})

describe('googleMapsSingleLink', () => {
  test('keeps all stops when they fit', () => {
    const p = params(googleMapsSingleLink(many(5)))
    expect(p.get('waypoints')?.split('|').length).toBe(3)
  })

  test('reduces to at most 9 evenly spread stops', () => {
    const p = params(googleMapsSingleLink(many(30)))
    const vias = p.get('waypoints')!.split('|')
    expect(vias.length).toBe(9)
    expect(p.get('origin')).toBe('49.00000,8.00000')
    expect(p.get('destination')).toBe('49.29000,8.29000')
  })
})

describe('appleMapsLink', () => {
  test('links start and destination with driving mode', () => {
    const url = appleMapsLink(many(3))
    const p = params(url)
    expect(url.startsWith('https://maps.apple.com/')).toBe(true)
    expect(p.get('saddr')).toBe('49.00000,8.00000')
    expect(p.get('daddr')).toBe('49.02000,8.02000')
    expect(p.get('dirflg')).toBe('d')
  })
})
