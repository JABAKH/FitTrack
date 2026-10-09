import React from "react";
import { View } from "react-native";
import { Heading, Label, Divider } from "../ui";
const schedules = [
  [
    { day: "Lunes y miércoles", hours: "07:00 · 09:00 · 18:00" },
    { day: "Viernes", hours: "08:00 · 17:00" },
  ],
  [
    { day: "Martes y jueves", hours: "06:30 · 08:00 · 19:00" },
    { day: "Sábado", hours: "08:00 · 10:00" },
  ],
  [
    { day: "Lunes y viernes", hours: "09:00 · 16:00 · 18:30" },
    { day: "Miércoles", hours: "07:30 · 17:00" },
  ],
];
export default function CoachSchedule({ trainerId }: { trainerId: string }) {
  const index =
    [...trainerId].reduce((n, c) => n + c.charCodeAt(0), 0) % schedules.length;
  return (
    <View style={{ gap: 16 }}>
      <Heading title="Horarios para entrenar" icon="clock" />
      <Label muted>
        Horarios de ejemplo · sesiones de 60 minutos. No confirman una reserva.
      </Label>
      {schedules[index].map((slot) => (
        <View key={slot.day} style={{ gap: 8 }}>
          <Label>{slot.day}</Label>
          <Label muted>{slot.hours}</Label>
          <Divider />
        </View>
      ))}
    </View>
  );
}
