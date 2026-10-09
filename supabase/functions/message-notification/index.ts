import { admin, json, push } from "../_shared/server.ts";
Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const secret = Deno.env.get("DB_WEBHOOK_SECRET");
  if (!secret || req.headers.get("x-webhook-secret") !== secret)
    return json({ error: "Unauthorized" }, 401);
  try {
    const event = await req.json();
    if (event.type !== "INSERT" || event.table !== "messages")
      return json({ ignored: true });
    const db = admin(),
      { data: message, error } = await db
        .from("messages")
        .select("id,sender_id,conversation_id")
        .eq("id", event.record?.id)
        .single();
    if (error) throw error;
    const { data: c, error: conversationError } = await db
      .from("conversations")
      .select("id,user_id,trainers(user_id)")
      .eq("id", message.conversation_id)
      .single();
    if (conversationError) throw conversationError;
    const trainer = Array.isArray(c.trainers) ? c.trainers[0] : c.trainers;
    const recipient =
      message.sender_id === c.user_id ? trainer?.user_id : c.user_id;
    if (recipient)
      await push(
        recipient,
        "messages",
        "Nuevo mensaje",
        "Tienes un mensaje privado en FitTrack.",
        { conversation_id: c.id },
      );
    return json({ ok: true });
  } catch (e) {
    console.error("Message push failed", e);
    return json({ error: "Push failed" }, 500);
  }
});
