import CoachSchedule from "../../src/components/CoachSchedule";
import Disclosure from "../../src/components/Disclosure";
import { Feather } from "@expo/vector-icons";
import { requestCoachNotificationPermission } from "../../src/services/notifications";
import React, { useEffect, useState } from "react";
import { Image, Alert, View, Text, Linking } from "react-native";
import { useQuery } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import {
  Screen,
  Section,
  Label,
  Button,
  ErrorBox,
  Loading,
  useAction,
  Choice,
  Heading,
  Divider,
  AnimatedNumber,
  palette,
  fonts,
} from "../../src/ui";
import { useRows } from "../../src/hooks/useData";
import { db } from "../../src/lib/supabase";
import { invoke } from "../../src/services/data";
export default function Trainers() {
  const trainers = useQuery({
      queryKey: ["trainers"],
      queryFn: async () => {
        const { data, error } = await db()
          .from("trainers")
          .select("*")
          .eq("active", true);
        if (error) throw error;
        return data ?? [];
      },
    }),
    subscriptions = useRows("trainer_subscriptions"),
    payments = useRows("payments"),
    changes = useRows("trainer_changes"),
    a = useAction();
  const [sex, setSex] = useState("");
  const [tab, setTab] = useState("explore");
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const sub = subscriptions.data?.[0];
  const hasActiveCoach =
    sub?.status === "active" &&
    !sub.cancel_at_period_end &&
    !!sub.current_period_end &&
    new Date(sub.current_period_end).getTime() > now;
  const hasPendingCoach =
    sub?.status === "pending" || sub?.status === "incomplete";
  const visibleCoach =
    !!sub && sub.status !== "canceled" && !sub.cancel_at_period_end;
  const currentMonth = new Date(now).toISOString().slice(0, 7);
  const usedMonthlyChange =
    changes.data?.some(
      (change) => String(change.month).slice(0, 7) === currentMonth,
    ) ?? false;
  const nextChangeDate = new Date(
    Date.UTC(
      new Date(now).getUTCFullYear(),
      new Date(now).getUTCMonth() + 1,
      1,
    ),
  ).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
  const selectedCoach = trainers.data?.find(
    (coach) => coach.id === sub?.trainer_id,
  );
  return (
    <Screen
      title={hasActiveCoach ? "Tu coach, tu progreso" : "Encuentra tu coach"}
      eyebrow="ENTRENA CON COMPAÑÍA"
      refresh={() =>
        Promise.all([
          trainers.refetch(),
          subscriptions.refetch(),
          payments.refetch(),
          changes.refetch(),
        ])
      }
    >
      <ErrorBox
        error={
          a.error ||
          trainers.error ||
          subscriptions.error ||
          payments.error ||
          changes.error
        }
      />
      <Choice
        value={tab}
        onChange={setTab}
        options={[
          { value: "explore", label: "Explorar" },
          { value: "personal", label: "Mi entrenador personal" },
        ]}
      />
      {tab === "personal" ? (
        <>
          {subscriptions.isLoading && <Loading />}
          {!subscriptions.isLoading &&
            !subscriptions.error &&
            !visibleCoach && (
              <Section>
                <Heading title="Tu próximo aliado" icon="users" />
                <Label>Todavía no tienes un entrenador personal.</Label>
                <Label muted>
                  Explora los coaches y elige quién te acompañará. Cuando se
                  confirme el pago, encontrarás aquí a tu entrenador y sus
                  horarios.
                </Label>
                <Button
                  title="Explorar coaches"
                  onPress={() => setTab("explore")}
                />
              </Section>
            )}
          {sub && visibleCoach && (
            <Section>
              <Heading
                title={
                  hasActiveCoach ? "Mi entrenador personal" : "Tu contratación"
                }
                icon="zap"
              />
              {hasActiveCoach && trainers.isLoading && <Loading />}
              {selectedCoach && (
                <>
                  {(selectedCoach.avatar_path || selectedCoach.avatar_url) && (
                    <Image
                      source={{
                        uri:
                          selectedCoach.avatar_url ||
                          db()
                            .storage.from("trainer-photos")
                            .getPublicUrl(selectedCoach.avatar_path).data
                            .publicUrl,
                      }}
                      style={{ width: "100%", height: 220, borderRadius: 10 }}
                    />
                  )}
                  <Heading title={selectedCoach.name} />
                  <Label muted>{selectedCoach.specialty}</Label>
                </>
              )}
              {hasActiveCoach && !trainers.isLoading && !selectedCoach && (
                <Label muted>
                  Tu entrenador ya no está publicado. Puedes elegir otro en
                  Explorar.
                </Label>
              )}
              <Label>
                {hasActiveCoach
                  ? "¡Estoy listo para el próximo entreno! Te espero en el gym."
                  : sub.status === "pending"
                    ? "Esperando la confirmación de Stripe…"
                    : "Revisa el estado de tu suscripción."}
              </Label>
              {hasActiveCoach && selectedCoach && (
                <CoachSchedule trainerId={selectedCoach.id} />
              )}
              <Label>
                {sub.current_period_end
                  ? `Vence: ${new Date(sub.current_period_end).toLocaleDateString()}`
                  : "Pago pendiente"}
              </Label>
              {sub.cancel_at_period_end && (
                <Label muted>
                  Cancelación programada · conserva tu acceso hasta la fecha
                  indicada.
                </Label>
              )}
              <Button
                secondary
                title="Cancelar entrenador"
                disabled={a.busy}
                onPress={() =>
                  Alert.alert(
                    "Cancelar entrenador",
                    "Se cancelará ahora tu suscripción y se quitará este entrenador de tu espacio. Podrás contratar otro.",
                    [
                      { text: "Volver", style: "cancel" },
                      {
                        text: "Confirmar",
                        onPress: () =>
                          void a.run(async () => {
                            await invoke("billing", { action: "cancel" });
                            await subscriptions.refetch();
                            setTab("explore");
                          }, "Entrenador cancelado. Ya puedes elegir otro."),
                      },
                    ],
                  )
                }
              />
            </Section>
          )}
          {sub && visibleCoach && (
            <Button
              secondary
              title={
                hasActiveCoach ? "Explorar otros coaches" : "Elegir un coach"
              }
              onPress={() => setTab("explore")}
            />
          )}
        </>
      ) : (
        <>
          <Section>
            <Heading
              title={
                hasActiveCoach
                  ? "Conoce otros coaches"
                  : "Elige tu entrenador personal"
              }
              icon="users"
            />
            <AnimatedNumber
              value={1500}
              suffix="MXN / mes"
              size={40}
              color={palette.green}
            />
            <Label muted>
              {hasActiveCoach && usedMonthlyChange
                ? `Ya utilizaste tu cambio gratuito este mes. El próximo estará disponible el ${nextChangeDate}.`
                : "Un cambio gratuito por mes calendario UTC con tu suscripción vigente."}
            </Label>
            <Choice
              value={sex}
              onChange={setSex}
              options={[
                { value: "", label: "Todos" },
                { value: "male", label: "Hombres" },
                { value: "female", label: "Mujeres" },
              ]}
            />
          </Section>
          {trainers.isLoading && <Loading />}
          {trainers.data
            ?.filter(
              (t) =>
                (!sex || t.sex === sex) &&
                (!hasActiveCoach || t.id !== sub.trainer_id),
            )
            .map((t) => (
              <Section key={t.id}>
                {t.avatar_path || t.avatar_url ? (
                  <Image
                    source={{
                      uri:
                        t.avatar_url ||
                        db()
                          .storage.from("trainer-photos")
                          .getPublicUrl(t.avatar_path).data.publicUrl,
                    }}
                    style={{ height: 220, borderRadius: 10 }}
                  />
                ) : (
                  <View
                    style={{
                      height: 100,
                      flexDirection: "row",
                      gap: 20,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 64,
                        fontFamily: fonts.semibold,
                        color: palette.green,
                      }}
                    >
                      {t.name
                        .split(" ")
                        .slice(0, 2)
                        .map((part: string) => part[0])
                        .join("")}
                    </Text>
                    <Feather
                      name={
                        t.specialty.includes("Running")
                          ? "navigation"
                          : t.specialty.includes("Movilidad")
                            ? "sun"
                            : "activity"
                      }
                      size={38}
                      color={palette.green}
                    />
                  </View>
                )}
                {t.photo_credit && (
                  <>
                    <Label muted>{t.photo_credit}</Label>
                    <Button
                      secondary
                      title="Créditos de fotografía"
                      onPress={() =>
                        void Linking.openURL(
                          "https://commons.wikimedia.org/wiki/File:Chris_Bumstead_on_Gymshark.jpg",
                        )
                      }
                    />
                    <Button
                      secondary
                      title="Licencia CC BY 3.0"
                      onPress={() =>
                        void Linking.openURL(
                          "https://creativecommons.org/licenses/by/3.0/",
                        )
                      }
                    />
                  </>
                )}
                <Heading title={t.name} />
                <Label muted>{t.specialty}</Label>
                <Disclosure title={"Conoce a " + t.name.split(" ")[0]}>
                  <Label muted>{t.bio}</Label>
                  <CoachSchedule trainerId={t.id} />
                </Disclosure>
                <Label muted>$1,500 MXN / mes</Label>
                {!t.is_preview && (
                  <Label>
                    {t.experience_years} años ·{" "}
                    {t.rating === null ? "Sin calificación" : `${t.rating}/5`}
                  </Label>
                )}
                <Button
                  disabled={
                    a.busy ||
                    hasPendingCoach ||
                    (hasActiveCoach &&
                      (changes.isLoading ||
                        !!changes.error ||
                        usedMonthlyChange))
                  }
                  title={
                    hasActiveCoach && sub.trainer_id === t.id
                      ? "Ver mis horarios"
                      : hasActiveCoach
                        ? usedMonthlyChange
                          ? "Cambio disponible el " + nextChangeDate
                          : "Cambiar entrenador"
                        : "Entrenar con " + t.name.split(" ")[0]
                  }
                  onPress={() =>
                    void a.run(async () => {
                      if (hasActiveCoach && sub.trainer_id === t.id) {
                        setTab("personal");
                      } else if (hasActiveCoach) {
                        await requestCoachNotificationPermission().catch(
                          () => false,
                        );
                        await invoke("billing", {
                          action: "change",
                          trainer_id: t.id,
                        });
                        await subscriptions.refetch();
                        await changes.refetch();
                        setTab("personal");
                      } else {
                        await requestCoachNotificationPermission().catch(
                          () => false,
                        );
                        const result = await invoke("billing", {
                          action: "checkout",
                          trainer_id: t.id,
                        });
                        await WebBrowser.openBrowserAsync(result.url);
                        await subscriptions.refetch();
                        await payments.refetch();
                        setTab("personal");
                      }
                    })
                  }
                />
                <Divider />
              </Section>
            ))}
          {trainers.data &&
            trainers.data.filter(
              (t) =>
                (!sex || t.sex === sex) &&
                (!hasActiveCoach || t.id !== sub?.trainer_id),
            ).length === 0 && (
              <Section>
                <Label>No hay coaches disponibles con este filtro.</Label>
                <Label muted>
                  Prueba otro filtro o vuelve más tarde para ver nuevos coaches.
                </Label>
              </Section>
            )}
        </>
      )}
    </Screen>
  );
}
