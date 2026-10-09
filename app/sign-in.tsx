import Brand from "../src/components/Brand";
import React, { useState } from "react";
import {
  Section,
  Screen,
  Field,
  Button,
  Label,
  ErrorBox,
  useAction,
} from "../src/ui";
import { db } from "../src/lib/supabase";
import { authRedirect } from "../src/services/auth";
export default function SignIn() {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [register, setRegister] = useState(false);
  const action = useAction();
  return (
    <Screen
      title={register ? "Tu siguiente paso" : "Bienvenido de vuelta"}
      eyebrow="FITTRACK · FITNESS APP"
    >
      <Brand hero />
      <Section>
        <Label>Entrena a tu ritmo. Cada paso cuenta.</Label>
        <Field label="Correo electrónico" value={email} onChange={setEmail} />
        <Field
          label="Contraseña"
          value={password}
          onChange={setPassword}
          secure
        />
        <Button
          disabled={action.busy}
          title={register ? "Crear cuenta" : "Iniciar sesión"}
          onPress={() =>
            void action.run(
              async () => {
                if (
                  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
                  password.length < 8
                )
                  throw new Error(
                    "Ingresa un correo válido y contraseña de al menos 8 caracteres.",
                  );
                const { error } = register
                  ? await db().auth.signUp({
                      email: email.trim(),
                      password,
                      options: {
                        emailRedirectTo: authRedirect(),
                      },
                    })
                  : await db().auth.signInWithPassword({
                      email: email.trim(),
                      password,
                    });
                if (error) throw error;
              },
              register
                ? "Cuenta creada. Completa tus datos para comenzar."
                : undefined,
            )
          }
        />
        <Button
          secondary
          title={register ? "Ya tengo cuenta" : "Registrarme"}
          onPress={() => setRegister(!register)}
        />
        <Button
          secondary
          disabled={action.busy}
          title="Recuperar contraseña"
          onPress={() =>
            void action.run(async () => {
              if (!email.trim()) throw new Error("Escribe tu correo primero.");
              const { error } = await db().auth.resetPasswordForEmail(
                email.trim(),
                { redirectTo: authRedirect() },
              );
              if (error) throw error;
            }, "Si existe la cuenta, recibirás un enlace de recuperación.")
          }
        />
      </Section>
      <ErrorBox error={action.error} />
    </Screen>
  );
}
