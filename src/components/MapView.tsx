import { useEffect, useRef, useState } from 'react'
import { Map as MapLibreMap, Marker, NavigationControl, Popup } from 'maplibre-gl'
import type { GeoJSONSource, MapGeoJSONFeature } from 'maplibre-gl'
import type { Feature, FeatureCollection, Point } from 'geojson'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useApp, waypointLabel } from '../state/store'
import { mapHandle } from '../state/mapHandle'
import { insertionIndexForPoint } from '../utils/geo'

export const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'

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

export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markersRef = useRef<Marker[]>([])
  const [ready, setReady] = useState(false)

  const waypoints = useApp((s) => s.tour.waypoints)
  const route = useApp((s) => s.route)
  const fuelStations = useApp((s) => s.fuelStations)
  const addWaypoint = useApp((s) => s.addWaypoint)
  const updateWaypoint = useApp((s) => s.updateWaypoint)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [10.45, 51.16],
      zoom: 5.5,
      attributionControl: { compact: true },
    })
    map.addControl(new NavigationControl({ showCompass: false }), 'bottom-right')
    map.on('load', () => setReady(true))
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

  return <div ref={containerRef} className="map-root" />
}
