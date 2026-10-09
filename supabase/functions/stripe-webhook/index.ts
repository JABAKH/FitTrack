import Stripe from "npm:stripe@18.5.0";
import { admin, json, push, stripe } from "../_shared/server.ts";
Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const signature = req.headers.get("stripe-signature");
  if (!signature) return json({ error: "Missing signature" }, 400);
  if (
    !Deno.env.get("STRIPE_SECRET_KEY") ||
    !Deno.env.get("STRIPE_WEBHOOK_SECRET")
  )
    return json({ error: "Stripe is not configured" }, 503);
  let gateway: Stripe;
  try {
    gateway = stripe();
  } catch {
    return json({ error: "Only Stripe test payments are enabled" }, 503);
  }
  let event: Stripe.Event;
  try {
    event = await gateway.webhooks.constructEventAsync(
      await req.text(),
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch {
    return json({ error: "Invalid webhook signature" }, 400);
  }
  if (event.livemode) return json({ error: "Live payments are disabled" }, 400);
  try {
    let initialPayment = false;
    let subscriptionId: string | undefined,
      payment: Record<string, unknown> | null = null;
    if (event.type.startsWith("customer.subscription."))
      subscriptionId = (event.data.object as Stripe.Subscription).id;
    if (event.type === "checkout.session.completed")
      subscriptionId = String(
        (event.data.object as Stripe.Checkout.Session).subscription ?? "",
      );
    if (["invoice.paid", "invoice.payment_failed"].includes(event.type)) {
      const eventInvoice = event.data.object as Stripe.Invoice;
      const invoice = await gateway.invoices.retrieve(eventInvoice.id!);
      initialPayment =
        invoice.billing_reason === "subscription_create" &&
        invoice.status === "paid";
      const ref = invoice.parent?.subscription_details?.subscription;
      subscriptionId = typeof ref === "string" ? ref : ref?.id;
      if (invoice.currency !== "mxn")
        throw new Error("Unexpected invoice currency");
      payment = {
        id: invoice.id,
        amount:
          invoice.status === "paid" ? invoice.amount_paid : invoice.amount_due,
        status: invoice.status === "paid" ? "paid" : "failed",
      };
    }
    if (!subscriptionId) return json({ received: true });
    // Always retrieve the current Stripe state: delivery order does not determine access.
    const sub = await gateway.subscriptions.retrieve(subscriptionId),
      uid = sub.metadata.user_id,
      attempt = sub.metadata.billing_attempt;
    if (!uid || !attempt) return json({ received: true });
    const item = sub.items.data[0];
    if (item?.price.id !== Deno.env.get("STRIPE_PRICE_ID"))
      throw new Error("Unexpected subscription price");
    if (sub.livemode || item?.price.livemode)
      throw new Error("Live subscription blocked");
    const period = item.current_period_end;
    const mapped =
      sub.status === "trialing"
        ? "incomplete"
        : sub.status === "incomplete_expired"
          ? "canceled"
          : sub.status;
    const { data: accepted, error } = await admin().rpc("sync_billing", {
      p_event: event.id,
      p_user: uid,
      p_attempt: attempt,
      p_subscription: {
        id: sub.id,
        customer:
          typeof sub.customer === "string" ? sub.customer : sub.customer.id,
        status: mapped,
        period_end: period ? new Date(period * 1000).toISOString() : null,
        cancel_at_period_end: sub.cancel_at_period_end,
      },
      p_payment: payment,
    });
    if (error) throw error;
    if (accepted && payment) {
      if (initialPayment && mapped === "active") {
        const db = admin();
        const { data: assignment } = await db
          .from("trainer_subscriptions")
          .select("trainer_id")
          .eq("user_id", uid)
          .maybeSingle();
        const { data: coach } = await db
          .from("trainers")
          .select("name")
          .eq("id", assignment?.trainer_id ?? "")
          .maybeSingle();
        if (coach)
          await push(
            uid,
            "messages",
            coach.name + " · Tu próximo entreno",
            "¡Estoy listo para el próximo entreno! Te espero en el gym.",
            { app: "fittrack", url: "/(tabs)/trainers" },
          ).catch(console.error);
      } else {
        await push(
          uid,
          "renewals",
          payment.status === "paid" ? "Pago confirmado" : "Revisa tu pago",
          "Consulta el estado de tu suscripción en FitTrack.",
        ).catch(console.error);
      }
    }
    return json({ received: true });
  } catch (e) {
    console.error("Webhook processing failed", e);
    return json({ error: "Processing failed; retry webhook" }, 500);
  }
});
