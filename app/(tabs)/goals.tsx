import React, { useState } from "react";
import { Text, View, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  Screen,
  Section,
  Divider,
  Heading,
  Label,
  Field,
  Button,
  ErrorBox,
  Chart,
  useAction,
  ProgressRing,
  Macro,
  Metric,
  Choice,
  palette,
  fonts,
  feedback,
} from "../../src/ui";
import Disclosure from "../../src/components/Disclosure";
import { useRows, useSave } from "../../src/hooks/useData";
import { localDay, numberValue, estimatedCalories } from "../../src/lib/domain";
import { db } from "../../src/lib/supabase";
import { useAuth } from "../../src/providers";
type FoodEntry = {
  id: string;
  name: string;
  day: string;
  calories: number | string;
  protein_g: number | string;
  carbs_g: number | string;
  fat_g: number | string;
};
function FoodRow({
  item,
  busy,
  onRemove,
}: {
  item: FoodEntry;
  busy: boolean;
  onRemove: (id: string) => void;
}) {
  return (
    <Section>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 14 }}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text
            style={{
              fontFamily: fonts.medium,
              fontSize: 14,
              color: palette.text,
              lineHeight: 22,
            }}
          >
            {item.name}
          </Text>
          <Label muted>
            {item.day} · P {item.protein_g} g · C {item.carbs_g} g · G{" "}
            {item.fat_g} g
          </Label>
        </View>
        <View style={{ alignItems: "flex-end", gap: 8 }}>
          <Text
            style={{
              fontFamily: fonts.semibold,
              color: palette.green,
              fontSize: 16,
            }}
          >
            {Number(item.calories).toFixed(0)}{" "}
            <Text style={{ fontSize: 10 }}>kcal</Text>
          </Text>
          <Pressable
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={`Eliminar ${item.name}`}
            hitSlop={10}
            onPress={() => {
              feedback();
              onRemove(item.id);
            }}
            style={{
              minWidth: 44,
              minHeight: 44,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Feather name="trash-2" size={16} color={palette.muted} />
          </Pressable>
        </View>
      </View>
      <Divider />
    </Section>
  );
}
export default function Goals() {
  const goals = useRows("fitness_goals"),
    nutrition = useRows("nutrition_goals"),
    weights = useRows("weight_history"),
    foods = useRows("food_logs"),
    profile = useRows("profiles"),
    cache = useQueryClient(),
    { session } = useAuth();
  const goalSave = useSave("fitness_goals", "user_id"),
    nutritionSave = useSave("nutrition_goals", "user_id"),
    weightSave = useSave("weight_history", "user_id,day"),
    foodSave = useSave("food_logs");
  const [dailyDraft, setDaily] = useState<string>(),
    [targetDraft, setTarget] = useState<string>(),
    [caloriesDraft, setCalories] = useState<string>(),
    [proteinGoalDraft, setProteinGoal] = useState<string>(),
    [carbsGoalDraft, setCarbsGoal] = useState<string>(),
    [fatGoalDraft, setFatGoal] = useState<string>(),
    [weight, setWeight] = useState(""),
    [food, setFood] = useState(""),
    [kcal, setKcal] = useState(""),
    [protein, setProtein] = useState("0"),
    [carbs, setCarbs] = useState("0"),
    [fat, setFat] = useState("0"),
    [mode, setMode] = useState("nutrition"),
    a = useAction();
  const today = foods.data?.filter((f) => f.day === localDay()) ?? [],
    ng = nutrition.data?.[0],
    g = goals.data?.[0];
  const daily = dailyDraft ?? String(g?.daily_steps ?? 8000),
    target = targetDraft ?? String(g?.target_weight_kg ?? ""),
    calories = caloriesDraft ?? String(ng?.calories ?? 2000),
    proteinGoal = proteinGoalDraft ?? String(ng?.protein_g ?? 100),
    carbsGoal = carbsGoalDraft ?? String(ng?.carbs_g ?? 250),
    fatGoal = fatGoalDraft ?? String(ng?.fat_g ?? 65);
  const total = (key: string) => today.reduce((n, f) => n + Number(f[key]), 0),
    history = [...(weights.data ?? [])].sort((a, b) =>
      a.day.localeCompare(b.day),
    );
  async function removeFood(id: string) {
    const { error } = await db().from("food_logs").delete().eq("id", id);
    if (error) throw error;
    await cache.invalidateQueries({ queryKey: ["food_logs"] });
  }

  return (
    <Screen
      title="Objetivos & balance"
      eyebrow="NUTRICIÓN Y METAS"
      refresh={() =>
        Promise.all([
          goals.refetch(),
          nutrition.refetch(),
          weights.refetch(),
          foods.refetch(),
        ])
      }
    >
      <Choice
        value={mode}
        onChange={setMode}
        options={[
          { value: "nutrition", label: "Nutrición" },
          { value: "progress", label: "Progreso" },
        ]}
      />
      <ErrorBox
        error={
          a.error ||
          goals.error ||
          nutrition.error ||
          weights.error ||
          foods.error ||
          profile.error
        }
      />
      {mode === "nutrition" ? (
        <>
          <ProgressRing
            label="Consumidas hoy"
            value={foods.data ? total("calories") : null}
            goal={Number(ng?.calories ?? 2000)}
            unit="kcal"
            color={palette.orange}
            size={234}
          />
          <Section>
            <Heading title="Macronutrientes" icon="pie-chart" />
            <Macro
              label="Proteína"
              value={total("protein_g")}
              goal={Number(ng?.protein_g ?? 100)}
              color={palette.green}
            />
            <Macro
              label="Carbohidratos"
              value={total("carbs_g")}
              goal={Number(ng?.carbs_g ?? 250)}
              color={palette.orange}
            />
            <Macro
              label="Grasas"
              value={total("fat_g")}
              goal={Number(ng?.fat_g ?? 65)}
              color={palette.purple}
            />
          </Section>
          <Divider />
          <Section>
            <Heading title="Tus comidas de hoy" icon="coffee" />
            {today.length === 0 && (
              <Label muted>Aún no registraste alimentos hoy.</Label>
            )}
            {today.map((f) => (
              <FoodRow
                key={f.id}
                item={f}
                busy={a.busy}
                onRemove={(id) => void a.run(() => removeFood(id))}
              />
            ))}
            <Disclosure title="Registrar una comida">
              <Field
                label="Alimento y porción"
                value={food}
                onChange={setFood}
              />
              <Field label="Calorías" value={kcal} onChange={setKcal} numeric />
              <Field
                label="Proteínas (g)"
                value={protein}
                onChange={setProtein}
                numeric
              />
              <Field
                label="Carbohidratos (g)"
                value={carbs}
                onChange={setCarbs}
                numeric
              />
              <Field label="Grasas (g)" value={fat} onChange={setFat} numeric />
              <Button
                title="Guardar alimento"
                disabled={a.busy}
                onPress={() =>
                  void a.run(async () => {
                    if (!food.trim()) throw new Error("Ingresa el alimento.");
                    await foodSave.mutateAsync({
                      day: localDay(),
                      name: food.trim(),
                      calories: numberValue(kcal),
                      protein_g: numberValue(protein),
                      carbs_g: numberValue(carbs),
                      fat_g: numberValue(fat),
                    });
                    setFood("");
                    setKcal("");
                  }, "Alimento registrado")
                }
              />
            </Disclosure>
          </Section>
          <Divider />
          <Disclosure title="Ajustar objetivos nutricionales">
            <Field
              label="Calorías diarias"
              value={calories}
              onChange={setCalories}
              numeric
            />
            <Field
              label="Proteína objetivo (g)"
              value={proteinGoal}
              onChange={setProteinGoal}
              numeric
            />
            <Field
              label="Carbohidratos objetivo (g)"
              value={carbsGoal}
              onChange={setCarbsGoal}
              numeric
            />
            <Field
              label="Grasa objetivo (g)"
              value={fatGoal}
              onChange={setFatGoal}
              numeric
            />
            <Button
              secondary
              title="Calcular con mis datos"
              onPress={() =>
                void a.run(async () => {
                  const p = profile.data?.[0];
                  if (
                    !p?.weight_kg ||
                    !p?.height_cm ||
                    !p?.birth_date ||
                    !["male", "female"].includes(p.sex)
                  )
                    throw new Error(
                      "Completa peso, altura, nacimiento y sexo en Perfil para usar Mifflin-St Jeor.",
                    );
                  const age = Math.floor(
                    (Date.now() -
                      new Date(p.birth_date + "T12:00:00").getTime()) /
                      (365.2425 * 86400000),
                  );
                  setCalories(
                    String(
                      estimatedCalories(
                        Number(p.weight_kg),
                        Number(p.height_cm),
                        age,
                        p.sex,
                      ),
                    ),
                  );
                })
              }
            />
            <Label muted>
              Mifflin-St Jeor con actividad ligera. Estimación orientativa.
            </Label>
            <Button
              disabled={a.busy}
              title="Guardar objetivos nutricionales"
              onPress={() =>
                void a.run(
                  () =>
                    nutritionSave.mutateAsync({
                      calories: Math.round(numberValue(calories, 500, 10000)),
                      protein_g: numberValue(proteinGoal),
                      carbs_g: numberValue(carbsGoal),
                      fat_g: numberValue(fatGoal),
                    }),
                  "Nutrición guardada",
                )
              }
            />
          </Disclosure>
          <Disclosure title="Historial de alimentos">
            {[...(foods.data ?? [])]
              .sort((a, b) => b.created_at.localeCompare(a.created_at))
              .slice(0, 30)
              .map((f) => (
                <FoodRow
                  key={f.id}
                  item={f}
                  busy={a.busy}
                  onRemove={(id) => void a.run(() => removeFood(id))}
                />
              ))}
          </Disclosure>
        </>
      ) : (
        <>
          <Section>
            <Heading title="Cada semana cuenta" icon="trending-up" />
            <View style={{ flexDirection: "row", gap: 24 }}>
              <Metric
                label="Peso actual"
                value={
                  profile.data?.[0]?.weight_kg
                    ? Number(profile.data[0].weight_kg)
                    : null
                }
                unit="kg"
              />
              <Metric
                label="Objetivo"
                value={g?.target_weight_kg ? Number(g.target_weight_kg) : null}
                unit="kg"
                color={palette.green}
              />
            </View>
            <Chart
              line
              values={history.slice(-12).map((w) => ({
                label: w.day.slice(5),
                value: Number(w.weight_kg),
              }))}
              unit="kg"
            />
          </Section>
          <Divider />
          <Section>
            <Heading title="Registro de peso" icon="edit-3" />
            <Field
              label="Peso de hoy (kg)"
              value={weight}
              onChange={setWeight}
              numeric
            />
            <Button
              disabled={a.busy}
              title="Registrar peso"
              onPress={() =>
                void a.run(async () => {
                  const kg = numberValue(weight, 20, 500);
                  await weightSave.mutateAsync({
                    day: localDay(),
                    weight_kg: kg,
                  });
                  const { error } = await db()
                    .from("profiles")
                    .update({ weight_kg: kg })
                    .eq("user_id", session!.user.id);
                  if (error) throw error;
                  await cache.invalidateQueries({ queryKey: ["profiles"] });
                  setWeight("");
                }, "Peso registrado")
              }
            />
          </Section>
          <Divider />
          <Section>
            <Heading title="Tus objetivos" icon="target" />
            <View style={{ flexDirection: "row", gap: 24 }}>
              <Metric
                label="Meta diaria"
                value={g ? Number(g.daily_steps) : null}
                unit="pasos"
                color={palette.green}
              />
              <Metric
                label="Meta semanal"
                value={g ? Number(g.weekly_activity_minutes) : null}
                unit="min"
                color={palette.purple}
              />
            </View>
            <Disclosure title="Ajustar mis metas">
              <Field
                label="Meta de pasos diarios"
                value={daily}
                onChange={setDaily}
                numeric
              />
              <Field
                label="Peso objetivo (kg)"
                value={target}
                onChange={setTarget}
                numeric
              />
              <Button
                disabled={a.busy}
                title="Guardar objetivos"
                onPress={() =>
                  void a.run(
                    () =>
                      goalSave.mutateAsync({
                        daily_steps: Math.round(
                          numberValue(daily, 100, 100000),
                        ),
                        target_weight_kg: numberValue(target, 20, 500),
                      }),
                    "Objetivos guardados",
                  )
                }
              />
            </Disclosure>
          </Section>
        </>
      )}
    </Screen>
  );
}
