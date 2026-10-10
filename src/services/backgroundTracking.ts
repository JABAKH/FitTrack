import { stopAndroidSensors } from "./androidSensors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";
import { appendFixes, type Fix, type RoutePoint } from "../lib/backgroundRoute";
export const LOCATION_TASK = "fittrack-active-route-v1";
const KEY = "fittrack-active-route-v1";
export type BackgroundSession = {
  id: string;
  userId: string;
  kind: "walk" | "run";
  startTime: number;
  route: RoutePoint[];
  distance: number;
  gps?: Fix;
  error?: string;
};
let queue: Promise<unknown> = Promise.resolve();
function serialized<T>(fn: () => Promise<T>): Promise<T> {
  const result = queue.then(fn);
  queue = result.catch(() => {});
  return result;
}
export async function readBackgroundSession(): Promise<BackgroundSession | null> {
  await queue;
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
}
export function saveBackgroundSession(value: BackgroundSession) {
  return serialized(() => AsyncStorage.setItem(KEY, JSON.stringify(value)));
}
export function clearBackgroundSession(id: string) {
  return serialized(async () => {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw && JSON.parse(raw).id === id) await AsyncStorage.removeItem(KEY);
  });
}
export const saveBackgroundSteps = (id: string, steps: number | null) =>
  AsyncStorage.setItem("fittrack-route-steps:" + id, JSON.stringify(steps));
export async function readBackgroundSteps(id: string): Promise<number | null> {
  const raw = await AsyncStorage.getItem("fittrack-route-steps:" + id);
  return raw ? JSON.parse(raw) : null;
}
export const clearBackgroundSteps = (id: string) =>
  AsyncStorage.removeItem("fittrack-route-steps:" + id);
export async function backgroundAvailable() {
  return (
    Platform.OS !== "web" &&
    Constants.executionEnvironment !== ExecutionEnvironment.StoreClient &&
    (await TaskManager.isAvailableAsync())
  );
}
export async function startBackgroundLocation() {
  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    distanceInterval: 5,
    timeInterval: 2000,
    activityType: Location.ActivityType.Fitness,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: "FitTrack · actividad en curso",
      notificationBody: "Registrando tu ruta. Abre FitTrack para finalizar.",
      notificationColor: "#00E5A0",
      killServiceOnDestroy: true,
    },
  });
}
export async function stopBackgroundLocation() {
  if (
    (await backgroundAvailable()) &&
    (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK))
  )
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
}
export async function hasBackgroundLocation() {
  return (
    (await backgroundAvailable()) &&
    (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK))
  );
}
if (Platform.OS !== "web" && !TaskManager.isTaskDefined(LOCATION_TASK))
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(
    LOCATION_TASK,
    async ({ data, error }) => {
      await serialized(async () => {
        const raw = await AsyncStorage.getItem(KEY);
        if (!raw) return;
        const state: BackgroundSession = JSON.parse(raw);
        if (error) {
          state.error = "El sistema interrumpió el GPS: " + error.message;
        } else if (data?.locations?.length) {
          const result = appendFixes(
            state.route,
            state.distance,
            data.locations,
            state.startTime,
          );
          state.route = result.route;
          state.distance = result.distance;
          const latest = [...data.locations].sort(
            (a, b) => b.timestamp - a.timestamp,
          )[0];
          if (
            latest.timestamp >= state.startTime &&
            (!state.gps || latest.timestamp > state.gps.timestamp)
          )
            state.gps = latest;
          delete state.error;
        }
        await AsyncStorage.setItem(KEY, JSON.stringify(state));
      });
    },
  );

export async function finishBackgroundSession() {
  await stopAndroidSensors();
  await stopBackgroundLocation();
  const state = await readBackgroundSession();
  if (!state) return;
  const steps = await readBackgroundSteps(state.id);
  const endedAt = Date.now();
  await AsyncStorage.setItem(
    "activity-draft:" + state.userId,
    JSON.stringify({
      id: state.id,
      kind: state.kind,
      started_at: new Date(state.startTime).toISOString(),
      ended_at: new Date(endedAt).toISOString(),
      duration_seconds: Math.max(
        0,
        Math.floor((endedAt - state.startTime) / 1000),
      ),
      distance_m: Math.round(state.distance),
      steps,
      route: state.route,
    }),
  );
  await clearBackgroundSession(state.id);
  await clearBackgroundSteps(state.id);
}
