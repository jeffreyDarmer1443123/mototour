import type { Map as MapLibreMap } from 'maplibre-gl'

export const mapHandle: { current: MapLibreMap | null } = { current: null }

if (import.meta.env.DEV) {
  ;(window as unknown as Record<string, unknown>).__mapHandle = mapHandle
}

export function flyTo(lon: number, lat: number, zoom?: number) {
  const map = mapHandle.current
  if (!map) return
  map.flyTo({ center: [lon, lat], zoom: zoom ?? Math.max(map.getZoom(), 11), duration: 1200 })
}
