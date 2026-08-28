import { describe, expect, test } from 'vitest'
import { deleteTour, listTours, loadTour, saveTour } from '../src/services/storage'
import type { Tour } from '../src/types'

function fakeStorage(): Storage {
  const map = new Map<string, string>()
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: () => null,
    get length() {
      return map.size
    },
  } as Storage
}

const makeTour = (id: string, name: string, updatedAt: number): Tour => ({
  id,
  name,
  createdAt: updatedAt,
  updatedAt,
  waypoints: [{ id: 'w', lat: 49, lon: 8, kind: 'via' }],
  options: { curviness: 2, avoidHighways: false, avoidFerries: false },
})

describe('tour storage', () => {
  test('saves and loads a tour by id', () => {
    const storage = fakeStorage()
    saveTour(makeTour('t1', 'Odenwald', 100), storage)
    expect(loadTour('t1', storage)?.name).toBe('Odenwald')
    expect(loadTour('missing', storage)).toBeNull()
  })

  test('lists tours newest first', () => {
    const storage = fakeStorage()
    saveTour(makeTour('alt', 'Alte Tour', 100), storage)
    saveTour(makeTour('neu', 'Neue Tour', 200), storage)
    expect(listTours(storage).map((t) => t.id)).toEqual(['neu', 'alt'])
  })

  test('overwrites a tour with the same id', () => {
    const storage = fakeStorage()
    saveTour(makeTour('t1', 'Vorher', 100), storage)
    saveTour(makeTour('t1', 'Nachher', 200), storage)
    expect(listTours(storage).length).toBe(1)
    expect(loadTour('t1', storage)?.name).toBe('Nachher')
  })

  test('deletes a tour', () => {
    const storage = fakeStorage()
    saveTour(makeTour('t1', 'Weg damit', 100), storage)
    deleteTour('t1', storage)
    expect(listTours(storage)).toEqual([])
  })

  test('survives corrupted storage content', () => {
    const storage = fakeStorage()
    storage.setItem('mototour.tours.v1', '{kaputt')
    expect(listTours(storage)).toEqual([])
    saveTour(makeTour('t1', 'Frisch', 100), storage)
    expect(listTours(storage).length).toBe(1)
  })
})
