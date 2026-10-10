import React from "react";
import Svg, { Polyline, Circle } from "react-native-svg";
import { View } from "react-native";
import { Label, palette } from "../ui";
export type RoutePoint = {
  latitude: number;
  longitude: number;
  timestamp?: number;
};
export default function RouteMap({ points }: { points: RoutePoint[] }) {
  if (!points.length)
    return (
      <View
        style={{ height: 160, justifyContent: "center", alignItems: "center" }}
      >
        <Label muted>La ruta aparecerá al iniciar tu actividad.</Label>
      </View>
    );
  const minLat = Math.min(...points.map((p) => p.latitude)),
    maxLat = Math.max(...points.map((p) => p.latitude)),
    minLon = Math.min(...points.map((p) => p.longitude)),
    maxLon = Math.max(...points.map((p) => p.longitude));
  const projected = points.map((p) => ({
    x: 20 + ((p.longitude - minLon) / Math.max(0.0001, maxLon - minLon)) * 280,
    y: 180 - ((p.latitude - minLat) / Math.max(0.0001, maxLat - minLat)) * 160,
  }));
  return (
    <View style={{ gap: 8 }}>
      <Svg width="100%" height={210} viewBox="0 0 320 210">
        <Polyline
          points={projected.map((p) => `${p.x},${p.y}`).join(" ")}
          stroke={palette.green}
          strokeWidth={3}
          fill="none"
        />
        {[projected[0], projected.at(-1)!].map((p, i) => (
          <Circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={5}
            fill={i ? palette.orange : palette.green}
          />
        ))}
      </Svg>
      <Label muted>
        Tu recorrido GPS · inicio verde y último punto naranja.
      </Label>
    </View>
  );
}
