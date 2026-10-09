import QuickActions from "../../src/components/QuickActions";
import React, { useEffect } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import {
  Screen,
  Section,
  Divider,
  Heading,
  Label,
  Button,
  ErrorBox,
  Loading,
  Chart,
  ProgressRing,
  Metric,
  palette,
} from "../../src/ui";
import { useRows } from "../../src/hooks/useData";
import { localDay, streak } from "../../src/lib/domain";
import { useAuth } from "../../src/providers";
export default function Home() {
  const profile = useRows("profiles"),
    steps = useRows("daily_steps"),
    goals = useRows("fitness_goals"),
    activities = useRows("activities"),
    { recovery } = useAuth();
  useEffect(() => {
    if (recovery) router.replace("/reset-password");
  }, [recovery]);
  const p = profile.data?.[0],
    g = goals.data?.[0],
    imperial = p?.units === "imperial";
  const activityToday =
    activities.data?.filter(
      (a) => (a.day ?? localDay(new Date(a.started_at))) === localDay(),
    ) ?? [];
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 6 + i);
    return {
      label: d
        .toLocaleDateString("es-MX", { weekday: "short" })
        .replace(".", ""),
      value: Number(
        activities.data
          ?.filter((a) => a.day === localDay(d))
          .reduce((total, a) => total + Number(a.steps ?? 0), 0) ?? 0,
      ),
    };
  });
  const weightFactor = imperial ? 2.20462 : 1;
  return (
    <Screen
      title={`Hola, ${p?.full_name?.split(" ")[0] || "atleta"}`}
      eyebrow="TU PROGRESO, CADA DÍA"
      refresh={() =>
        Promise.all([
          profile.refetch(),
          steps.refetch(),
          activities.refetch(),
          goals.refetch(),
        ])
      }
    >
      {profile.isLoading && <Loading />}
      <ErrorBox
        error={profile.error || steps.error || activities.error || goals.error}
        retry={() => {
          void profile.refetch();
          void steps.refetch();
          void activities.refetch();
          void goals.refetch();
        }}
      />
      <ProgressRing
        label="Hoy"
        value={
          activities.isLoading
            ? null
            : activityToday.reduce(
                (total, activity) => total + Number(activity.steps ?? 0),
                0,
              )
        }
        goal={Number(g?.daily_steps ?? 8000)}
        unit="pasos"
      />
      <View style={{ flexDirection: "row", gap: 18 }}>
        <Metric
          label="Distancia"
          value={
            activityToday.reduce((n, a) => n + Number(a.distance_m), 0) /
            (imperial ? 1609.344 : 1000)
          }
          unit={imperial ? "mi" : "km"}
        />
        <Metric
          label="Estimadas"
          value={activityToday.reduce((n, a) => n + Number(a.calories ?? 0), 0)}
          unit="kcal"
          color={palette.orange}
        />
        <Metric
          label="Racha"
          value={streak(
            activities.data?.map(
              (a) => a.day ?? localDay(new Date(a.started_at)),
            ) ?? [],
          )}
          unit="días"
          color={palette.purple}
        />
      </View>
      <Label muted>
        {activities.isLoading
          ? "Cargando tu progreso…"
          : activityToday.reduce((n, a) => n + Number(a.steps ?? 0), 0) >=
              Number(g?.daily_steps ?? 8000)
            ? "¡Objetivo de pasos alcanzado! Buen trabajo hoy."
            : activityToday.length
              ? "Ya sumaste movimiento hoy. Sigue a tu ritmo."
              : "Tu día empieza con un paso. Registra tu primera caminata."}
      </Label>
      <Label muted>Pasos de caminatas y carreras guardadas en FitTrack.</Label>
      <Button
        title="Empezar actividad"
        onPress={() => router.push("/(tabs)/activity")}
      />
      <QuickActions />
      <Divider />
      <Section>
        <Heading title="Tu semana" icon="bar-chart-2" />
        <Chart values={week} unit="pasos" />
        <Label muted>Los días sin registros aparecen sin altura.</Label>
      </Section>
      <Divider />
      <Section>
        <Heading title="Más cerca de tu objetivo" icon="target" />
        <View style={{ flexDirection: "row", gap: 32 }}>
          <Metric
            label="Peso actual"
            value={p?.weight_kg ? Number(p.weight_kg) * weightFactor : null}
            unit={imperial ? "lb" : "kg"}
          />
          <Metric
            label="Peso objetivo"
            value={
              g?.target_weight_kg
                ? Number(g.target_weight_kg) * weightFactor
                : null
            }
            unit={imperial ? "lb" : "kg"}
            color={palette.green}
          />
        </View>
        <Button
          title="Ajustar mis metas"
          secondary
          onPress={() => router.push("/(tabs)/goals")}
        />
      </Section>
    </Screen>
  );
}
