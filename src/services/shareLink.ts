import type { Tour, Waypoint } from '../types'

export class ShareLinkError extends Error {}

const VERSION = 1
const COORD_SCALE = 1e5
const MAX_NAME_BYTES = 120

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(text: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(text)) throw new ShareLinkError('Ungültiger Link.')
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/')
  let binary: string
  try {
    binary = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
  } catch {
    throw new ShareLinkError('Ungültiger Link.')
  }
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function pushString(out: number[], text: string) {
  const bytes = new TextEncoder().encode(text).slice(0, MAX_NAME_BYTES)
  out.push(bytes.length)
  for (const b of bytes) out.push(b)
}

function pushInt32(out: number[], value: number) {
  const v = value | 0
  out.push(v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >> 24) & 0xff)
}

export function encodeTourFragment(tour: Tour): string {
  const out: number[] = []
  out.push(VERSION)
  out.push(
    (tour.options.avoidHighways ? 1 : 0) |
      (tour.options.avoidFerries ? 2 : 0) |
      (tour.options.curviness << 2),
  )
  pushString(out, tour.name)
  out.push(Math.min(tour.waypoints.length, 255))
  for (const wp of tour.waypoints.slice(0, 255)) {
    pushInt32(out, Math.round(wp.lat * COORD_SCALE))
    pushInt32(out, Math.round(wp.lon * COORD_SCALE))
    out.push(wp.kind === 'fuel' ? 1 : 0)
    pushString(out, wp.name ?? '')
  }
  return base64UrlEncode(new Uint8Array(out))
}

class Reader {
  private offset = 0
  constructor(private bytes: Uint8Array) {}

  byte(): number {
    if (this.offset >= this.bytes.length) throw new ShareLinkError('Ungültiger Link.')
    return this.bytes[this.offset++]
  }

  int32(): number {
    const b0 = this.byte()
    const b1 = this.byte()
    const b2 = this.byte()
    const b3 = this.byte()
    return (b0 | (b1 << 8) | (b2 << 16) | (b3 << 24)) | 0
  }

  string(): string {
    const length = this.byte()
    if (this.offset + length > this.bytes.length) throw new ShareLinkError('Ungültiger Link.')
    const slice = this.bytes.slice(this.offset, this.offset + length)
    this.offset += length
    return new TextDecoder().decode(slice)
  }
}

export function decodeTourFragment(fragment: string): Tour {
  const reader = new Reader(base64UrlDecode(fragment))
  if (reader.byte() !== VERSION) throw new ShareLinkError('Dieser Link stammt aus einer neueren Version.')
  const flags = reader.byte()
  const name = reader.string()
  const count = reader.byte()
  const waypoints: Waypoint[] = []
  for (let i = 0; i < count; i++) {
    const lat = reader.int32() / COORD_SCALE
    const lon = reader.int32() / COORD_SCALE
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new ShareLinkError('Ungültiger Link.')
    const kind = reader.byte() === 1 ? 'fuel' : 'via'
    const wpName = reader.string()
    waypoints.push({
      id: crypto.randomUUID(),
      lat,
      lon,
      kind,
      name: wpName === '' ? undefined : wpName,
    })
  }
  return {
    id: crypto.randomUUID(),
    name: name === '' ? 'Geteilte Tour' : name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    waypoints,
    options: {
      avoidHighways: (flags & 1) !== 0,
      avoidFerries: (flags & 2) !== 0,
      curviness: ((flags >> 2) & 3) as 0 | 1 | 2 | 3,
    },
  }
}

export function tourShareUrl(tour: Tour): string {
  const base = `${location.origin}${location.pathname}`
  return `${base}#t=${encodeTourFragment(tour)}`
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as Record<string, unknown>).__share = { encodeTourFragment, decodeTourFragment, tourShareUrl }
}
