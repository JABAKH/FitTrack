export type VectorReading = {
  x: number;
  y: number;
  z: number;
  receivedAt: number;
};
export type SensorReadings = {
  accelerometer?: VectorReading;
  gyroscope?: VectorReading;
  barometer?: {
    pressure: number;
    relativeAltitude: number | null;
    receivedAt: number;
  };
  gps?: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
    altitude: number | null;
    altitudeAccuracy: number | null;
    speed: number | null;
    heading: number | null;
    receivedAt: number;
  };
};
export function sensorNumber(value: number | null | undefined, decimals = 2) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("es-MX", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    : "—";
}
