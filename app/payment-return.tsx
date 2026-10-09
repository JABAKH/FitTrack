import React from "react";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Screen, Section, Label, Button } from "../src/ui";
export default function Return() {
  const cache = useQueryClient();
  return (
    <Screen title="Estado del pago">
      <Section>
        <Label>
          El servidor confirma tu suscripción mediante el webhook. Volver a la
          app no confirma un cobro.
        </Label>
        <Button
          title="Consultar suscripción"
          onPress={() => {
            void cache.invalidateQueries({
              queryKey: ["trainer_subscriptions"],
            });
            router.replace("/(tabs)/trainers");
          }}
        />
      </Section>
    </Screen>
  );
}
