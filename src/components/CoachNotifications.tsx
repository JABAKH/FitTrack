import { useEffect } from "react";
import { useRows } from "../hooks/useData";
import { useAuth } from "../providers";
import { notifyCoachReady } from "../services/notifications";
export default function CoachNotifications() {
  const { session } = useAuth(),
    subscriptions = useRows("trainer_subscriptions");
  const sub = subscriptions.data?.[0];
  const uid = session?.user.id,
    trainerId = sub?.trainer_id,
    status = sub?.status,
    attempt = sub?.billing_attempt,
    expires = sub?.current_period_end,
    canceled = sub?.cancel_at_period_end;
  useEffect(() => {
    if (
      uid &&
      trainerId &&
      status === "active" &&
      !canceled &&
      expires &&
      new Date(expires).getTime() > Date.now()
    )
      void notifyCoachReady(
        uid,
        trainerId,
        attempt ?? sub?.id ?? "active",
      ).catch((error) =>
        console.warn("No se pudo mostrar la bienvenida del coach", error),
      );
  }, [uid, trainerId, status, attempt, expires, sub?.id, canceled]);
  return null;
}
