export function billingErrorMessage(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "23505"
  ) {
    const detail = "message" in error ? String(error.message) : "";
    if (detail.includes("trainer_changes_user_id_month_key"))
      return "Ya usaste tu cambio gratuito de entrenador este mes. Podrás cambiar nuevamente el primer día del próximo mes.";
  }
  if (error && typeof error === "object" && "message" in error) {
    const message = String(error.message);
    if (
      [
        "Suscripción inactiva",
        "Ya tienes este entrenador",
        "Entrenador no disponible",
      ].includes(message) ||
      message.startsWith("Ya usaste tu cambio gratuito")
    )
      return message;
  }
  return error instanceof Error
    ? error.message
    : "No se pudo completar la operación. Intenta nuevamente.";
}
