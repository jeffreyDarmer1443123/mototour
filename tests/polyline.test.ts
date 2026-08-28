import { describe, expect, test } from 'vitest'
import { decodePolyline } from '../src/utils/polyline'
import { encodePolyline } from './helpers/encode'

describe('decodePolyline', () => {
  test('decodes the documented precision-5 example', () => {
    const points = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@', 5)
    expect(points).toEqual([
      [38.5, -120.2],
      [40.7, -120.95],
      [43.252, -126.453],
    ])
  })

  test('round-trips precision-6 coordinates (Valhalla shape format)', () => {
    const original: [number, number][] = [
      [49.412345, 8.687654],
      [49.412401, 8.688011],
      [49.413876, 8.690345],
      [49.410002, 8.685],
    ]
    const decoded = decodePolyline(encodePolyline(original, 6), 6)
    expect(decoded.length).toBe(original.length)
    for (let i = 0; i < original.length; i++) {
      expect(decoded[i][0]).toBeCloseTo(original[i][0], 6)
      expect(decoded[i][1]).toBeCloseTo(original[i][1], 6)
    }
  })

  test('returns an empty array for an empty string', () => {
    expect(decodePolyline('', 6)).toEqual([])
  })
})
