import { admin, cors, json, stripe, user } from "../_shared/server.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const u = await user(req),
      db = admin();
    const { data: sub, error: subError } = await db
      .from("trainer_subscriptions")
      .select("*")
      .eq("user_id", u.id)
      .maybeSingle();
    if (subError) throw subError;
    if (sub?.stripe_subscription_id) {
      const gateway = stripe(),
        current = await gateway.subscriptions.retrieve(
          sub.stripe_subscription_id,
        );
      if (current.status !== "canceled")
        await gateway.subscriptions.cancel(sub.stripe_subscription_id);
    }
    if (sub?.checkout_session_id) {
      const gateway = stripe(),
        checkout = await gateway.checkout.sessions.retrieve(
          sub.checkout_session_id,
        );
      if (checkout.status === "open")
        await gateway.checkout.sessions.expire(checkout.id);
    }
    const { data: files, error: listError } = await db.storage
      .from("avatars")
      .list(u.id, { limit: 1000 });
    if (listError) throw listError;
    if (files?.length) {
      const { error } = await db.storage
        .from("avatars")
        .remove(files.map((f) => `${u.id}/${f.name}`));
      if (error) throw error;
    }
    const token = req.headers.get("authorization")!.replace(/^Bearer\s+/i, "");
    const { error: signoutError } = await db.auth.admin.signOut(
      token,
      "global",
    );
    if (signoutError) throw signoutError;
    const { error } = await db.auth.admin.deleteUser(u.id);
    if (error) throw error;
    return json({ ok: true });
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : "Error deleting account" },
      400,
    );
  }
});
