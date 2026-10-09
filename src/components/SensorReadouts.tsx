import React from "react";
import { View, Text } from "react-native";
import { Label, Divider, palette, fonts } from "../ui";
import {
  sensorNumber,
  type SensorReadings,
  type VectorReading,
} from "../lib/sensors";
type Props = {
  readings: SensorReadings;
  status: Record<string, string>;
  steps: number | null;
  running: boolean;
};
function Data({
  label,
  value,
  unit = "",
  decimals = 2,
}: {
  label: string;
  value: number | null | undefined;
  unit?: string;
  decimals?: number;
}) {
  return (
    <View style={{ flexGrow: 1, minWidth: 85, gap: 4 }}>
      <Label muted>{label}</Label>
      <Text
        style={{
          color: palette.text,
          fontFamily: fonts.medium,
          fontSize: 19,
          fontVariant: ["tabular-nums"],
        }}
      >
        {sensorNumber(value, decimals)}{" "}
        <Text style={{ fontSize: 12, color: palette.muted }}>{unit}</Text>
      </Text>
    </View>
  );
}
function Vector({
  value,
  unit,
}: {
  value: VectorReading | undefined;
  unit: string;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
      {(["x", "y", "z"] as const).map((axis) => (
        <Data
          key={axis}
          label={"Eje " + axis.toUpperCase()}
          value={value?.[axis]}
          unit={unit}
        />
      ))}
    </View>
  );
}
export default function SensorReadouts({
  readings,
  status,
  steps,
  running,
}: Props) {
  const descriptions: Record<string, string> = {
    Acelerómetro:
      "Aceleración del teléfono en tres ejes, incluida la gravedad. 1 g ≈ 9.81 m/s².",
    Giroscopio:
      "Velocidad de giro del teléfono en tres ejes, en radianes por segundo.",
    Barómetro:
      "Presión atmosférica. La altura relativa indica cuánto subiste o bajaste desde el inicio de la medición.",
    Podómetro: "Pasos detectados durante esta caminata o carrera.",
    GPS: "Ubicación, precisión de la señal, altura y velocidad reportadas por el GPS.",
  };
  const timestamps: Record<string, number | undefined> = {
    Acelerómetro: readings.accelerometer?.receivedAt,
    Giroscopio: readings.gyroscope?.receivedAt,
    Barómetro: readings.barometer?.receivedAt,
    GPS: readings.gps?.receivedAt,
  };
  return (
    <View style={{ gap: 22 }}>
      <Label muted>
        {running
          ? "Lecturas en vivo mientras registras tu actividad."
          : "Inicia una caminata o carrera para ver las lecturas. Al finalizar se conserva la última lectura en esta pantalla."}
      </Label>
      {["Acelerómetro", "Giroscopio", "Barómetro", "Podómetro", "GPS"].map(
        (name) => (
          <View key={name} style={{ gap: 12 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <Label>{name}</Label>
              <Text
                style={{
                  fontFamily: fonts.regular,
                  fontSize: 12,
                  color: status[name]?.startsWith("Activo")
                    ? palette.green
                    : palette.muted,
                }}
              >
                {status[name] ?? "Comprobando…"}
              </Text>
            </View>
            <Label muted>{descriptions[name]}</Label>
            {name === "Acelerómetro" && (
              <Vector value={readings.accelerometer} unit="g" />
            )}
            {name === "Giroscopio" && (
              <Vector value={readings.gyroscope} unit="rad/s" />
            )}
            {name === "Barómetro" && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
                <Data
                  label="Presión"
                  value={readings.barometer?.pressure}
                  unit="hPa"
                />
                <Data
                  label="Altura relativa"
                  value={readings.barometer?.relativeAltitude}
                  unit="m"
                />
              </View>
            )}
            {name === "Podómetro" && (
              <Data label="Pasos de la sesión" value={steps} decimals={0} />
            )}
            {name === "GPS" && (
              <View style={{ gap: 16 }}>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}
                >
                  <Data
                    label="Latitud"
                    value={readings.gps?.latitude}
                    decimals={5}
                  />
                  <Data
                    label="Longitud"
                    value={readings.gps?.longitude}
                    decimals={5}
                  />
                </View>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}
                >
                  <Data
                    label="Precisión ±"
                    value={readings.gps?.accuracy}
                    unit="m"
                    decimals={1}
                  />
                  <Data
                    label="Altitud"
                    value={readings.gps?.altitude}
                    unit="m"
                    decimals={1}
                  />
                  <Data
                    label="Velocidad"
                    value={
                      readings.gps?.speed != null && readings.gps.speed >= 0
                        ? readings.gps.speed * 3.6
                        : null
                    }
                    unit="km/h"
                    decimals={1}
                  />
                  <Data
                    label="Rumbo"
                    value={
                      readings.gps?.heading != null && readings.gps.heading >= 0
                        ? readings.gps.heading
                        : null
                    }
                    unit="°"
                    decimals={0}
                  />
                </View>
              </View>
            )}
            {timestamps[name] != null && (
              <Label muted>
                Última lectura:{" "}
                {new Date(timestamps[name]!).toLocaleTimeString("es-MX")}
              </Label>
            )}
            <Divider />
          </View>
        ),
      )}
      <Label muted>
        — significa que el sensor no ha enviado ese dato o no lo admite tu
        dispositivo.
      </Label>
    </View>
  );
}
