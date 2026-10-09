export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function numberValue(value: string, min = 0, max = 100000) {
  const n = Number(value.replace(",", "."));
  if (!value.trim() || !Number.isFinite(n) || n < min || n > max)
    throw new Error(`Ingresa un número entre ${min} y ${max}.`);
  return n;
}
export function distanceMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad,
    dLon = (b.longitude - a.longitude) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * rad) *
      Math.cos(b.latitude * rad) *
      Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
export function estimatedCalories(
  weight: number,
  height: number,
  age: number,
  sex: string,
) {
  return Math.round(
    (10 * weight + 6.25 * height - 5 * age + (sex === "male" ? 5 : -161)) * 1.4,
  );
}
export function streak(days: string[], now = new Date()) {
  const set = new Set(days);
  let cursor = new Date(now),
    count = 0;
  if (!set.has(localDay(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (set.has(localDay(cursor))) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}
