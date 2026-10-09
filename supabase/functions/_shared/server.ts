import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import Stripe from "npm:stripe@18.5.0";
export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};
export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
export function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export function stripe() {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("Falta STRIPE_SECRET_KEY en el servidor");
  if (!key.startsWith("sk_test_"))
    throw new Error(
      "FitTrack solo admite claves de Stripe de pruebas; los cobros reales están bloqueados.",
    );
  return new Stripe(key, { httpClient: Stripe.createFetchHttpClient() });
}
export async function user(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("Unauthorized");
  const { data, error } = await admin().auth.getUser(token);
  if (error || !data.user) throw new Error("Unauthorized");
  const payload = JSON.parse(
    atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
  );
  if (typeof payload.session_id !== "string") throw new Error("Unauthorized");
  const { data: active, error: sessionError } = await admin().rpc(
    "session_is_active",
    { p_user: data.user.id, p_session: payload.session_id },
  );
  if (sessionError || !active) throw new Error("Unauthorized");
  // Verify the signature/user first and then reject revoked sessions on sensitive operations.
  return data.user;
}
export async function push(
  userId: string,
  key: "messages" | "renewals",
  title: string,
  body: string,
  data: Record<string, string> = {},
) {
  const { data: preferences } = await admin()
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (!preferences?.[key] || !preferences.expo_push_token) return;
  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: preferences.expo_push_token,
      sound: "default",
      title,
      body,
      data,
    }),
  });
  if (!response.ok)
    console.error("Push provider rejected notification", response.status);
}
