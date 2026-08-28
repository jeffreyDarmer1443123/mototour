export interface GeoResult {
  name: string
  label: string
  lat: number
  lon: number
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] }
  properties: {
    name?: string
    street?: string
    city?: string
    county?: string
    state?: string
    country?: string
    postcode?: string
  }
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<GeoResult[]> {
  const url = `https://photon.komoot.io/api?q=${encodeURIComponent(query)}&lang=de&limit=6`
  const res = await fetch(url, { signal })
  if (!res.ok) return []
  const json = (await res.json()) as { features?: PhotonFeature[] }
  const results: GeoResult[] = []
  const seen = new Set<string>()
  for (const f of json.features ?? []) {
    const p = f.properties
    const name = p.name ?? p.street ?? ''
    if (!name) continue
    const region = [p.city ?? p.county, p.state, p.country === 'Deutschland' ? undefined : p.country]
      .filter(Boolean)
      .join(', ')
    const key = `${name}|${region}`
    if (seen.has(key)) continue
    seen.add(key)
    results.push({
      name,
      label: region,
      lon: f.geometry.coordinates[0],
      lat: f.geometry.coordinates[1],
    })
  }
  return results
}
