export function encodePolyline(points: [number, number][], precision: number): string {
  const factor = Math.pow(10, precision)
  let out = ''
  let prevLat = 0
  let prevLon = 0
  for (const [lat, lon] of points) {
    const latE = Math.round(lat * factor)
    const lonE = Math.round(lon * factor)
    for (const delta of [latE - prevLat, lonE - prevLon]) {
      let value = delta < 0 ? ~(delta << 1) : delta << 1
      while (value >= 0x20) {
        out += String.fromCharCode((0x20 | (value & 0x1f)) + 63)
        value >>= 5
      }
      out += String.fromCharCode(value + 63)
    }
    prevLat = latE
    prevLon = lonE
  }
  return out
}
