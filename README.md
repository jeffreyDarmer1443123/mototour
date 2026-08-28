# MotoTour 🏍️

**Motorrad-Tourenplaner als PWA** — kurvige Routen planen, Tankstopps setzen, Touren per Link teilen. Läuft im Browser auf Handy und PC, installierbar als App.

**Live:** https://jeffreydarmer1443123.github.io/mototour/

## Features

- **Kurven-Routing** über das Valhalla-Motorradprofil: Regler von „Schnell" bis „Sehr kurvig", Autobahn und Fähren vermeidbar
- **Tourplanung** per Tipp auf die Karte, Ortssuche mit Autocomplete, Wegpunkte verschieben/sortieren, Via-Punkte durch Klick auf die Route
- **Tankstellen** im 2-km-Korridor entlang der Route, mit km-Position und Ein-Klick-Übernahme als Tankstopp
- **Touren speichern** lokal auf dem Gerät (automatisch), mit Tour-Verwaltung
- **Teilen ohne Server**: die komplette Tour steckt kompakt kodiert im Link
- **Export**: GPX (exakte Strecke, für Kurviger/Calimoto/Garmin), Google-Maps-Links (Etappen mit exakter Route oder reduzierter Einzel-Link), Apple-Maps-Link
- **PWA**: installierbar, App-Shell offline-fähig, Karten-Tiles werden gecacht

## Genutzte Dienste (alle kostenlos, ohne API-Schlüssel)

| Funktion | Dienst |
|---|---|
| Karte | [OpenStreetMap](https://www.openstreetmap.org) Standard-Tiles |
| Routing | [Valhalla](https://valhalla.openstreetmap.de) (FOSSGIS e.V.) |
| Ortssuche | [Photon](https://photon.komoot.io) (Komoot) |
| Tankstellen | [Overpass API](https://overpass-api.de) (OpenStreetMap) |

Bitte fair nutzen — das sind gemeinnützig betriebene Dienste.

## Entwicklung

```bash
npm install
npm run dev        # Dev-Server auf http://localhost:5173
npm test           # Unit-Tests (Vitest)
npm run build      # Typprüfung + Produktions-Build nach dist/
```

Stack: Vite · React · TypeScript · MapLibre GL · Zustand · vite-plugin-pwa

## Deployment

Jeder Push auf `main` baut und veröffentlicht die App automatisch über GitHub Actions auf GitHub Pages (siehe `.github/workflows/deploy.yml`).
