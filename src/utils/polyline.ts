export function decodePolyline(encoded: string, precision: number): [number, number][] {
  const factor = Math.pow(10, precision)
  const points: [number, number][] = []
  let lat = 0
  let lon = 0
  let i = 0

  while (i < encoded.length) {
    for (const which of [0, 1]) {
      let value = 0
      let shift = 0
      let byte
      do {
        byte = encoded.charCodeAt(i++) - 63
        value |= (byte & 0x1f) << shift
        shift += 5
      } while (byte >= 0x20)
      const delta = value & 1 ? ~(value >> 1) : value >> 1
      if (which === 0) lat += delta
      else lon += delta
    }
    points.push([lat / factor, lon / factor])
  }
  return points
}
