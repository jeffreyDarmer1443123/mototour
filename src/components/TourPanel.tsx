import { useState } from 'react'
import { useApp, waypointLabel } from '../state/store'
import { formatDuration, formatKm } from '../utils/format'

const CURVINESS_LABELS = ['Schnell', 'Ausgewogen', 'Kurvig', 'Sehr kurvig'] as const

const TrashIcon = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </svg>
)

const FuelBadge = (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 20V6a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v14M3 20h11M13 10h2a1 1 0 0 1 1 1v4a1.5 1.5 0 0 0 3 0V8.5L17.5 6M6.5 8h4" />
  </svg>
)

export default function TourPanel() {
  const waypoints = useApp((s) => s.tour.waypoints)
  const options = useApp((s) => s.tour.options)
  const route = useApp((s) => s.route)
  const routeStatus = useApp((s) => s.routeStatus)
  const routeError = useApp((s) => s.routeError)
  const removeWaypoint = useApp((s) => s.removeWaypoint)
  const reorderWaypoint = useApp((s) => s.reorderWaypoint)
  const setOptions = useApp((s) => s.setOptions)
  const clearTour = useApp((s) => s.clearTour)
  const tourName = useApp((s) => s.tour.name)
  const setTourName = useApp((s) => s.setTourName)
  const setDrawerOpen = useApp((s) => s.setDrawerOpen)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  return (
    <section className="panel" aria-label="Tourplanung">
      <header className="panel-head">
        <button className="icon-btn" title="Meine Touren" onClick={() => setDrawerOpen(true)}>
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h10" />
          </svg>
        </button>
        <input
          className="tour-name"
          value={tourName}
          placeholder="Tourname"
          aria-label="Tourname"
          onChange={(e) => setTourName(e.target.value)}
        />
        {waypoints.length > 0 && (
          <button className="icon-btn" title="Tour leeren" onClick={clearTour}>
            {TrashIcon}
          </button>
        )}
      </header>

      {waypoints.length === 0 ? (
        <p className="panel-empty">
          Tippe auf die Karte, um deinen Start zu setzen. Jeder weitere Tipp verlängert die Tour.
        </p>
      ) : (
        <ol className="wp-list">
          {waypoints.map((wp, i) => (
            <li
              key={wp.id}
              className={'wp-row' + (overIndex === i && dragIndex !== i ? ' drag-over' : '')}
              draggable
              onDragStart={(e) => {
                setDragIndex(i)
                e.dataTransfer.effectAllowed = 'move'
              }}
              onDragOver={(e) => {
                e.preventDefault()
                setOverIndex(i)
              }}
              onDrop={() => {
                if (dragIndex !== null && dragIndex !== i) reorderWaypoint(dragIndex, i)
                setDragIndex(null)
                setOverIndex(null)
              }}
              onDragEnd={() => {
                setDragIndex(null)
                setOverIndex(null)
              }}
            >
              <span className="wp-grip" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                  <circle cx="9" cy="6" r="1.6" />
                  <circle cx="15" cy="6" r="1.6" />
                  <circle cx="9" cy="12" r="1.6" />
                  <circle cx="15" cy="12" r="1.6" />
                  <circle cx="9" cy="18" r="1.6" />
                  <circle cx="15" cy="18" r="1.6" />
                </svg>
              </span>
              <span
                className={
                  'wp-badge' +
                  (i === 0 ? ' is-start' : '') +
                  (i === waypoints.length - 1 && wp.kind !== 'fuel' ? ' is-end' : '') +
                  (wp.kind === 'fuel' ? ' is-fuel' : '')
                }
              >
                {wp.kind === 'fuel' ? FuelBadge : waypointLabel(i, waypoints.length, wp.kind)}
              </span>
              <span className="wp-name">
                {wp.name ?? `${wp.lat.toFixed(5)}, ${wp.lon.toFixed(5)}`}
              </span>
              <span className="wp-move">
                <button
                  className="icon-btn"
                  title="Nach oben"
                  disabled={i === 0}
                  onClick={() => reorderWaypoint(i, i - 1)}
                >
                  ↑
                </button>
                <button
                  className="icon-btn"
                  title="Nach unten"
                  disabled={i === waypoints.length - 1}
                  onClick={() => reorderWaypoint(i, i + 1)}
                >
                  ↓
                </button>
              </span>
              <button
                className="icon-btn wp-del"
                title="Wegpunkt entfernen"
                onClick={() => removeWaypoint(wp.id)}
              >
                ×
              </button>
            </li>
          ))}
        </ol>
      )}

      <div className="panel-opts">
        <div className="opt-block">
          <div className="opt-title-row">
            <span className="opt-title">Kurvigkeit</span>
            <span className="opt-value">{CURVINESS_LABELS[options.curviness]}</span>
          </div>
          <input
            className="curv-range"
            type="range"
            min={0}
            max={3}
            step={1}
            value={options.curviness}
            aria-label="Kurvigkeit"
            onChange={(e) =>
              setOptions({ curviness: Number(e.target.value) as 0 | 1 | 2 | 3 })
            }
          />
        </div>
        <label className="opt-switch">
          <input
            type="checkbox"
            checked={options.avoidHighways}
            onChange={(e) => setOptions({ avoidHighways: e.target.checked })}
          />
          <span className="switch-track" aria-hidden="true" />
          Autobahn vermeiden
        </label>
        <label className="opt-switch">
          <input
            type="checkbox"
            checked={options.avoidFerries}
            onChange={(e) => setOptions({ avoidFerries: e.target.checked })}
          />
          <span className="switch-track" aria-hidden="true" />
          Fähren vermeiden
        </label>
      </div>

      {(route || routeStatus !== 'idle') && (
        <footer className="panel-sum">
          {routeStatus === 'error' ? (
            <span className="sum-error">{routeError}</span>
          ) : route ? (
            <>
              <span className="sum-item">
                <strong>{formatKm(route.distanceKm)}</strong> km
              </span>
              <span className="sum-item">
                <strong>{formatDuration(route.durationMin)}</strong> h
              </span>
              {routeStatus === 'loading' && <span className="spinner" aria-label="Berechne Route" />}
            </>
          ) : (
            <span className="spinner" aria-label="Berechne Route" />
          )}
        </footer>
      )}
    </section>
  )
}
