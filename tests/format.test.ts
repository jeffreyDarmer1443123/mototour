import { describe, expect, test } from 'vitest'
import { formatDuration, formatKm } from '../src/utils/format'

describe('formatKm', () => {
  test('shows one decimal below 100 km', () => {
    expect(formatKm(12.44)).toBe('12,4')
  })
  test('rounds to whole km from 100 km up', () => {
    expect(formatKm(248.6)).toBe('249')
  })
})

describe('formatDuration', () => {
  test('formats minutes as h:mm', () => {
    expect(formatDuration(250)).toBe('4:10')
  })
  test('pads minutes below ten', () => {
    expect(formatDuration(65)).toBe('1:05')
  })
  test('shows plain minutes under one hour', () => {
    expect(formatDuration(42)).toBe('0:42')
  })
})
