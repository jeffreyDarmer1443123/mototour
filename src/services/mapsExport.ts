import type { Waypoint } from '../types'

const MAX_GOOGLE_VIAS = 9

const point = (wp: Waypoint) => `${wp.lat.toFixed(5)},${wp.lon.toFixed(5)}`

function googleLink(origin: Waypoint, vias: Waypoint[], destination: Waypoint): string {
  const params = new URLSearchParams({
    api: '1',
    origin: point(origin),
    destination: point(destination),
    travelmode: 'driving',
  })
  if (vias.length > 0) params.set('waypoints', vias.map(point).join('|'))
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

export function googleMapsStageLinks(waypoints: Waypoint[]): string[] {
  if (waypoints.length < 2) return []
  const links: string[] = []
  let start = 0
  while (start < waypoints.length - 1) {
    const end = Math.min(start + MAX_GOOGLE_VIAS + 1, waypoints.length - 1)
    links.push(googleLink(waypoints[start], waypoints.slice(start + 1, end), waypoints[end]))
    start = end
  }
  return links
}

export function googleMapsSingleLink(waypoints: Waypoint[]): string {
  if (waypoints.length < 2) return ''
  const middle = waypoints.slice(1, -1)
  let vias = middle
  if (middle.length > MAX_GOOGLE_VIAS) {
    vias = []
    for (let i = 0; i < MAX_GOOGLE_VIAS; i++) {
      const index = Math.round(((i + 1) * middle.length) / (MAX_GOOGLE_VIAS + 1)) - 1
      vias.push(middle[Math.max(0, Math.min(middle.length - 1, index))])
    }
  }
  return googleLink(waypoints[0], vias, waypoints[waypoints.length - 1])
}

export function appleMapsLink(waypoints: Waypoint[]): string {
  if (waypoints.length < 2) return ''
  const params = new URLSearchParams({
    saddr: point(waypoints[0]),
    daddr: point(waypoints[waypoints.length - 1]),
    dirflg: 'd',
  })
  return `https://maps.apple.com/?${params.toString()}`
}
