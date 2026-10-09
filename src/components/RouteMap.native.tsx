import React, { useEffect, useRef } from "react";
import { View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { Label, palette } from "../ui";
type RoutePoint = { latitude: number; longitude: number; timestamp?: number };
export default function RouteMap({ points }: { points: RoutePoint[] }) {
  const map = useRef<MapView>(null);
  useEffect(() => {
    if (points.length > 1)
      map.current?.fitToCoordinates(points, {
        edgePadding: { top: 35, right: 35, bottom: 35, left: 35 },
        animated: true,
      });
  }, [points]);
  if (!points.length)
    return (
      <View
        style={{ height: 180, alignItems: "center", justifyContent: "center" }}
      >
        <Label muted>Inicia una actividad para ver tu ruta GPS.</Label>
      </View>
    );
  return (
    <View style={{ height: 250, borderRadius: 12, overflow: "hidden" }}>
      <MapView
        ref={map}
        style={{ flex: 1 }}
        userInterfaceStyle="dark"
        initialRegion={{
          ...points[0],
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        onMapReady={() => {
          if (points.length > 1)
            map.current?.fitToCoordinates(points, {
              edgePadding: { top: 35, right: 35, bottom: 35, left: 35 },
              animated: false,
            });
        }}
      >
        <Polyline
          coordinates={points}
          strokeColor={palette.green}
          strokeWidth={4}
        />
        <Marker
          coordinate={points[0]}
          pinColor={palette.green}
          title="Inicio"
        />
        {points.length > 1 && (
          <Marker
            coordinate={points[points.length - 1]}
            pinColor={palette.orange}
            title="Último punto"
          />
        )}
      </MapView>
    </View>
  );
}
