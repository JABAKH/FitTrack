import { distanceMeters } from "./domain";
export type RoutePoint = {
  latitude: number;
  longitude: number;
  timestamp: number;
};
export type Fix = {
  timestamp: number;
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
    altitude: number | null;
    altitudeAccuracy: number | null;
    speed: number | null;
    heading: number | null;
  };
};
export function appendFixes(
  route: RoutePoint[],
  distance: number,
  fixes: Fix[],
  startTime: number,
) {
  const next = [...route];
  let meters = distance;
  for (const fix of [...fixes].sort((a, b) => a.timestamp - b.timestamp)) {
    const c = fix.coords;
    if (
      !Number.isFinite(fix.timestamp) ||
      fix.timestamp < startTime ||
      c.accuracy === null ||
      !Number.isFinite(c.accuracy) ||
      c.accuracy > 50 ||
      c.accuracy < 0 ||
      !Number.isFinite(c.latitude) ||
      !Number.isFinite(c.longitude) ||
      Math.abs(c.latitude) > 90 ||
      Math.abs(c.longitude) > 180
    )
      continue;
    const point = {
      latitude: c.latitude,
      longitude: c.longitude,
      timestamp: fix.timestamp,
    };
    const previous = next.at(-1);
    if (previous) {
      const elapsed = (point.timestamp - previous.timestamp) / 1000,
        delta = distanceMeters(previous, point);
      if (elapsed <= 0 || delta / elapsed > 15) continue;
      meters += delta;
    }
    next.push(point);
  }
  return { route: next, distance: meters };
}
