import { useEffect, useState } from 'react'
import { deleteTour, listTours, saveTour } from '../services/storage'
import { useApp } from '../state/store'
import type { Tour } from '../types'

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default function TourListDrawer() {
  const open = useApp((s) => s.drawerOpen)
  const setDrawerOpen = useApp((s) => s.setDrawerOpen)
  const activeTourId = useApp((s) => s.tour.id)
  const setTour = useApp((s) => s.setTour)
  const clearTour = useApp((s) => s.clearTour)
  const [tours, setTours] = useState<Tour[]>([])
  const [confirmId, setConfirmId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    try {
      setTours(listTours())
    } catch {
      setTours([])
    }
    setConfirmId(null)
  }, [open])

  if (!open) return null

  const openTour = (tour: Tour) => {
    setTour(tour)
    setDrawerOpen(false)
  }

  const duplicate = (tour: Tour) => {
    const copy: Tour = {
      ...tour,
      id: crypto.randomUUID(),
      name: `${tour.name} (Kopie)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      waypoints: tour.waypoints.map((w) => ({ ...w, id: crypto.randomUUID() })),
    }
    saveTour(copy)
    setTours(listTours())
  }

  const remove = (id: string) => {
    deleteTour(id)
    setTours(listTours())
    setConfirmId(null)
  }

  return (
    <>
      <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)} />
      <aside className="drawer" aria-label="Gespeicherte Touren">
        <header className="drawer-head">
          <h2>Meine Touren</h2>
          <button className="icon-btn" title="Schließen" onClick={() => setDrawerOpen(false)}>
            ×
          </button>
        </header>
        <button
          className="drawer-new"
          onClick={() => {
            clearTour()
            setDrawerOpen(false)
          }}
        >
          + Neue Tour beginnen
        </button>
        {tours.length === 0 ? (
          <p className="drawer-empty">
            Noch keine gespeicherten Touren. Setze Wegpunkte auf der Karte – deine Tour wird
            automatisch gespeichert.
          </p>
        ) : (
          <ul className="drawer-list">
            {tours.map((t) => (
              <li key={t.id} className={'drawer-row' + (t.id === activeTourId ? ' is-active' : '')}>
                {confirmId === t.id ? (
                  <div className="drawer-confirm">
                    <span>Tour löschen?</span>
                    <button className="danger" onClick={() => remove(t.id)}>
                      Löschen
                    </button>
                    <button onClick={() => setConfirmId(null)}>Behalten</button>
                  </div>
                ) : (
                  <>
                    <button className="drawer-open" onClick={() => openTour(t)}>
                      <span className="drawer-name">{t.name}</span>
                      <span className="drawer-meta">
                        {t.waypoints.length} Stopps · {formatDate(t.updatedAt)}
                      </span>
                    </button>
                    <button className="icon-btn" title="Duplizieren" onClick={() => duplicate(t)}>
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="9" y="9" width="12" height="12" rx="2" />
                        <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                      </svg>
                    </button>
                    <button className="icon-btn" title="Löschen" onClick={() => setConfirmId(t.id)}>
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      </svg>
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </aside>
    </>
  )
}
