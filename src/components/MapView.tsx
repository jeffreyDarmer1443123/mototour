import { useEffect, useRef, useState } from 'react'
import { Map as MapLibreMap, Marker, NavigationControl, Popup } from 'maplibre-gl'
import type { GeoJSONSource, MapGeoJSONFeature, StyleSpecification } from 'maplibre-gl'
import type { Feature, FeatureCollection, Point } from 'geojson'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useApp, waypointLabel } from '../state/store'
import { mapHandle } from '../state/mapHandle'
import { insertionIndexForPoint } from '../utils/geo'

export const MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
}

const ROUTE_SOURCE = 'route'
const FUEL_SVG =
  '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V6a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v14"/><path d="M3 20h11"/><path d="M13 10h2a1 1 0 0 1 1 1v4a1.5 1.5 0 0 0 3 0V8.5L17.5 6"/><path d="M6.5 8h4"/></svg>'

function routeGeoJSON(coordinates: [number, number][]): Feature {
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates },
  }
}

const FUEL_SOURCE = 'fuel'

function showFuelPopup(map: MapLibreMap, feature: MapGeoJSONFeature) {
  const props = feature.properties as { name?: string; brand?: string; kmAlong?: number }
  const [lon, lat] = (feature.geometry as Point).coordinates
  const el = document.createElement('div')
  el.className = 'fuel-pop'
  const title = document.createElement('strong')
  title.textContent = props.name ?? 'Tankstelle'
  const sub = document.createElement('span')
  sub.textContent = `bei km ${Math.round(props.kmAlong ?? 0)} deiner Tour`
  const btn = document.createElement('button')
  btn.textContent = 'Als Tankstopp einfügen'
  el.append(title, sub, btn)
  const popup = new Popup({ offset: 12, closeButton: false }).setLngLat([lon, lat]).setDOMContent(el).addTo(map)
  btn.addEventListener('click', () => {
    const state = useApp.getState()
    if (!state.route) return
    state.addWaypoint(lat, lon, {
      kind: 'fuel',
      name: props.name ?? 'Tankstelle',
      index: insertionIndexForPoint(state.route, [lon, lat]),
    })
    popup.remove()
  })
}

function detectWebglIssue(): string | null {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    if (!gl) return 'Dein Browser unterstützt kein WebGL. Die Karte kann so nicht angezeigt werden.'
    ;(gl as WebGLRenderingContext).getExtension('WEBGL_lose_context')?.loseContext()
    return null
  } catch {
    return 'WebGL konnte nicht gestartet werden. Die Karte kann so nicht angezeigt werden.'
  }
}

export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markersRef = useRef<Marker[]>([])
  const [ready, setReady] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)

  const waypoints = useApp((s) => s.tour.waypoints)
  const route = useApp((s) => s.route)
  const fuelStations = useApp((s) => s.fuelStations)
  const addWaypoint = useApp((s) => s.addWaypoint)
  const updateWaypoint = useApp((s) => s.updateWaypoint)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const webglIssue = detectWebglIssue()
    if (webglIssue) {
      setMapError(webglIssue)
      return
    }

    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [10.45, 51.16],
      zoom: 5.5,
      attributionControl: { compact: true },
    })
    map.addControl(new NavigationControl({ showCompass: false }), 'bottom-right')

    let becameReady = false
    let loadTimeout: ReturnType<typeof setTimeout> | null = null
    const markReady = () => {
      if (becameReady || !map.isStyleLoaded()) return
      becameReady = true
      if (loadTimeout) clearTimeout(loadTimeout)
      setReady(true)
      setMapError(null)
    }
    map.on('load', markReady)
    map.on('styledata', markReady)
    map.on('error', (e) => {
      const message = e.error?.message ?? String(e.error ?? 'Unbekannter Fehler')
      console.error('MapLibre error:', message)
      // Nach dem ersten erfolgreichen Laden sind einzelne Kachel-Fehler normal
      // (z. B. beim schnellen Schwenken) und rechtfertigen keine Fehlermeldung.
      if (!becameReady) setMapError(`Karte konnte nicht geladen werden: ${message}`)
    })
    const canvas = map.getCanvas()
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault()
      becameReady = false
      setReady(false)
      setMapError('Die Kartendarstellung wurde unterbrochen (WebGL-Kontext verloren). Versuche die Seite neu zu laden.')
    })
    canvas.addEventListener('webglcontextrestored', () => {
      setMapError(null)
      map.setStyle(MAP_STYLE)
    })
    loadTimeout = setTimeout(() => {
      if (!becameReady) {
        setMapError('Die Karte lädt ungewöhnlich lange. Prüfe deine Internetverbindung oder lade die Seite neu.')
      }
    }, 12000)
    map.on('click', (e) => {
      const state = useApp.getState()
      const { x, y } = e.point
      const bbox: [[number, number], [number, number]] = [
        [x - 6, y - 6],
        [x + 6, y + 6],
      ]
      if (map.getLayer('fuel-circles') !== undefined) {
        const fuelHits = map.queryRenderedFeatures(bbox, { layers: ['fuel-circles'] })
        if (fuelHits.length > 0) {
          showFuelPopup(map, fuelHits[0])
          return
        }
      }
      const hasRouteLayer = map.getLayer('route-line') !== undefined
      if (state.route && hasRouteLayer) {
        const hits = map.queryRenderedFeatures(bbox, { layers: ['route-line', 'route-casing'] })
        if (hits.length > 0) {
          const index = insertionIndexForPoint(state.route, [e.lngLat.lng, e.lngLat.lat])
          state.addWaypoint(e.lngLat.lat, e.lngLat.lng, { index })
          return
        }
      }
      state.addWaypoint(e.lngLat.lat, e.lngLat.lng)
    })
    map.on('mousemove', (e) => {
      const layers = ['route-line', 'fuel-circles'].filter((l) => map.getLayer(l) !== undefined)
      if (layers.length === 0) return
      const hits = map.queryRenderedFeatures(
        [
          [e.point.x - 6, e.point.y - 6],
          [e.point.x + 6, e.point.y + 6],
        ],
        { layers },
      )
      const overFuel = hits.some((h) => h.layer.id === 'fuel-circles')
      map.getCanvas().style.cursor = overFuel ? 'pointer' : hits.length > 0 ? 'copy' : ''
    })
    mapRef.current = map
    mapHandle.current = map

    return () => {
      if (loadTimeout) clearTimeout(loadTimeout)
      map.remove()
      mapRef.current = null
      mapHandle.current = null
      setReady(false)
    }
  }, [addWaypoint])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    const source = map.getSource<GeoJSONSource>(ROUTE_SOURCE)
    const data = routeGeoJSON(route?.coordinates ?? [])
    if (source) {
      source.setData(data)
      return
    }
    map.addSource(ROUTE_SOURCE, { type: 'geojson', data })
    const firstSymbol = map.getStyle().layers?.find((l) => l.type === 'symbol')?.id
    map.addLayer(
      {
        id: 'route-casing',
        type: 'line',
        source: ROUTE_SOURCE,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#ffffff', 'line-width': 8, 'line-opacity': 0.9 },
      },
      firstSymbol,
    )
    map.addLayer(
      {
        id: 'route-line',
        type: 'line',
        source: ROUTE_SOURCE,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#e8541d', 'line-width': 4.5 },
      },
      firstSymbol,
    )
  }, [route, ready])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    const data: FeatureCollection = {
      type: 'FeatureCollection',
      features: fuelStations.map((s) => ({
        type: 'Feature',
        properties: { name: s.name, brand: s.brand, kmAlong: s.kmAlong },
        geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
      })),
    }
    const source = map.getSource<GeoJSONSource>(FUEL_SOURCE)
    if (source) {
      source.setData(data)
      return
    }
    map.addSource(FUEL_SOURCE, { type: 'geojson', data })
    map.addLayer({
      id: 'fuel-circles',
      type: 'circle',
      source: FUEL_SOURCE,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 4, 12, 8],
        'circle-color': '#d98a12',
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2,
      },
    })
  }, [fuelStations, ready])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    for (const marker of markersRef.current) marker.remove()
    markersRef.current = waypoints.map((wp, i) => {
      const el = document.createElement('div')
      el.className = 'wp-marker'
      if (i === 0) el.classList.add('is-start')
      else if (i === waypoints.length - 1 && wp.kind !== 'fuel') el.classList.add('is-end')
      if (wp.kind === 'fuel') el.classList.add('is-fuel')
      if (wp.kind === 'fuel') el.innerHTML = FUEL_SVG
      else el.textContent = waypointLabel(i, waypoints.length, wp.kind)
      el.title = wp.name ?? ''
      const marker = new Marker({ element: el, draggable: true })
        .setLngLat([wp.lon, wp.lat])
        .addTo(map)
      marker.on('dragend', () => {
        const pos = marker.getLngLat()
        updateWaypoint(wp.id, { lat: pos.lat, lon: pos.lng, name: undefined })
      })
      return marker
    })
  }, [waypoints, updateWaypoint])

  return (
    <>
      <div ref={containerRef} className="map-root" />
      {mapError && (
        <div className="map-error-banner" role="alert">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            <path d="M12 9v4M12 17h.01" />
          </svg>
          <span>{mapError}</span>
        </div>
      )}
    </>
  )
}
