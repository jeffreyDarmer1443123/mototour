export function formatKm(km: number): string {
  if (km < 100) return km.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  return String(Math.round(km))
}

export function formatDuration(minutes: number): string {
  const total = Math.round(minutes)
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${h}:${String(m).padStart(2, '0')}`
}
