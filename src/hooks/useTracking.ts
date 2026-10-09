import type { SensorReadings } from "../lib/sensors";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
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
    [seconds, setSeconds] = useState(0),
    [distance, setDistance] = useState(0),
    [steps, setSteps] = useState<number | null>(null),
    [error, setError] = useState<unknown>(null),
    [draft, setDraft] = useState<Draft | null>(null),
    [busy, setBusy] = useState(false),
    [liveRoute, setLiveRoute] = useState<Point[]>([]),
    [readings, setReadings] = useState<SensorReadings>({});
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
    if (!active.current) return;
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
    setDraft(value);
    if (uid)
      await AsyncStorage.setItem(
        `activity-draft:${uid}`,
        JSON.stringify(value),
      );
  }, [uid, cleanup, buildDraft]);
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) => {
      if (state !== "active" && active.current) void stop().catch(setError);
    });
    return () => listener.remove();
  }, [uid, stop]);
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
          subs.current.push(
            Pedometer.watchStepCount(({ steps: n }) => {
              count.current = n;
              setSteps(n);
            }),
          );
        } else setStatus((s) => ({ ...s, Podómetro: "Permiso denegado" }));
      }
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
