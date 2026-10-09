import React, { useState } from "react";
import { router } from "expo-router";
import { db } from "../src/lib/supabase";
import { useAuth } from "../src/providers";
import {
  Screen,
  Section,
  Label,
  Field,
  Button,
  ErrorBox,
  useAction,
} from "../src/ui";
export default function Reset() {
  const { session, finishRecovery } = useAuth(),
    [password, setPassword] = useState(""),
    a = useAction();
  return (
    <Screen title="Nueva contraseña">
      <Section>
        {session ? (
          <>
            <Field
              label="Contraseña nueva"
              value={password}
              onChange={setPassword}
              secure
            />
            <Button
              title="Guardar"
              disabled={a.busy}
              onPress={() =>
                void a.run(async () => {
                  if (password.length < 8)
                    throw new Error("Usa al menos 8 caracteres.");
                  const { error } = await db().auth.updateUser({ password });
                  if (error) throw error;
                  finishRecovery();
                  router.replace("/(tabs)");
                })
              }
            />
          </>
        ) : (
          <Label>
            Abre el enlace recibido por correo para recuperar tu cuenta.
          </Label>
        )}
      </Section>
      <ErrorBox error={a.error} />
    </Screen>
  );
}
