import { db } from "../lib/supabase";
import { localDay } from "../lib/domain";
export const personalTables = [
  "profiles",
  "fitness_goals",
  "activities",
  "daily_steps",
  "weight_history",
  "food_logs",
  "nutrition_goals",
  "trainer_subscriptions",
  "trainer_changes",
  "payments",
  "notification_preferences",
] as const;
export type PersonalTable = (typeof personalTables)[number];
export async function rows(table: string, column?: string, value?: string) {
  let q = db().from(table).select("*");
  if (column && value) q = q.eq(column, value);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}
export async function save(
  table: PersonalTable,
  userId: string,
  values: Record<string, unknown>,
  conflict?: string,
) {
  const payload = { ...values, user_id: userId };
  if (
    [
      "profiles",
      "fitness_goals",
      "nutrition_goals",
      "notification_preferences",
    ].includes(table)
  ) {
    const { error, data } = await db()
      .from(table)
      .update(values)
      .eq("user_id", userId)
      .select("user_id");
    if (error) throw error;
    if (!data?.length)
      throw new Error(
        "No existe el perfil. Verifica la migración y el trigger de registro.",
      );
    return;
  }
  const { error } = conflict
    ? await db().from(table).upsert(payload, { onConflict: conflict })
    : await db().from(table).insert(payload);
  if (error) throw error;
}
export async function saveSteps(
  steps: number,
  source: string,
  day = localDay(),
) {
  const { error } = await db().rpc("record_steps", {
    p_day: day,
    p_steps: steps,
    p_source: source,
  });
  if (error) throw error;
}
export async function invoke(name: string, body: Record<string, unknown>) {
  const { data, error } = await db().functions.invoke(name, { body });
  if (error) {
    const context = (error as { context?: Response }).context;
    if (context) {
      const detail = await context.json().catch(() => null);
      if (detail?.error) throw new Error(detail.error);
    }
    throw error;
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
