import { useState } from 'react'
import { buildGpx, gpxFileName } from '../services/gpx'
import { appleMapsLink, googleMapsSingleLink, googleMapsStageLinks } from '../services/mapsExport'
import { tourShareUrl } from '../services/shareLink'
import { useApp } from '../state/store'

type GoogleMode = 'stages' | 'single'

export default function ExportDialog() {
  const open = useApp((s) => s.exportOpen)
  const setExportOpen = useApp((s) => s.setExportOpen)
  const tour = useApp((s) => s.tour)
  const route = useApp((s) => s.route)
  const [copied, setCopied] = useState(false)
  const [googleMode, setGoogleMode] = useState<GoogleMode>('stages')

  if (!open) return null
  const close = () => setExportOpen(false)

  const shareUrl = tourShareUrl(tour)
  const stageLinks = googleMapsStageLinks(tour.waypoints)
  const singleLink = googleMapsSingleLink(tour.waypoints)
  const appleLink = appleMapsLink(tour.waypoints)
  const reduced = tour.waypoints.length - 2 > 9

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* Clipboard verweigert – Nutzer kann den Link markieren */
    }
  }

  const webShare = () => {
    navigator.share?.({ title: `MotoTour: ${tour.name}`, url: shareUrl }).catch(() => undefined)
  }

  const downloadGpx = () => {
    const blob = new Blob([buildGpx(tour, route)], { type: 'application/gpx+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = gpxFileName(tour)
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="modal-backdrop" onClick={close}>
      <div className="modal" role="dialog" aria-label="Teilen und exportieren" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>Teilen & Export</h2>
          <button className="icon-btn" title="Schließen" onClick={close}>
            ×
          </button>
        </header>

        <section className="exp-section">
          <h3>Mit Freunden teilen</h3>
          <div className="exp-row">
            <input className="exp-url" readOnly value={shareUrl} onFocus={(e) => e.target.select()} aria-label="Share-Link" />
            <button className="exp-btn" onClick={copyLink}>
              {copied ? 'Kopiert ✓' : 'Kopieren'}
            </button>
            {typeof navigator.share === 'function' && (
              <button className="exp-btn" onClick={webShare}>
                Teilen…
              </button>
            )}
          </div>
          <p className="exp-hint">Wer den Link öffnet, sieht sofort deine komplette Tour.</p>
        </section>

        <section className="exp-section">
          <h3>GPX-Datei</h3>
          <div className="exp-row">
            <button className="exp-btn is-primary" onClick={downloadGpx}>
              GPX herunterladen
            </button>
          </div>
          <p className="exp-hint">
            Für Navis und Apps wie Kurviger, Calimoto oder Garmin – enthält die exakte Strecke.
          </p>
        </section>

        <section className="exp-section">
          <h3>Google Maps</h3>
          <div className="exp-tabs">
            <button
              className={'exp-tab' + (googleMode === 'stages' ? ' is-active' : '')}
              onClick={() => setGoogleMode('stages')}
            >
              Etappen-Links
            </button>
            <button
              className={'exp-tab' + (googleMode === 'single' ? ' is-active' : '')}
              onClick={() => setGoogleMode('single')}
            >
              Ein Link
            </button>
          </div>
          {googleMode === 'stages' ? (
            <>
              <div className="exp-row exp-wrap">
                {stageLinks.map((link, i) => (
                  <a key={link} className="exp-btn" href={link} target="_blank" rel="noopener noreferrer">
                    {stageLinks.length === 1 ? 'In Google Maps öffnen' : `Etappe ${i + 1}`}
                  </a>
                ))}
              </div>
              <p className="exp-hint">
                {stageLinks.length === 1
                  ? 'Alle Stopps passen in einen Link – die Route bleibt exakt erhalten.'
                  : `Google erlaubt max. 9 Zwischenstopps pro Link, daher ${stageLinks.length} Etappen. Unterwegs einfach den nächsten Link öffnen.`}
              </p>
            </>
          ) : (
            <>
              <div className="exp-row">
                <a className="exp-btn" href={singleLink} target="_blank" rel="noopener noreferrer">
                  In Google Maps öffnen
                </a>
              </div>
              <p className="exp-hint">
                {reduced
                  ? 'Auf 9 Zwischenstopps reduziert – Google kann dazwischen anders routen als geplant.'
                  : 'Alle Stopps passen in einen Link.'}
              </p>
            </>
          )}
        </section>

        <section className="exp-section">
          <h3>Apple Maps</h3>
          <div className="exp-row">
            <a className="exp-btn" href={appleLink} target="_blank" rel="noopener noreferrer">
              In Apple Maps öffnen
            </a>
          </div>
          <p className="exp-hint">
            Apple Maps übernimmt nur Start und Ziel. Für die exakte Strecke nutze die GPX-Datei.
          </p>
        </section>
      </div>
    </div>
  )
}
