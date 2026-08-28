import type { RouteResult, Tour } from '../types'

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const coord = (v: number) => v.toFixed(6)

export function buildGpx(tour: Tour, route: RouteResult | null): string {
  const lines: string[] = []
  lines.push('<?xml version="1.0" encoding="UTF-8"?>')
  lines.push(
    '<gpx version="1.1" creator="MotoTour" xmlns="http://www.topografix.com/GPX/1/1">',
  )
  lines.push(`  <metadata><name>${escapeXml(tour.name)}</name></metadata>`)
  for (const wp of tour.waypoints) {
    lines.push(`  <wpt lat="${coord(wp.lat)}" lon="${coord(wp.lon)}">`)
    if (wp.name) lines.push(`    <name>${escapeXml(wp.name)}</name>`)
    if (wp.kind === 'fuel') lines.push('    <sym>Gas Station</sym>')
    lines.push('  </wpt>')
  }
  if (route && route.coordinates.length > 0) {
    lines.push(`  <trk><name>${escapeXml(tour.name)}</name><trkseg>`)
    for (const [lon, lat] of route.coordinates) {
      lines.push(`    <trkpt lat="${coord(lat)}" lon="${coord(lon)}"/>`)
    }
    lines.push('  </trkseg></trk>')
  }
  lines.push('</gpx>')
  return lines.join('\n')
}

export function gpxFileName(tour: Tour): string {
  const safe = tour.name.replace(/[^\wäöüÄÖÜß -]+/g, '').trim().replace(/\s+/g, '-') || 'tour'
  return `${safe}.gpx`
}
