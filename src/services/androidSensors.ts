import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";
import type { SensorReadings } from "../lib/sensors";
type NativeSensors = {
  start: (id: string) => Promise<void>;
  stop: () => Promise<void>;
  snapshot: () => Promise<string | null>;
};
export type AndroidSnapshot = SensorReadings & {
  sessionId: string;
  running: boolean;
  heartbeat: number;
  steps: number | null;
  available: {
    accelerometer: boolean;
    gyroscope: boolean;
    barometer: boolean;
    steps: boolean;
  };
};
const native =
  Platform.OS === "android"
    ? requireOptionalNativeModule<NativeSensors>("FitTrackSensors")
    : null;
export const androidSensorsAvailable = () => !!native;
export async function startAndroidSensors(id: string) {
  if (native) await native.start(id);
}
export async function stopAndroidSensors() {
  if (native) await native.stop();
}
export async function readAndroidSensors(
  id: string,
): Promise<AndroidSnapshot | null> {
  if (!native) return null;
  const raw = await native.snapshot();
  if (!raw) return null;
  const value: AndroidSnapshot = JSON.parse(raw);
  return value.sessionId === id ? value : null;
}
