import BirthDatePicker from "../src/components/BirthDatePicker";
import MeasurementPicker from "../src/components/MeasurementPicker";
import React, { useState } from "react";
import { useAuth } from "../src/providers";
import { useRows, useSave } from "../src/hooks/useData";
import { db } from "../src/lib/supabase";
import { numberValue } from "../src/lib/domain";
import {
  Screen,
  Section,
  Label,
  Field,
  Choice,
  Button,
  ErrorBox,
  useAction,
  ProgressBar,
} from "../src/ui";
export default function Onboarding() {
  const profile = useRows("profiles"),
    save = useSave("profiles", "user_id"),
    a = useAction(),
    { online } = useAuth();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const p = profile.data?.[0];
  const value = (key: string) => draft[key] ?? String(p?.[key] ?? "");
  const field = (key: string) => (text: string) =>
    setDraft((previous) => ({ ...previous, [key]: text }));
  const completed = [
    "full_name",
    "birth_date",
    "sex",
    "height_cm",
    "weight_kg",
    "units",
  ].filter((key) => value(key).trim()).length;
  return (
    <Screen title="Cuéntanos sobre ti" eyebrow="COMPLETA TU REGISTRO">
      <Section>
        <Label>{completed} de 6 datos completados</Label>
        <ProgressBar value={completed} goal={6} />
        <Label muted>
          Necesitamos tus datos reales para personalizar tu progreso. Puedes
          actualizarlos después en Perfil.
        </Label>
        <Field
          label="Nombre completo"
          value={value("full_name")}
          onChange={field("full_name")}
        />
        <BirthDatePicker
          value={value("birth_date")}
          onChange={field("birth_date")}
        />
        <Label>Sexo</Label>
        <Choice
          value={value("sex")}
          onChange={field("sex")}
          options={[
            { value: "male", label: "Hombre" },
            { value: "female", label: "Mujer" },
            { value: "other", label: "Otro" },
          ]}
        />
        <MeasurementPicker
          label="Altura"
          value={value("height_cm")}
          onChange={field("height_cm")}
          unit="cm"
          min={50}
          max={300}
          step={1}
          initial={170}
        />
        <MeasurementPicker
          label="Peso actual"
          value={value("weight_kg")}
          onChange={field("weight_kg")}
          unit="kg"
          min={20}
          max={500}
          step={0.1}
          initial={70}
        />
        <Label>Unidades para mostrar tu progreso</Label>
        <Choice
          value={value("units")}
          onChange={field("units")}
          options={[
            { value: "metric", label: "kg · km" },
            { value: "imperial", label: "lb · mi" },
          ]}
        />
        <ErrorBox error={a.error || profile.error} />
        <Button
          title="Guardar y comenzar"
          disabled={a.busy || save.isPending}
          onPress={() =>
            void a.run(async () => {
              if (!online)
                throw new Error(
                  "Necesitas conexión para guardar tus datos. El formulario se conserva.",
                );
              const name = value("full_name").trim(),
                birth = value("birth_date").trim(),
                sex = value("sex");
              if (!name) throw new Error("Ingresa tu nombre completo.");
              const date = new Date(birth + "T12:00:00Z");
              if (
                !/^\d{4}-\d{2}-\d{2}$/.test(birth) ||
                !Number.isFinite(date.getTime()) ||
                date.toISOString().slice(0, 10) !== birth ||
                date > new Date()
              )
                throw new Error("Selecciona tu fecha de nacimiento.");
              if (!["male", "female", "other"].includes(sex))
                throw new Error("Selecciona tu sexo.");
              await save.mutateAsync({
                full_name: name,
                birth_date: birth,
                sex,
                height_cm: numberValue(value("height_cm"), 50, 300),
                weight_kg: numberValue(value("weight_kg"), 20, 500),
                units: value("units") || "metric",
                theme: "dark",
              });
            })
          }
        />
        <Button
          title="Cerrar sesión"
          secondary
          disabled={a.busy}
          onPress={() =>
            void a.run(async () => {
              const { error } = await db().auth.signOut();
              if (error) throw error;
            })
          }
        />
      </Section>
    </Screen>
  );
}
