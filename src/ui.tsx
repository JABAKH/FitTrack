import Brand from "./components/Brand";
import ProgressArc from "./components/ProgressArc";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  ReduceMotion,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "./providers";

export const palette = {
  bg: "#080D1B",
  card: "#080D1B",
  surface: "#101A2E",
  text: "#FFFFFF",
  muted: "#94A3B8",
  green: "#00E5A0",
  lime: "#00E5A0",
  orange: "#FF7A30",
  purple: "#A855F7",
  line: "rgba(148,163,184,0.14)",
};
export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
};
export const usePalette = () => palette;
export function feedback() {
  if (Platform.OS !== "web") void Haptics.selectionAsync().catch(() => {});
}
const timing = {
  duration: 650,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
};
export function Screen({
  title,
  children,
  refresh,
  eyebrow = "FITTRACK",
}: {
  title: string;
  children: React.ReactNode;
  refresh?: () => void | Promise<unknown>;
  eyebrow?: string;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const { online } = useAuth(),
    opacity = useSharedValue(0),
    translate = useSharedValue(6);
  useFocusEffect(
    React.useCallback(() => {
      opacity.set(0);
      translate.set(6);
      opacity.set(withTiming(1, { ...timing, duration: 300 }));
      translate.set(withTiming(0, { ...timing, duration: 300 }));
    }, [opacity, translate]),
  );
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translate.value }],
  }));
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: palette.bg }}
      edges={["top", "left", "right"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.page}
          refreshControl={
            refresh ? (
              <RefreshControl
                tintColor={palette.green}
                colors={[palette.green]}
                refreshing={refreshing}
                onRefresh={() => {
                  if (refreshing) return;
                  setRefreshing(true);
                  void Promise.resolve()
                    .then(refresh)
                    .finally(() => setRefreshing(false))
                    .catch(() => {});
                }}
              />
            ) : undefined
          }
        >
          <Animated.View style={[{ gap: 30 }, style]}>
            <View style={{ gap: 8 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <Text style={[styles.eyebrow, { flex: 1 }]}>{eyebrow}</Text>
                <Brand />
              </View>
              <Text style={styles.title}>{title}</Text>
            </View>
            {!online && (
              <Text style={styles.warning}>
                Sin conexión · conservamos tu actividad pendiente
              </Text>
            )}
            {children}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
// Sections only organize spacing; no backgrounds, outlines, radii, shadows or cards.
export function Section({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <Animated.View
      entering={FadeIn.duration(280)
        .delay(Math.min(delay, 150))
        .reduceMotion(ReduceMotion.System)}
      style={{ gap: 16 }}
    >
      {children}
    </Animated.View>
  );
}
export function Divider() {
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: palette.line,
        width: "100%",
      }}
    />
  );
}
export function Heading({
  title,
  icon,
}: {
  title: string;
  icon?: React.ComponentProps<typeof Feather>["name"];
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      {icon && <Feather name={icon} color={palette.green} size={18} />}
      <Text
        style={{
          flex: 1,
          color: palette.text,
          fontFamily: fonts.semibold,
          fontSize: 19,
        }}
      >
        {title}
      </Text>
    </View>
  );
}
export function Label({
  children,
  muted = false,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <Text
      style={{
        color: muted ? palette.muted : palette.text,
        fontFamily: fonts.regular,
        fontSize: 14,
        lineHeight: 22,
        flexShrink: 1,
      }}
    >
      {children}
    </Text>
  );
}
export function Field({
  label,
  value,
  onChange,
  secure = false,
  numeric = false,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  secure?: boolean;
  numeric?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <Text style={[styles.fieldLabel, focused && { color: palette.green }]}>
        {label}
      </Text>
      <View style={{ position: "relative" }}>
        <TextInput
          accessibilityLabel={label}
          style={[
            styles.input,
            {
              borderWidth: 1,
              borderColor: focused ? palette.green : "transparent",
              paddingRight: secure ? 54 : 14,
            },
          ]}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          selectionColor={palette.green}
          placeholderTextColor={palette.muted}
          value={value}
          onChangeText={onChange}
          secureTextEntry={secure && !visible}
          keyboardType={
            numeric
              ? "decimal-pad"
              : label.toLowerCase().includes("correo")
                ? "email-address"
                : "default"
          }
          autoCapitalize={
            secure || label.toLowerCase().includes("correo")
              ? "none"
              : "sentences"
          }
        />
        {secure && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              visible ? "Ocultar contraseña" : "Mostrar contraseña"
            }
            onPress={() => {
              feedback();
              setVisible(!visible);
            }}
            style={{
              position: "absolute",
              right: 4,
              top: 0,
              bottom: 0,
              width: 48,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Feather
              name={visible ? "eye-off" : "eye"}
              size={19}
              color={palette.muted}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}
export function Button({
  title,
  onPress,
  disabled = false,
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  const scale = useSharedValue(1),
    style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={style}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPressIn={() => {
          scale.set(
            withTiming(0.975, {
              duration: 100,
              reduceMotion: ReduceMotion.System,
            }),
          );
        }}
        onPressOut={() => {
          scale.set(
            withTiming(1, { duration: 160, reduceMotion: ReduceMotion.System }),
          );
        }}
        onPress={() => {
          feedback();
          onPress();
        }}
        style={[
          styles.button,
          {
            backgroundColor: secondary ? "transparent" : palette.green,
            opacity: disabled ? 0.4 : 1,
          },
        ]}
      >
        <Text
          style={{
            color: secondary ? palette.green : palette.bg,
            fontFamily: fonts.semibold,
            fontSize: 14,
            textAlign: "center",
            flexShrink: 1,
          }}
        >
          {title}
        </Text>
        <Feather
          name={secondary ? "arrow-up-right" : "arrow-right"}
          size={17}
          color={secondary ? palette.green : palette.bg}
        />
      </Pressable>
    </Animated.View>
  );
}
export function Choice({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 22 }}>
      {options.map((o) => (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: value === o.value }}
          key={o.value}
          onPress={() => {
            feedback();
            onChange(o.value);
          }}
          style={{
            minHeight: 48,
            paddingVertical: 12,
            borderBottomWidth: value === o.value ? 2 : 0,
            borderBottomColor: palette.green,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.medium,
              color: value === o.value ? palette.green : palette.muted,
              fontSize: 13,
            }}
          >
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
export function ErrorBox({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  if (!error) return null;
  const text =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String(error.message)
        : String(error);
  return (
    <Section>
      <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
        <Feather name="alert-circle" size={18} color={palette.orange} />
        <Text
          accessibilityRole="alert"
          style={{
            flex: 1,
            fontFamily: fonts.regular,
            color: palette.orange,
            lineHeight: 22,
          }}
        >
          {text}
        </Text>
      </View>
      {retry && <Button title="Reintentar" secondary onPress={retry} />}
    </Section>
  );
}
export function Loading() {
  return (
    <View style={{ padding: 24, backgroundColor: palette.bg }}>
      <ActivityIndicator color={palette.green} />
    </View>
  );
}
export function useAction() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  return {
    busy,
    error,
    run: async (fn: () => Promise<unknown>, success?: string) => {
      if (busy) return;
      setBusy(true);
      setError(null);
      try {
        await fn();
        if (success) Alert.alert("FitTrack", success);
      } catch (e) {
        setError(e);
      } finally {
        setBusy(false);
      }
    },
  };
}
export function AnimatedNumber({
  value,
  size = 36,
  decimals = 0,
  color = palette.text,
  suffix = "",
}: {
  value: number | null;
  size?: number;
  decimals?: number;
  color?: string;
  suffix?: string;
}) {
  const current = useSharedValue(value ?? 0),
    [display, setDisplay] = useState(value ?? 0);
  useEffect(() => {
    current.set(withTiming(value ?? 0, timing));
  }, [value, current]);
  useAnimatedReaction(
    () => Math.round(current.value * 10 ** decimals) / 10 ** decimals,
    (next, previous) => {
      if (next !== previous) runOnJS(setDisplay)(next);
    },
    [decimals],
  );
  return (
    <Text
      style={{
        color,
        fontFamily: fonts.semibold,
        fontSize: size,
        letterSpacing: -size * 0.035,
        fontVariant: ["tabular-nums"],
        flexShrink: 1,
      }}
    >
      {value === null
        ? "—"
        : display.toLocaleString("es-MX", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          })}
      {suffix && (
        <Text
          style={{
            fontSize: 14,
            fontFamily: fonts.medium,
            letterSpacing: 0,
            color: palette.muted,
          }}
        >
          {" "}
          {suffix}
        </Text>
      )}
    </Text>
  );
}
export function Metric({
  label,
  value,
  unit,
  color = palette.text,
}: {
  label: string;
  value: number | null;
  unit?: string;
  color?: string;
}) {
  return (
    <View style={{ flex: 1, minWidth: 70, gap: 7 }}>
      <AnimatedNumber
        value={value}
        size={28}
        decimals={
          unit === "km" || unit === "mi" || unit === "kg" || unit === "lb"
            ? 1
            : 0
        }
        color={color}
      />
      <Text style={styles.metricLabel}>
        {label}
        {unit ? ` · ${unit}` : ""}
      </Text>
    </View>
  );
}
export function ProgressRing({
  value,
  goal,
  label,
  unit,
  size = 248,
  color = palette.green,
}: {
  value: number | null;
  goal: number;
  label: string;
  unit: string;
  size?: number;
  color?: string;
}) {
  const stroke = 7,
    r = (size - stroke * 2) / 2;
  const ratio =
    goal > 0 && Number.isFinite(goal) && Number.isFinite(value ?? 0)
      ? Math.min(1, Math.max(0, (value ?? 0) / goal))
      : 0;
  return (
    <View style={{ alignItems: "center", gap: 12 }}>
      <View
        style={{
          width: size,
          height: size,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={palette.line}
            strokeWidth={stroke}
            fill="none"
          />
          <ProgressArc
            size={size}
            stroke={stroke}
            radius={r}
            color={color}
            progress={ratio}
          />
        </Svg>
        <Text style={styles.eyebrow}>{label.toUpperCase()}</Text>
        <AnimatedNumber value={value} size={52} />
        <Text style={styles.metricLabel}>{unit}</Text>
      </View>
      <Text style={styles.metricLabel}>
        {value === null
          ? "Sin registro todavía"
          : `${Math.round((value / Math.max(1, goal)) * 100)}% de tu objetivo`}{" "}
        · {goal.toLocaleString("es-MX")} {unit}
      </Text>
    </View>
  );
}
export function ProgressBar({
  value,
  goal,
  color = palette.green,
}: {
  value: number;
  goal: number;
  color?: string;
}) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(
      withTiming(Math.min(1, Math.max(0, goal > 0 ? value / goal : 0)), timing),
    );
  }, [value, goal, progress]);
  const style = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
  return (
    <View
      style={{
        height: 4,
        backgroundColor: palette.line,
        overflow: "hidden",
        borderRadius: 2,
      }}
    >
      <Animated.View
        style={[{ height: 4, backgroundColor: color, borderRadius: 2 }, style]}
      />
    </View>
  );
}
export function Macro({
  label,
  value,
  goal,
  color,
}: {
  label: string;
  value: number;
  goal: number;
  color: string;
}) {
  return (
    <View style={{ gap: 10 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <Text style={{ fontFamily: fonts.medium, fontSize: 13, color }}>
          {label}
        </Text>
        <Text
          style={{
            fontFamily: fonts.medium,
            fontSize: 13,
            color: palette.text,
          }}
        >
          {value.toFixed(0)}{" "}
          <Text style={{ color: palette.muted }}>/ {goal} g</Text>
        </Text>
      </View>
      <ProgressBar value={value} goal={goal} color={color} />
    </View>
  );
}
function Bar({
  value,
  max,
  selected,
}: {
  value: number;
  max: number;
  selected: boolean;
}) {
  const height = useSharedValue(0);
  useEffect(() => {
    height.set(withTiming((value / max) * 116, timing));
  }, [value, max, height]);
  const style = useAnimatedStyle(() => ({
    height: value === 0 ? 0 : Math.max(2, height.value),
  }));
  return (
    <Animated.View
      style={[
        {
          width: "42%",
          backgroundColor: selected ? palette.orange : palette.green,
          borderRadius: 3,
        },
        style,
      ]}
    />
  );
}
export function Chart({
  values,
  unit,
  line = false,
}: {
  values: { label: string; value: number }[];
  unit: string;
  line?: boolean;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const max = Math.max(1, ...values.map((v) => v.value));
  if (!values.length)
    return <Label muted>Aún no hay registros para graficar.</Label>;
  const active = selected === null ? undefined : values[selected];
  const min = Math.min(...values.map((v) => v.value)),
    range = Math.max(1, max - min);
  const points = values.map((v, i) => ({
    x: 12 + (values.length === 1 ? 150 : (i / (values.length - 1)) * 296),
    y: 144 - ((v.value - min) / range) * 120,
  }));
  return (
    <Section>
      {line ? (
        <>
          <Svg
            width="100%"
            height={170}
            viewBox="0 0 320 170"
            preserveAspectRatio="none"
          >
            <Line x1="0" x2="320" y1="144" y2="144" stroke={palette.line} />
            <Line x1="0" x2="320" y1="24" y2="24" stroke={palette.line} />
            <Path
              d={points
                .map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`)
                .join(" ")}
              fill="none"
              stroke={palette.green}
              strokeWidth={2.5}
            />
            {points.map((p, i) => (
              <Circle
                key={i}
                cx={p.x}
                cy={p.y}
                onPress={() => {
                  feedback();
                  setSelected(i);
                }}
                r={selected === i ? 6 : 4}
                fill={selected === i ? palette.orange : palette.green}
              />
            ))}
          </Svg>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 14 }}
          >
            {values.map((v, i) => (
              <Pressable
                key={`${v.label}-${i}`}
                onPress={() => {
                  feedback();
                  setSelected(i);
                }}
                style={{ paddingVertical: 8 }}
              >
                <Text
                  style={{
                    fontFamily: fonts.medium,
                    color: selected === i ? palette.green : palette.muted,
                    fontSize: 11,
                  }}
                >
                  {v.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : (
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            height: 155,
            gap: 12,
          }}
        >
          {values.map((v, i) => (
            <Pressable
              accessibilityLabel={`${v.label}: ${v.value} ${unit}`}
              key={`${v.label}-${i}`}
              onPress={() => {
                feedback();
                setSelected(i);
              }}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 12,
                height: 155,
              }}
            >
              <Bar value={v.value} max={max} selected={selected === i} />
              <Text
                style={{
                  fontFamily: fonts.regular,
                  fontSize: 10,
                  color: palette.muted,
                }}
              >
                {v.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      <Label muted>
        {active
          ? `${active.label}: ${active.value.toFixed(1)} ${unit}`
          : "Toca un registro para explorar tu progreso."}
      </Label>
    </Section>
  );
}
const styles = StyleSheet.create({
  page: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 48 },
  eyebrow: {
    fontSize: 10,
    fontFamily: fonts.semibold,
    letterSpacing: 2,
    color: palette.green,
  },
  title: {
    fontSize: 30,
    fontFamily: fonts.bold,
    letterSpacing: -1,
    color: palette.text,
    lineHeight: 39,
  },
  fieldLabel: { fontFamily: fonts.medium, fontSize: 12, color: palette.muted },
  input: {
    backgroundColor: palette.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: palette.text,
    minHeight: 48,
  },
  button: {
    minHeight: 54,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  metricLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: palette.muted,
    lineHeight: 18,
  },
  warning: {
    color: palette.orange,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 20,
  },
});
