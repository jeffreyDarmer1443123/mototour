import { useEffect, useRef, useState } from 'react'
import { searchPlaces, type GeoResult } from '../services/geocoding'
import { flyTo } from '../state/mapHandle'
import { useApp } from '../state/store'

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeoResult[]>([])
  const [open, setOpen] = useState(false)
  const addWaypoint = useApp((s) => s.addWaypoint)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 3) {
      setResults([])
      setOpen(false)
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const found = await searchPlaces(q, controller.signal)
        setResults(found)
        setOpen(found.length > 0)
      } catch {
        /* abgebrochen oder offline – Dropdown einfach zulassen */
      }
    }, 300)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [])

  const pick = (r: GeoResult) => {
    addWaypoint(r.lat, r.lon, { name: r.name })
    flyTo(r.lon, r.lat)
    setQuery('')
    setResults([])
    setOpen(false)
  }

  return (
    <div className="search" ref={boxRef}>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        type="search"
        placeholder="Ort suchen und als Stopp hinzufügen"
        value={query}
        aria-label="Ortssuche"
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && results.length > 0) pick(results[0])
          if (e.key === 'Escape') setOpen(false)
        }}
      />
      {open && (
        <ul className="search-results">
          {results.map((r, i) => (
            <li key={`${r.lat}-${r.lon}-${i}`}>
              <button onClick={() => pick(r)}>
                <span className="sr-name">{r.name}</span>
                {r.label && <span className="sr-label">{r.label}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
