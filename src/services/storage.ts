import type { Tour } from '../types'

const TOURS_KEY = 'mototour.tours.v1'
const ACTIVE_KEY = 'mototour.activeTour.v1'

function defaultStorage(): Storage {
  return window.localStorage
}

function readAll(storage: Storage): Record<string, Tour> {
  try {
    const raw = storage.getItem(TOURS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, Tour>
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

function writeAll(tours: Record<string, Tour>, storage: Storage) {
  storage.setItem(TOURS_KEY, JSON.stringify(tours))
}

export function saveTour(tour: Tour, storage: Storage = defaultStorage()) {
  const all = readAll(storage)
  all[tour.id] = tour
  writeAll(all, storage)
}

export function loadTour(id: string, storage: Storage = defaultStorage()): Tour | null {
  return readAll(storage)[id] ?? null
}

export function deleteTour(id: string, storage: Storage = defaultStorage()) {
  const all = readAll(storage)
  delete all[id]
  writeAll(all, storage)
}

export function listTours(storage: Storage = defaultStorage()): Tour[] {
  return Object.values(readAll(storage)).sort((a, b) => b.updatedAt - a.updatedAt)
}

export function setActiveTourId(id: string, storage: Storage = defaultStorage()) {
  storage.setItem(ACTIVE_KEY, id)
}

export function getActiveTourId(storage: Storage = defaultStorage()): string | null {
  return storage.getItem(ACTIVE_KEY)
}
