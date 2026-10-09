import React from "react";
import { Keyboard, View, Text, Pressable } from "react-native";
import Slider from "@react-native-community/slider";
import { Label, Button, palette, fonts } from "../ui";
type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  unit: string;
  min: number;
  max: number;
  step: number;
  initial: number;
};
export default function MeasurementPicker({
  label,
  value,
  onChange,
  unit,
  min,
  max,
  step,
  initial,
}: Props) {
  const parsed = Number(value.replace(",", "."));
  const selected =
    value.trim() !== "" &&
    Number.isFinite(parsed) &&
    parsed >= min &&
    parsed <= max;
  const current = selected ? parsed : initial;
  const choose = (n: number) =>
    onChange(String(Math.round(Math.min(max, Math.max(min, n)) / step) * step));
  return (
    <View style={{ gap: 12 }}>
      <Label>{label}</Label>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={"Reducir " + label}
          disabled={current <= min}
          onPress={() => choose(current - step)}
          style={{
            width: 48,
            height: 48,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: palette.green, fontSize: 30 }}>−</Text>
        </Pressable>
        <Text
          style={{
            fontFamily: fonts.semibold,
            fontSize: 36,
            color: selected ? palette.text : palette.muted,
          }}
        >
          {current.toFixed(step < 1 ? 1 : 0)}{" "}
          <Text style={{ fontSize: 16 }}>{unit}</Text>
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={"Aumentar " + label}
          disabled={current >= max}
          onPress={() => choose(current + step)}
          style={{
            width: 48,
            height: 48,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: palette.green, fontSize: 30 }}>+</Text>
        </Pressable>
      </View>
      <Slider
        accessibilityLabel={label}
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={current}
        onValueChange={choose}
        onSlidingStart={() => Keyboard.dismiss()}
        onSlidingComplete={choose}
        minimumTrackTintColor={palette.green}
        maximumTrackTintColor={palette.surface}
        thumbTintColor={palette.green}
        style={{ height: 44, width: "100%" }}
      />
      <Label muted>
        Desliza para elegir. Usa − y + para ajustar
        {step < 1 ? " de 0.1 en 0.1" : ""}.
      </Label>
      {!selected && (
        <Button
          secondary
          title={"Confirmar " + current.toFixed(step < 1 ? 1 : 0) + " " + unit}
          onPress={() => choose(current)}
        />
      )}
    </View>
  );
}
