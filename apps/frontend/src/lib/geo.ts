// ─── Geographic Utilities ─────────────────────────────────
// Convert lat/lng to 3D coordinates on a sphere

const DEG_TO_RAD = Math.PI / 180;

export function latLngToVector3(
  lat: number,
  lng: number,
  radius: number
): [number, number, number] {
  const phi = (90 - lat) * DEG_TO_RAD;
  const theta = (lng + 180) * DEG_TO_RAD;

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  return [x, y, z];
}

export function getArcMidpoint(
  srcLat: number,
  srcLng: number,
  tgtLat: number,
  tgtLng: number,
  radius: number,
  altitude: number
): [number, number, number] {
  const midLat = (srcLat + tgtLat) / 2;
  const midLng = (srcLng + tgtLng) / 2;

  // Calculate great circle distance for altitude scaling
  const dist = greatCircleDistance(srcLat, srcLng, tgtLat, tgtLng);
  const scaledAlt = altitude * (dist / 180);

  return latLngToVector3(midLat, midLng, radius + scaledAlt);
}

export function greatCircleDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLng = (lng2 - lng1) * DEG_TO_RAD;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG_TO_RAD) *
      Math.cos(lat2 * DEG_TO_RAD) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return c * (180 / Math.PI); // Return in degrees
}
