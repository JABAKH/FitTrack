import Disclosure from "../../src/components/Disclosure";
import React, { useEffect, useState } from "react";
import { Alert, Image, Switch, View, Text } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Crypto from "expo-crypto";
import { useQueryClient } from "@tanstack/react-query";
import {
  Screen,
  Section,
  Label,
  Field,
  Button,
  ErrorBox,
  useAction,
  Heading,
  Divider,
  Choice,
  palette,
  fonts,
} from "../../src/ui";
import { useRows, useSave } from "../../src/hooks/useData";
import { useAuth } from "../../src/providers";
import { db } from "../../src/lib/supabase";
import { numberValue } from "../../src/lib/domain";
import { invoke } from "../../src/services/data";
import { configureNotifications } from "../../src/services/notifications";
export default function Profile() {
  const { session } = useAuth(),
    profile = useRows("profiles"),
    prefsQuery = useRows("notification_preferences"),
    save = useSave("profiles", "user_id"),
    prefsSave = useSave("notification_preferences", "user_id"),
    cache = useQueryClient(),
    a = useAction();
  const [nameDraft, setName] = useState<string>(),
    [heightDraft, setHeight] = useState<string>(),
    [weightDraft, setWeight] = useState<string>(),
    [birthDraft, setBirth] = useState<string>(),
    [sexDraft, setSex] = useState<string>(),
    [unitsDraft, setUnits] = useState<string>(),
    [photo, setPhoto] = useState<string>(),
    [prefsDraft, setPrefs] = useState<{
      activity: boolean;
      steps: boolean;
      weight: boolean;
      messages: boolean;
      renewals: boolean;
    } | null>(null);
  useEffect(() => {
    const p = profile.data?.[0];
    if (p) {
      if (p.avatar_path)
        void db()
          .storage.from("avatars")
          .createSignedUrl(p.avatar_path, 3600)
          .then(({ data, error }) => {
            if (error) throw error;
            setPhoto(data?.signedUrl);
          })
          .catch(() => setPhoto(undefined));
    }
  }, [profile.data]);
  const p = profile.data?.[0],
    n = prefsQuery.data?.[0];
  const name = nameDraft ?? p?.full_name ?? "",
    height = heightDraft ?? String(p?.height_cm ?? ""),
    weight = weightDraft ?? String(p?.weight_kg ?? ""),
    birth = birthDraft ?? p?.birth_date ?? "",
    sex = sexDraft ?? p?.sex ?? "other",
    units = unitsDraft ?? p?.units ?? "metric";
  const prefs = prefsDraft ?? {
    activity: n?.activity ?? true,
    steps: n?.steps ?? true,
    weight: n?.weight ?? true,
    messages: n?.messages ?? true,
    renewals: n?.renewals ?? true,
  };
  return (
    <Screen title="Tu espacio" eyebrow="PERFIL Y PREFERENCIAS">
      <Section>
        <Text
          style={{
            fontFamily: fonts.semibold,
            fontSize: 24,
            color: palette.text,
          }}
        >
          {p?.full_name || "Mi perfil"}
        </Text>
        <Label muted>Tu información, tus preferencias y tu progreso.</Label>
      </Section>
      <ErrorBox error={a.error || profile.error || prefsQuery.error} />
      <Section>
        <Heading title="Información personal" icon="user" />
        {photo && (
          <Image
            source={{ uri: photo }}
            style={{ height: 100, width: 100, borderRadius: 50 }}
          />
        )}
        <Button
          secondary
          title="Cambiar fotografía"
          disabled={a.busy}
          onPress={() =>
            void a.run(async () => {
              const permission =
                await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (!permission.granted)
                throw new Error("Permite acceso a fotografías.");
              const pick = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images"],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
              });
              if (pick.canceled) return;
              const asset = pick.assets[0],
                bytes = await (await fetch(asset.uri)).arrayBuffer();
              if (bytes.byteLength > 5242880)
                throw new Error("La imagen debe pesar menos de 5 MB.");
              const type = asset.mimeType ?? "image/jpeg",
                ext =
                  type === "image/png"
                    ? "png"
                    : type === "image/webp"
                      ? "webp"
                      : "jpg",
                path = `${session!.user.id}/${Crypto.randomUUID()}.${ext}`;
              const { error } = await db()
                .storage.from("avatars")
                .upload(path, bytes, { contentType: type });
              if (error) throw error;
              const old = profile.data?.[0]?.avatar_path;
              const { error: saveError } = await db()
                .from("profiles")
                .update({ avatar_path: path })
                .eq("user_id", session!.user.id);
              if (saveError) {
                await db().storage.from("avatars").remove([path]);
                throw saveError;
              }
              if (old) await db().storage.from("avatars").remove([old]);
              await cache.invalidateQueries({ queryKey: ["profiles"] });
            })
          }
        />
        <Label>{name || "Completa tu perfil"}</Label>
        <Disclosure title="Editar información personal">
          <Field label="Nombre completo" value={name} onChange={setName} />
          <Field
            label="Fecha de nacimiento (AAAA-MM-DD)"
            value={birth}
            onChange={setBirth}
          />
          <Field
            label="Altura (cm)"
            value={height}
            onChange={setHeight}
            numeric
          />
          <Field
            label="Peso (kg)"
            value={weight}
            onChange={setWeight}
            numeric
          />
          <Choice
            value={sex}
            onChange={setSex}
            options={[
              { value: "male", label: "Hombre" },
              { value: "female", label: "Mujer" },
              { value: "other", label: "Otro" },
            ]}
          />
          <Button
            title="Guardar perfil"
            disabled={a.busy}
            onPress={() =>
              void a.run(async () => {
                if (!name.trim()) throw new Error("Ingresa tu nombre.");
                if (
                  !/^\d{4}-\d{2}-\d{2}$/.test(birth) ||
                  !Number.isFinite(Date.parse(birth)) ||
                  new Date(birth) > new Date()
                )
                  throw new Error("Fecha de nacimiento inválida.");
                await save.mutateAsync({
                  full_name: name.trim(),
                  birth_date: birth,
                  height_cm: numberValue(height, 50, 300),
                  weight_kg: numberValue(weight, 20, 500),
                  sex,
                  units,
                  theme: "dark",
                });
              }, "Perfil actualizado")
            }
          />
        </Disclosure>
      </Section>
      <Section>
        <Divider />
        <Heading title="Preferencias" icon="sliders" />
        <Button
          secondary
          title={`Unidades: ${units === "metric" ? "métricas" : "imperiales"}`}
          onPress={() => {
            const next = units === "metric" ? "imperial" : "metric";
            setUnits(next);
            void a.run(() => save.mutateAsync({ units: next }));
          }}
        />
        <Label muted>Introduce el peso en kg y la altura en cm.</Label>
        <Label muted>Apariencia Dark Minimalist Premium</Label>
      </Section>
      <Section>
        <Divider />
        <Heading title="Notificaciones" icon="bell" />
        {Object.entries(prefs).map(([key, value]) => (
          <View
            key={key}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Label>
              {
                (
                  {
                    activity: "Actividad",
                    steps: "Meta de pasos",
                    weight: "Peso",
                    messages: "Mensajes",
                    renewals: "Renovaciones",
                  } as Record<string, string>
                )[key]
              }
            </Label>
            <Switch
              trackColor={{ false: palette.surface, true: palette.green }}
              thumbColor={palette.text}
              ios_backgroundColor={palette.surface}
              value={value}
              onValueChange={(v) =>
                setPrefs((p) => ({ ...(p ?? prefs), [key]: v }))
              }
            />
          </View>
        ))}
        <Button
          title="Guardar y activar recordatorios"
          disabled={a.busy}
          onPress={() =>
            void a.run(async () => {
              await prefsSave.mutateAsync(prefs);
              await configureNotifications(session!.user.id, prefs);
            }, "Preferencias guardadas y recordatorios configurados")
          }
        />
      </Section>
      <Button
        secondary
        title="Cerrar sesión"
        onPress={() =>
          void a.run(async () => {
            const { error } = await db().auth.signOut();
            if (error) throw error;
          })
        }
      />
      <Button
        secondary
        title="Eliminar cuenta"
        disabled={a.busy}
        onPress={() =>
          Alert.alert(
            "Eliminar cuenta",
            "Se eliminarán tu perfil y datos de fitness. Se cancelará la suscripción. Los registros de cobros se conservarán sin asociarlos a tu cuenta.",
            [
              { text: "Volver", style: "cancel" },
              {
                text: "Eliminar",
                style: "destructive",
                onPress: () =>
                  void a.run(async () => {
                    await invoke("delete-account", {});
                    await db().auth.signOut({ scope: "local" });
                  }),
              },
            ],
          )
        }
      />
    </Screen>
  );
}
