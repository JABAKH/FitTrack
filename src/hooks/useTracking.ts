import * as Notifications from "expo-notifications";
import {
  androidSensorsAvailable,
  startAndroidSensors,
  stopAndroidSensors,
  readAndroidSensors,
} from "../services/androidSensors";
import {
  backgroundAvailable,
  saveBackgroundSession,
  readBackgroundSession,
  clearBackgroundSession,
  startBackgroundLocation,
  stopBackgroundLocation,
  hasBackgroundLocation,
  saveBackgroundSteps,
  readBackgroundSteps,
  clearBackgroundSteps,
} from "../services/backgroundTracking";
import type { SensorReadings } from "../lib/sensors";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform, Alert } from "react-native";
import { Accelerometer, Gyroscope, Barometer, Pedometer } from "expo-sensors";
import * as Location from "expo-location";
import * as Crypto from "expo-crypto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { distanceMeters, localDay } from "../lib/domain";
import { db } from "../lib/supabase";
import { useAuth } from "../providers";
import { useQueryClient } from "@tanstack/react-query";
import { notifyStepGoal } from "../services/notifications";
type Point = { latitude: number; longitude: number; timestamp: number };
type Draft = {
  id: string;
  kind: "walk" | "run";
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  distance_m: number;
  steps: number | null;
  route: Point[];
};
export function useTracking() {
  const { session } = useAuth(),
    cache = useQueryClient(),
    uid = session?.user.id;
  const [status, setStatus] = useState<Record<string, string>>({}),
    [running, setRunning] = useState(false),
    [backgroundEnabled, setBackgroundEnabled] = useState(false),
    [seconds, setSeconds] = useState(0),
    [distance, setDistance] = useState(0),
    [steps, setSteps] = useState<number | null>(null),
    [error, setError] = useState<unknown>(null),
    [draft, setDraft] = useState<Draft | null>(null),
    [busy, setBusy] = useState(false),
    [liveRoute, setLiveRoute] = useState<Point[]>([]),
    [readings, setReadings] = useState<SensorReadings>({});
  const stopping = useRef(false);
  const backgroundRef = useRef(false),
    stepOffset = useRef(0),
    lastWatcherSteps = useRef(0);
  const active = useRef(false),
    kind = useRef<"walk" | "run">("walk"),
    startTime = useRef(0),
    route = useRef<Point[]>([]),
    meters = useRef(0),
    count = useRef<number | null>(null),
    id = useRef(""),
    subs = useRef<{ remove: () => void }[]>([]);
  const cleanup = useCallback(() => {
    subs.current.forEach((s) => s.remove());
    subs.current = [];
  }, []);
  const probe = useCallback(async () => {
    const results = await Promise.allSettled([
      Accelerometer.isAvailableAsync(),
      Gyroscope.isAvailableAsync(),
      Barometer.isAvailableAsync(),
      Pedometer.isAvailableAsync(),
      Location.hasServicesEnabledAsync(),
    ]);
    const names = [
      "Acelerómetro",
      "Giroscopio",
      "Barómetro",
      "Podómetro",
      "GPS",
    ];
    const next: Record<string, string> = {};
    results.forEach((r, i) => {
      next[names[i]] =
        r.status === "fulfilled" && r.value ? "Disponible" : "No disponible";
    });
    setStatus(next);
  }, []);
  useEffect(() => {
    // Sensor availability is resolved asynchronously; this effect subscribes to external hardware.
    void Promise.resolve().then(probe).catch(setError);
    if (uid)
      void AsyncStorage.getItem(`activity-draft:${uid}`)
        .then((raw) => {
          if (raw) setDraft(JSON.parse(raw));
        })
        .catch(setError);
    return cleanup;
  }, [uid, probe, cleanup]);
  const restoreBackground = useCallback(async () => {
    const value = await readBackgroundSession();
    if (!value || value.userId !== uid) return;
    id.current = value.id;
    kind.current = value.kind;
    startTime.current = value.startTime;
    route.current = value.route;
    meters.current = value.distance;
    setLiveRoute(value.route);
    setDistance(value.distance);
    setSeconds(Math.floor((Date.now() - value.startTime) / 1000));
    if (value.gps)
      setReadings((previous) => ({
        ...previous,
        gps: { ...value.gps!.coords, receivedAt: value.gps!.timestamp },
      }));
    const native = await readAndroidSensors(value.id);
    if (native) {
      count.current = native.steps;
      setSteps(native.steps);
      setReadings((previous) => ({
        ...previous,
        ...(native.accelerometer
          ? { accelerometer: native.accelerometer }
          : {}),
        ...(native.gyroscope ? { gyroscope: native.gyroscope } : {}),
        ...(native.barometer ? { barometer: native.barometer } : {}),
      }));
      const live = native.running && Date.now() - native.heartbeat < 10000;
      setStatus((previous) => ({
        ...previous,
        Acelerómetro: !native.available.accelerometer
          ? "No disponible"
          : live
            ? "Activo · servicio Android"
            : "Servicio detenido",
        Giroscopio: !native.available.gyroscope
          ? "No disponible"
          : live
            ? "Activo · servicio Android"
            : "Servicio detenido",
        Barómetro: !native.available.barometer
          ? "No disponible"
          : live
            ? "Activo · servicio Android"
            : "Servicio detenido",
        Podómetro: !native.available.steps
          ? "No disponible"
          : live
            ? "Activo · segundo plano"
            : "Servicio detenido",
      }));
      await saveBackgroundSteps(value.id, native.steps);
    }
    if (value.error) {
      setError(new Error(value.error));
      setStatus((previous) => ({
        ...previous,
        GPS: "Interrumpido por el sistema",
      }));
    } else if (value.gps)
      setStatus((previous) => ({
        ...previous,
        GPS:
          value.gps!.coords.accuracy === null ||
          value.gps!.coords.accuracy! > 50
            ? "Activo · señal imprecisa"
            : "Activo · segundo plano",
      }));
  }, [uid]);
  const reconcileSteps = useCallback(async () => {
    if (Platform.OS !== "ios" || count.current === null || !startTime.current)
      return;
    try {
      const result = await Pedometer.getStepCountAsync(
        new Date(startTime.current),
        new Date(),
      );
      count.current = Math.max(count.current, result.steps);
      stepOffset.current = Math.max(
        0,
        count.current - lastWatcherSteps.current,
      );
      setSteps(count.current);
      if (backgroundRef.current)
        await saveBackgroundSteps(id.current, count.current);
    } catch {
      setStatus((previous) => ({
        ...previous,
        Podómetro: "No se pudieron recuperar los pasos en segundo plano",
      }));
    }
  }, []);
  useEffect(() => {
    let alive = true;
    void (async () => {
      const value = await readBackgroundSession();
      if (!value || !alive) return;
      if (value.userId !== uid) {
        await stopBackgroundLocation();
        await clearBackgroundSession(value.id);
        return;
      }
      await restoreBackground();
      count.current = androidSensorsAvailable()
        ? ((await readAndroidSensors(value.id))?.steps ?? null)
        : await readBackgroundSteps(value.id);
      setSteps(count.current);
      if (await hasBackgroundLocation()) {
        active.current = true;
        backgroundRef.current = true;
        setBackgroundEnabled(true);
        setRunning(true);
        setStatus((previous) => ({
          ...previous,
          GPS: "Activo · segundo plano",
          Podómetro:
            Platform.OS === "ios"
              ? "Recuperando pasos de la sesión"
              : "Lectura en primer plano",
        }));
        await reconcileSteps();
      } else {
        const lastTime = value.gps?.timestamp ?? value.startTime;
        const pending: Draft = {
          id: value.id,
          kind: value.kind,
          started_at: new Date(value.startTime).toISOString(),
          ended_at: new Date(lastTime).toISOString(),
          duration_seconds: Math.max(
            0,
            Math.floor((lastTime - value.startTime) / 1000),
          ),
          distance_m: Math.round(value.distance),
          steps: count.current,
          route: value.route,
        };
        await AsyncStorage.setItem(
          "activity-draft:" + uid,
          JSON.stringify(pending),
        );
        setDraft(pending);
        await clearBackgroundSession(value.id);
        await clearBackgroundSteps(value.id);
        setError(
          new Error(
            "El sistema detuvo el seguimiento. Tu recorrido quedó pendiente de guardar.",
          ),
        );
      }
    })().catch(setError);
    return () => {
      alive = false;
    };
  }, [uid, restoreBackground, reconcileSteps]);
  useEffect(() => {
    if (!running || !backgroundEnabled) return;
    const timer = setInterval(() => {
      if (AppState.currentState === "active")
        void restoreBackground().catch(setError);
    }, 2000);
    return () => clearInterval(timer);
  }, [running, backgroundEnabled, restoreBackground]);
  const buildDraft = useCallback((): Draft => {
    return {
      id: id.current,
      kind: kind.current,
      started_at: new Date(startTime.current).toISOString(),
      ended_at: new Date().toISOString(),
      duration_seconds: Math.floor((Date.now() - startTime.current) / 1000),
      distance_m: Math.round(meters.current),
      steps: count.current,
      route: route.current,
    };
  }, []);
  const stop = useCallback(async () => {
    if (!active.current || stopping.current) return;
    stopping.current = true;
    try {
      if (backgroundRef.current) {
        await stopAndroidSensors();
        await stopBackgroundLocation();
        await restoreBackground();
      }
      await reconcileSteps();
      active.current = false;
      cleanup();
      setRunning(false);
      setStatus((s) =>
        Object.fromEntries(
          Object.entries(s).map(([k, v]) => [
            k,
            v.startsWith("Activo") ? "Detenido" : v,
          ]),
        ),
      );
      const value = buildDraft();
      setSeconds(value.duration_seconds);
      setDraft(value);
      if (uid)
        await AsyncStorage.setItem(
          `activity-draft:${uid}`,
          JSON.stringify(value),
        );
      if (backgroundRef.current) {
        await clearBackgroundSession(id.current);
        await clearBackgroundSteps(id.current);
      }
      backgroundRef.current = false;
      setBackgroundEnabled(false);
    } finally {
      stopping.current = false;
    }
  }, [uid, cleanup, buildDraft, restoreBackground, reconcileSteps]);
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) => {
      if (!active.current) return;
      if (state === "active" && backgroundRef.current) {
        void restoreBackground()
          .then(reconcileSteps)
          .then(() =>
            setStatus((previous) => ({
              ...previous,
              GPS: "Activo · segundo plano",
              Podómetro:
                count.current === null
                  ? previous.Podómetro
                  : Platform.OS === "ios"
                    ? "Activo · pasos recuperados"
                    : "Lectura en primer plano",
            })),
          )
          .catch(setError);
      } else if (
        state !== "active" &&
        backgroundRef.current &&
        androidSensorsAvailable()
      ) {
        setStatus((previous) => ({
          ...previous,
          GPS: "Activo · segundo plano",
        }));
      } else if (state !== "active" && backgroundRef.current) {
        setStatus((previous) => ({
          ...previous,
          Acelerómetro: "Pausado por el sistema",
          Giroscopio: "Pausado por el sistema",
          Barómetro: "Pausado por el sistema",
          Podómetro:
            Platform.OS === "ios"
              ? "Se recuperará al volver"
              : "Pausado · primer plano",
          GPS: "Activo · segundo plano",
        }));
      } else if (state !== "active") void stop().catch(setError);
    });
    return () => listener.remove();
  }, [uid, stop, restoreBackground, reconcileSteps]);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(
      () => setSeconds(Math.floor((Date.now() - startTime.current) / 1000)),
      1000,
    );
    return () => clearInterval(timer);
  }, [running]);
  async function start(activityKind: "walk" | "run") {
    if (active.current || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (draft)
        throw new Error("Guarda la actividad pendiente antes de iniciar otra.");
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted)
        throw new Error(
          "Se necesita permiso de ubicación para registrar la ruta.",
        );
      let useBackground = false;
      if (await backgroundAvailable()) {
        if (Platform.OS === "android") {
          await Notifications.requestPermissionsAsync();
          const existing = await Location.getBackgroundPermissionsAsync();
          if (!existing.granted) {
            const accepted = await new Promise<boolean>((resolve) =>
              Alert.alert(
                "Registrar con pantalla bloqueada",
                "Permite ubicación todo el tiempo para continuar tu ruta. Android puede abrir Ajustes. Verás una notificación mientras el entrenamiento esté activo.",
                [
                  {
                    text: "Cancelar inicio",
                    onPress: () => resolve(false),
                  },
                  { text: "Continuar", onPress: () => resolve(true) },
                ],
                { cancelable: false },
              ),
            );
            if (!accepted)
              throw new Error(
                "Para el registro en segundo plano, permite ubicación todo el tiempo. Vuelve a iniciar cuando estés listo.",
              );
          }
        }
        const backgroundPermission =
          await Location.requestBackgroundPermissionsAsync();
        useBackground = backgroundPermission.granted;
      }
      setBackgroundEnabled(useBackground);
      backgroundRef.current = useBackground;
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      if (current.coords.accuracy === null || current.coords.accuracy > 50)
        throw new Error("GPS impreciso. Sal al exterior y vuelve a intentar.");
      setReadings({
        gps: { ...current.coords, receivedAt: current.timestamp },
      });
      setStatus((previous) => ({ ...previous, GPS: "Activo" }));
      kind.current = activityKind;
      id.current = Crypto.randomUUID();
      startTime.current = Date.now();
      meters.current = 0;
      route.current = [
        {
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
          timestamp: current.timestamp,
        },
      ];
      setLiveRoute([...route.current]);
      count.current = null;
      stepOffset.current = 0;
      lastWatcherSteps.current = 0;
      setDistance(0);
      setSteps(null);
      setSeconds(0);
      for (const [label, sensor] of [
        ["Acelerómetro", Accelerometer],
        ["Giroscopio", Gyroscope],
        ["Barómetro", Barometer],
      ] as const) {
        try {
          if (!(await sensor.isAvailableAsync())) {
            setStatus((previous) => ({
              ...previous,
              [label]: "No disponible",
            }));
            continue;
          }
          const permission = await sensor.requestPermissionsAsync();
          if (!permission.granted) {
            setStatus((previous) => ({
              ...previous,
              [label]: "Permiso denegado",
            }));
            continue;
          }
          sensor.setUpdateInterval(1000);
          setStatus((previous) => ({
            ...previous,
            [label]: "Esperando lectura",
          }));
          if (label === "Barómetro") {
            subs.current.push(
              Barometer.addListener((data) => {
                setReadings((previous) => ({
                  ...previous,
                  barometer: {
                    pressure: data.pressure,
                    relativeAltitude:
                      typeof data.relativeAltitude === "number"
                        ? data.relativeAltitude
                        : null,
                    receivedAt: Date.now(),
                  },
                }));
                setStatus((previous) =>
                  previous[label] === "Activo"
                    ? previous
                    : { ...previous, [label]: "Activo" },
                );
              }),
            );
          } else {
            const key =
              label === "Acelerómetro" ? "accelerometer" : "gyroscope";
            const motion = label === "Acelerómetro" ? Accelerometer : Gyroscope;
            subs.current.push(
              motion.addListener((data) => {
                setReadings((previous) => ({
                  ...previous,
                  [key]: {
                    x: data.x,
                    y: data.y,
                    z: data.z,
                    receivedAt: Date.now(),
                  },
                }));
                setStatus((previous) =>
                  previous[label] === "Activo"
                    ? previous
                    : { ...previous, [label]: "Activo" },
                );
              }),
            );
          }
        } catch {
          setStatus((previous) => ({
            ...previous,
            [label]: "No se pudo leer",
          }));
        }
      }
      if (await Pedometer.isAvailableAsync()) {
        const p = await Pedometer.requestPermissionsAsync();
        if (p.granted) {
          count.current = 0;
          setSteps(0);
          setStatus((s) => ({ ...s, Podómetro: "Activo" }));
          if (!androidSensorsAvailable() || !useBackground)
            subs.current.push(
              Pedometer.watchStepCount(({ steps: n }) => {
                lastWatcherSteps.current = n;
                count.current = Math.max(
                  count.current ?? 0,
                  n + stepOffset.current,
                );
                setSteps(count.current);
                if (backgroundRef.current)
                  void saveBackgroundSteps(id.current, count.current).catch(
                    setError,
                  );
              }),
            );
        } else setStatus((s) => ({ ...s, Podómetro: "Permiso denegado" }));
      }
      if (useBackground && uid) {
        await saveBackgroundSession({
          id: id.current,
          userId: uid,
          kind: kind.current,
          startTime: startTime.current,
          route: route.current,
          distance: 0,
          gps: current,
        });
        await saveBackgroundSteps(id.current, count.current);
        await startBackgroundLocation();
        await startAndroidSensors(id.current);
        setStatus((previous) => ({
          ...previous,
          GPS: "Activo · segundo plano",
        }));
      } else
        subs.current.push(
          await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              distanceInterval: 5,
              timeInterval: 2000,
            },
            (p) => {
              if (!active.current) return;
              setReadings((previous) => ({
                ...previous,
                gps: { ...p.coords, receivedAt: p.timestamp },
              }));
              setStatus((previous) => ({
                ...previous,
                GPS:
                  p.coords.accuracy === null || p.coords.accuracy > 50
                    ? "Activo · señal imprecisa"
                    : "Activo",
              }));
              if (
                !active.current ||
                p.coords.accuracy === null ||
                p.coords.accuracy > 50
              )
                return;
              const point = {
                  latitude: p.coords.latitude,
                  longitude: p.coords.longitude,
                  timestamp: p.timestamp,
                },
                prev = route.current.at(-1);
              if (prev) {
                const delta = distanceMeters(prev, point),
                  elapsed = (point.timestamp - prev.timestamp) / 1000;
                if (elapsed <= 0 || delta / elapsed > 15) return;
                meters.current += delta;
              }
              route.current.push(point);
              setLiveRoute([...route.current]);
              setDistance(meters.current);
              setStatus((s) => ({ ...s, GPS: "Activo" }));
            },
          ),
        );
      active.current = true;
      setRunning(true);
    } catch (e) {
      if (backgroundRef.current) {
        await stopAndroidSensors().catch(() => {});
        await stopBackgroundLocation().catch(() => {});
        await clearBackgroundSession(id.current).catch(() => {});
      }
      backgroundRef.current = false;
      setBackgroundEnabled(false);
      cleanup();
      setStatus((previous) =>
        Object.fromEntries(
          Object.entries(previous).map(([name, state]) => [
            name,
            state.startsWith("Activo") || state === "Esperando lectura"
              ? "Detenido"
              : state,
          ]),
        ),
      );
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  async function persist(weight: number) {
    if (!draft || !uid) return;
    setBusy(true);
    setError(null);
    try {
      const day = localDay(new Date(draft.started_at));
      const { error } = await db().rpc("record_activity", {
        p_activity: {
          ...draft,
          day,
          step_source:
            draft.steps === null
              ? null
              : Platform.OS === "ios"
                ? "ios-pedometer"
                : "android-session",
          calories: Math.round(
            (draft.distance_m / 1000) *
              weight *
              (draft.kind === "run" ? 1 : 0.5),
          ),
        },
      });
      if (error) throw error;
      await AsyncStorage.removeItem(`activity-draft:${uid}`);
      setDraft(null);
      await cache.invalidateQueries({ queryKey: ["activities"] });
      await cache.invalidateQueries({ queryKey: ["daily_steps"] });
      const { data } = await db()
        .from("daily_steps")
        .select("steps")
        .eq("user_id", uid)
        .eq("day", day)
        .maybeSingle();
      if (data) await notifyStepGoal(uid, day, data.steps);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return {
    readings,
    backgroundEnabled,
    route: draft?.route ?? liveRoute,
    status,
    running,
    seconds,
    distance,
    steps: draft?.steps ?? steps,
    error,
    draft,
    busy,
    start,
    stop,
    persist,
    probe,
  };
}
