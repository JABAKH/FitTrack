import React, { useState } from "react";
import { Keyboard, Platform, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Button, Label } from "../ui";
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
  return (
    <View style={{ gap: 12 }}>
      <Label>Fecha de nacimiento</Label>
      <Button
        secondary
        title={
          value && Number.isFinite(parsed.getTime())
            ? parsed.toLocaleDateString("es-MX", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : "Elegir fecha de nacimiento"
        }
        onPress={() => {
          Keyboard.dismiss();
          setDraft(undefined);
          setOpen(true);
        }}
      />
      {open && (
        <DateTimePicker
          mode="date"
          value={current}
          maximumDate={new Date()}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          themeVariant="dark"
          locale="es-MX"
          onChange={(event, date) => {
            if (Platform.OS === "android") {
              setOpen(false);
              if (event.type === "set" && date) onChange(localDay(date));
            } else if (date) setDraft(date);
          }}
        />
      )}
      {open && Platform.OS === "ios" && (
        <>
          <Button
            title="Confirmar fecha"
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
