import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { AppState, Linking, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { WebView } from "react-native-webview";
import { Button, Label, palette } from "../ui";
import {
  openStreetMapHtml,
  routeUpdateScript,
  type MapRoutePoint,
} from "../lib/openStreetMap";
import RouteTrace from "./RouteTrace";

export default function OpenStreetRouteMap({
  points,
}: {
  points: MapRoutePoint[];
}) {
  const web = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [tilesUnavailable, setTilesUnavailable] = useState(false);
  const [foreground, setForeground] = useState(
    AppState.currentState === "active",
  );
  const [focused, setFocused] = useState(false);
  const [revision, setRevision] = useState(0);
  const source = useMemo(() => ({ html: openStreetMapHtml }), []);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => {
        setFocused(false);
        setReady(false);
      };
    }, []),
  );
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) => {
      setForeground(state === "active");
      if (state !== "active") setReady(false);
    });
    return () => listener.remove();
  }, []);
  useEffect(() => {
    if (ready && foreground && focused)
      web.current?.injectJavaScript(routeUpdateScript(points));
  }, [points, ready, foreground, focused]);
  if (!points.length)
    return (
      <View
        style={{ height: 180, alignItems: "center", justifyContent: "center" }}
      >
        <Label muted>
          El mapa aparecerá cuando el GPS obtenga tu ubicación.
        </Label>
      </View>
    );
  if (failed)
    return (
      <View style={{ gap: 8 }}>
        <RouteTrace points={points} />
        <Label muted>
          No se pudo abrir el mapa. Tu recorrido GPS sigue registrado.
        </Label>
        <Button
          title="Reintentar mapa"
          onPress={() => {
            setFailed(false);
            setReady(false);
            setRevision((value) => value + 1);
          }}
        />
      </View>
    );
  return (
    <View style={{ gap: 8 }}>
      <View
        style={{
          height: 280,
          borderRadius: 12,
          overflow: "hidden",
          backgroundColor: palette.surface,
        }}
      >
        {foreground && focused && (
          <WebView
            key={revision}
            ref={web}
            source={source}
            originWhitelist={["*"]}
            userAgent="FitTrack/1.0 (com.fittrack.mobile)"
            cacheEnabled
            cacheMode="LOAD_DEFAULT"
            mixedContentMode="never"
            javaScriptEnabled
            geolocationEnabled={false}
            allowFileAccess={false}
            allowUniversalAccessFromFileURLs={false}
            thirdPartyCookiesEnabled={false}
            setSupportMultipleWindows={false}
            scrollEnabled={false}
            style={{ backgroundColor: palette.surface }}
            onError={() => {
              setReady(false);
              setFailed(true);
            }}
            onRenderProcessGone={() => {
              setReady(false);
              setFailed(true);
            }}
            onMessage={({ nativeEvent }) => {
              try {
                const { type } = JSON.parse(nativeEvent.data);
                if (type === "ready") setReady(true);
                if (type === "tile-error") setTilesUnavailable(true);
                if (type === "tile-loaded") setTilesUnavailable(false);
                if (type === "attribution")
                  void Linking.openURL(
                    "https://www.openstreetmap.org/copyright",
                  );
              } catch {
                /* Ignore malformed bridge messages. */
              }
            }}
            onShouldStartLoadWithRequest={({ url }) =>
              url === "about:blank" || url.startsWith("data:text/html")
            }
          />
        )}
      </View>
      <Label muted>
        {tilesUnavailable
          ? "No se pudieron cargar algunas calles. Revisa tu conexión; el GPS sigue registrando."
          : "Inicio verde · ubicación actual naranja"}
      </Label>
    </View>
  );
}
