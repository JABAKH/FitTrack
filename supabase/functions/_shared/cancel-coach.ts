import Stripe from "npm:stripe@18.5.0";
export async function cancelCoachStripe(
  gateway: Stripe,
  subscriptionId: string,
) {
  const current = await gateway.subscriptions.retrieve(subscriptionId);
  if (current.livemode) throw new Error("Live subscription blocked");
  if (["canceled", "incomplete_expired"].includes(current.status))
    return current;
  return await gateway.subscriptions.cancel(subscriptionId, {
    invoice_now: false,
    prorate: false,
  });
}
