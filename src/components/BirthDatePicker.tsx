import React, { useState } from "react";
import { Keyboard, View, ScrollView, Pressable, Text } from "react-native";
import { Button, Label, palette, fonts } from "../ui";
import { localDay } from "../lib/domain";
export default function BirthDatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false),
    [draft, setDraft] = useState<Date>();
  const parsed = new Date(value + "T12:00:00");
  const current =
    draft ??
    (Number.isFinite(parsed.getTime()) ? parsed : new Date(2000, 0, 1, 12));
  const now = new Date();
  const column = (
    title: string,
    values: number[],
    selected: number,
    select: (n: number) => void,
    format: (n: number) => string = String,
  ) => (
    <View style={{ flex: 1, gap: 8 }}>
      <Label muted>{title}</Label>
      <ScrollView style={{ height: 200 }}>
        {values.map((n) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: n === selected }}
            key={n}
            onPress={() => select(n)}
            style={{ padding: 12 }}
          >
            <Text
              style={{
                fontFamily: fonts.medium,
                color: n === selected ? palette.green : palette.text,
              }}
            >
              {format(n)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
  const change = (year: number, month: number, day: number) =>
    setDraft(
      new Date(
        year,
        month,
        Math.min(day, new Date(year, month + 1, 0).getDate()),
        12,
      ),
    );
  return (
    <View style={{ gap: 12 }}>
      <Label>Fecha de nacimiento</Label>
      <Button
        secondary
        title={
          value && Number.isFinite(parsed.getTime())
            ? parsed.toLocaleDateString("es-MX")
            : "Elegir fecha de nacimiento"
        }
        onPress={() => {
          Keyboard.dismiss();
          setDraft(undefined);
          setOpen(true);
        }}
      />
      {open && (
        <>
          <View style={{ flexDirection: "row", gap: 12 }}>
            {column(
              "Día",
              Array.from(
                {
                  length: new Date(
                    current.getFullYear(),
                    current.getMonth() + 1,
                    0,
                  ).getDate(),
                },
                (_, i) => i + 1,
              ),
              current.getDate(),
              (n) => change(current.getFullYear(), current.getMonth(), n),
            )}
            {column(
              "Mes",
              Array.from({ length: 12 }, (_, i) => i),
              current.getMonth(),
              (n) => change(current.getFullYear(), n, current.getDate()),
              (n) =>
                new Date(2000, n, 1).toLocaleDateString("es-MX", {
                  month: "short",
                }),
            )}
            {column(
              "Año",
              Array.from({ length: 121 }, (_, i) => now.getFullYear() - i),
              current.getFullYear(),
              (n) => change(n, current.getMonth(), current.getDate()),
            )}
          </View>
          <Button
            title="Confirmar fecha"
            disabled={current > now}
            onPress={() => {
              onChange(localDay(current));
              setOpen(false);
            }}
          />
          <Button title="Cancelar" secondary onPress={() => setOpen(false)} />
        </>
      )}
    </View>
  );
}
