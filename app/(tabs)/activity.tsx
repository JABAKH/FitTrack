import Disclosure from "../../src/components/Disclosure";
import SensorReadouts from "../../src/components/SensorReadouts";
import React, { useState } from "react";
import { View, Text } from "react-native";
import {
  Screen,
  Section,
  Divider,
  Heading,
  Label,
  Button,
  ErrorBox,
  useAction,
  Loading,
  Metric,
  palette,
  fonts,
} from "../../src/ui";
import { useTracking } from "../../src/hooks/useTracking";
import { useRows } from "../../src/hooks/useData";
import RouteMap, { RoutePoint } from "../../src/components/RouteMap";
export default function Activity() {
  const t = useTracking(),
    activities = useRows("activities"),
    profile = useRows("profiles"),
    a = useAction(),
    [selectedRoute, setSelectedRoute] = useState<RoutePoint[] | null>(null);
  const unit = profile.data?.[0]?.units === "imperial" ? "mi" : "km",
    factor = unit === "mi" ? 1609.344 : 1000;
  return (
    <Screen
      title="Encuentra tu ritmo"
      eyebrow="ACTIVIDAD"
      refresh={() => activities.refetch()}
    >
      <Section>
        <View style={{ alignItems: "center", gap: 8, paddingVertical: 12 }}>
          <Text
            style={{
              color: t.running ? palette.green : palette.muted,
              fontFamily: fonts.medium,
              fontSize: 11,
              letterSpacing: 2,
            }}
          >
            {t.running
              ? "EN MOVIMIENTO"
              : t.draft
                ? "LISTA PARA GUARDAR"
                : "TU PRÓXIMA SESIÓN"}
          </Text>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.65}
            numberOfLines={1}
            accessibilityLabel={`${t.seconds} segundos`}
            style={{
              fontFamily: fonts.semibold,
              fontSize: 68,
              color: palette.text,
              letterSpacing: -3,
              fontVariant: ["tabular-nums"],
            }}
          >
            {String(Math.floor(t.seconds / 3600)).padStart(2, "0")}:
            {String(Math.floor(t.seconds / 60) % 60).padStart(2, "0")}:
            {String(t.seconds % 60).padStart(2, "0")}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 24 }}>
          <Metric label="Distancia" value={t.distance / factor} unit={unit} />
          <Metric
            label="Sesión"
            value={t.steps}
            unit="pasos"
            color={palette.green}
          />
        </View>
        {t.running ? (
          <Button
            title="Finalizar actividad"
            onPress={() => void a.run(t.stop)}
          />
        ) : (
          <>
            <Button
              title="Iniciar caminata"
              disabled={t.busy || !!t.draft}
              onPress={() => {
                setSelectedRoute(null);
                void t.start("walk");
              }}
            />
            <Button
              secondary
              title="Iniciar carrera"
              disabled={t.busy || !!t.draft}
              onPress={() => {
                setSelectedRoute(null);
                void t.start("run");
              }}
            />
          </>
        )}
        {t.draft && (
          <>
            <Label>
              Actividad pendiente · {(t.draft.distance_m / factor).toFixed(2)}{" "}
              {unit}
            </Label>
            <Button
              disabled={t.busy}
              title="Guardar actividad"
              onPress={() =>
                void t.persist(Number(profile.data?.[0]?.weight_kg ?? 70))
              }
            />
            <Label muted>
              Calorías estimadas con tu peso; 70 kg si aún no lo registraste.
            </Label>
          </>
        )}
      </Section>
      <ErrorBox error={t.error || a.error} />
      <Divider />
      <Section>
        <Heading
          title={selectedRoute ? "Ruta del historial" : "Tu recorrido"}
          icon="map"
        />
        <RouteMap points={selectedRoute ?? t.route} />
        {selectedRoute && (
          <Button
            secondary
            title="Volver al recorrido actual"
            onPress={() => setSelectedRoute(null)}
          />
        )}
      </Section>
      <Divider />
      <Section>
        <Disclosure title="Sensores · explora tus lecturas">
          <SensorReadouts
            readings={t.readings}
            status={t.status}
            steps={t.steps}
            running={t.running}
          />
        </Disclosure>
        <Label muted>
          Seguimiento en primer plano. Al salir de la app, se detiene y conserva
          la actividad.
        </Label>
      </Section>
      <Divider />
      <Heading title="Tus actividades" icon="clock" />
      {activities.isLoading && <Loading />}
      <ErrorBox
        error={activities.error}
        retry={() => void activities.refetch()}
      />
      {[...(activities.data ?? [])]
        .sort((a, b) => b.started_at.localeCompare(a.started_at))
        .slice(0, 50)
        .map((item, i) => (
          <Section key={item.id} delay={i * 20}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <View style={{ flex: 1, gap: 6 }}>
                <Label>{item.kind === "run" ? "Carrera" : "Caminata"}</Label>
                <Label muted>
                  {new Date(item.started_at).toLocaleDateString()} ·{" "}
                  {Math.round(item.duration_seconds / 60)} min
                </Label>
              </View>
              <Text
                style={{
                  color: palette.text,
                  fontFamily: fonts.semibold,
                  fontSize: 22,
                }}
              >
                {(item.distance_m / factor).toFixed(2)}{" "}
                <Text style={{ fontSize: 12, color: palette.muted }}>
                  {unit}
                </Text>
              </Text>
            </View>
            <Label muted>{item.calories} kcal estimadas</Label>
            {item.route?.length > 0 && (
              <Button
                secondary
                title="Ver recorrido"
                onPress={() => setSelectedRoute(item.route)}
              />
            )}
            <Divider />
          </Section>
        ))}
      {activities.data?.length === 0 && (
        <Label muted>Tu primera actividad empieza aquí.</Label>
      )}
    </Screen>
  );
}
