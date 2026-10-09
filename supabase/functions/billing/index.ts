import { billingErrorMessage } from "../_shared/billing-error.ts";
import { cancelCoachStripe } from "../_shared/cancel-coach.ts";
import { admin, cors, json, stripe, user } from "../_shared/server.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let uid: string | undefined,
    locked = false;
  try {
    const u = await user(req);
    uid = u.id;
    const input = await req.json(),
      db = admin(),
      gateway = stripe();
    const { data: acquired, error: lockError } = await db.rpc(
      "acquire_billing_lock",
      { p_user: uid },
    );
    if (lockError) throw lockError;
    if (!acquired)
      return json(
        {
          error:
            "Otra operación de pago está en curso. Reintenta en un minuto.",
        },
        409,
      );
    locked = true;
    const { data: existing, error: readError } = await db
      .from("trainer_subscriptions")
      .select("*")
      .eq("user_id", uid)
      .maybeSingle();
    if (readError) throw readError;
    if (input.action === "change") {
      if (typeof input.trainer_id !== "string")
        return json({ error: "Entrenador inválido" }, 400);
      const { data, error } = await db.rpc("change_trainer", {
        p_user: uid,
        p_trainer: input.trainer_id,
      });
      if (error) throw error;
      return json({ conversation_id: data });
    }
    if (input.action === "cancel") {
      if (!existing) return json({ ok: true });
      let subscriptionId = existing.stripe_subscription_id;
      if (existing.checkout_session_id) {
        const session = await gateway.checkout.sessions.retrieve(
          existing.checkout_session_id,
        );
        if (session.livemode) throw new Error("Live checkout blocked");
        if (session.status === "open")
          await gateway.checkout.sessions.expire(session.id);
        if (!subscriptionId && session.subscription)
          subscriptionId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;
      }
      if (subscriptionId) await cancelCoachStripe(gateway, subscriptionId);
      const { error } = await db
        .from("trainer_subscriptions")
        .update({
          status: "canceled",
          cancel_at_period_end: false,
          current_period_end: null,
          checkout_session_id: null,
          billing_attempt: crypto.randomUUID(),
        })
        .eq("user_id", uid);
      if (error) throw error;
      return json({ ok: true });
    }
    if (input.action !== "checkout")
      return json({ error: "Acción inválida" }, 400);
    const { data: trainer, error: trainerError } = await db
      .from("trainers")
      .select("id,user_id")
      .eq("id", input.trainer_id)
      .eq("active", true)
      .single();
    if (trainerError || !trainer)
      return json({ error: "Entrenador no disponible" }, 400);
    if (trainer.user_id === uid)
      return json({ error: "No puedes contratarte a ti mismo" }, 400);
    if (existing?.stripe_subscription_id) {
      let old = await gateway.subscriptions.retrieve(
        existing.stripe_subscription_id,
      );
      if (old.cancel_at_period_end)
        old = await cancelCoachStripe(gateway, old.id);
      if (!["canceled", "incomplete_expired"].includes(old.status))
        return json(
          {
            error: "Ya existe una suscripción; administra o cancela la actual.",
          },
          409,
        );
    }
    if (existing?.checkout_session_id) {
      const old = await gateway.checkout.sessions.retrieve(
        existing.checkout_session_id,
      );
      if (old.status === "open") return json({ url: old.url });
      if (old.status === "complete" && existing.status === "pending")
        return json({ error: "El pago está en proceso de confirmación." }, 409);
    }
    const priceId = Deno.env.get("STRIPE_PRICE_ID");
    if (!priceId) throw new Error("Falta STRIPE_PRICE_ID en el servidor");
    const price = await gateway.prices.retrieve(priceId);
    if (
      price.livemode ||
      !price.active ||
      price.currency !== "mxn" ||
      price.unit_amount !== 150000 ||
      price.recurring?.interval !== "month" ||
      price.recurring.interval_count !== 1
    )
      throw new Error("El precio debe ser 1500 MXN cada mes.");
    const returnUrl = Deno.env.get("APP_RETURN_URL");
    if (!returnUrl)
      throw new Error(
        "Falta APP_RETURN_URL: URL HTTPS que vuelve a fittrack://payment-return",
      );
    if (!returnUrl.startsWith("https://"))
      throw new Error("Stripe Checkout requiere una URL HTTPS de retorno.");
    const attempt =
      existing?.status === "pending" &&
      !existing.checkout_session_id &&
      existing.billing_attempt
        ? existing.billing_attempt
        : crypto.randomUUID();
    const { error: initError } = await db.from("trainer_subscriptions").upsert(
      {
        user_id: uid,
        trainer_id: trainer.id,
        status: "pending",
        billing_attempt: attempt,
        stripe_subscription_id: null,
        stripe_customer_id: null,
        checkout_session_id: null,
        cancel_at_period_end: false,
        current_period_end: null,
      },
      { onConflict: "user_id" },
    );
    if (initError) throw initError;
    const checkout = await gateway.checkout.sessions.create(
      {
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        client_reference_id: uid,
        customer_email: u.email,
        success_url: returnUrl,
        cancel_url: returnUrl,
        subscription_data: {
          metadata: { user_id: uid, billing_attempt: attempt },
        },
        metadata: { user_id: uid, billing_attempt: attempt },
      },
      { idempotencyKey: `checkout-${attempt}` },
    );
    if (checkout.livemode) throw new Error("Sesión de pago real bloqueada.");
    const { error: saveError } = await db
      .from("trainer_subscriptions")
      .update({ checkout_session_id: checkout.id })
      .eq("user_id", uid)
      .eq("billing_attempt", attempt);
    if (saveError) throw saveError;
    return json({ url: checkout.url });
  } catch (e) {
    const message = billingErrorMessage(e);
    return json({ error: message }, message === "Unauthorized" ? 401 : 400);
  } finally {
    if (locked && uid)
      await admin().rpc("release_billing_lock", { p_user: uid });
  }
});
