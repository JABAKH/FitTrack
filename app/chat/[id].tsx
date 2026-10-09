import { View, Text } from "react-native";
import React, { useEffect, useRef, useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import {
  Screen,
  Section,
  Label,
  Button,
  Field,
  ErrorBox,
  Loading,
  useAction,
  palette,
  fonts,
} from "../../src/ui";
import { db } from "../../src/lib/supabase";
import { useAuth } from "../../src/providers";
export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { session, online } = useAuth(),
    cache = useQueryClient(),
    [body, setBody] = useState(""),
    pending = useRef<{ id: string; body: string } | null>(null),
    a = useAction();
  const query = useQuery({
    queryKey: ["messages", id],
    queryFn: async () => {
      const { data, error } = await db()
        .from("messages")
        .select("*")
        .eq("conversation_id", id)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data?.reverse() ?? [];
    },
  });
  useEffect(() => {
    const c = db()
      .channel(`messages-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${id}`,
        },
        () => void cache.invalidateQueries({ queryKey: ["messages", id] }),
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED")
          void cache.invalidateQueries({ queryKey: ["messages", id] });
      });
    return () => {
      void db().removeChannel(c);
    };
  }, [id, cache]);
  return (
    <Screen title="Chat privado" refresh={() => query.refetch()}>
      <Button secondary title="Volver" onPress={() => router.back()} />
      <Label muted>
        Últimos 100 mensajes. El chat requiere una suscripción activa para
        enviar.
      </Label>
      {query.isLoading && <Loading />}
      <ErrorBox
        error={query.error || a.error}
        retry={() => void query.refetch()}
      />
      {query.data?.map((m) => (
        <Section key={m.id}>
          <View
            style={{
              alignSelf:
                m.sender_id === session?.user.id ? "flex-end" : "flex-start",
              maxWidth: "90%",
              gap: 7,
              paddingVertical: 6,
              paddingLeft: 14,
              borderLeftWidth: 2,
              borderLeftColor:
                m.sender_id === session?.user.id
                  ? palette.green
                  : palette.purple,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.semibold,
                fontSize: 11,
                color:
                  m.sender_id === session?.user.id
                    ? palette.green
                    : palette.purple,
              }}
            >
              {m.sender_id === session?.user.id ? "Tú" : "Entrenador / cliente"}
            </Text>
            <Label>{m.body}</Label>
            <Label muted>{new Date(m.created_at).toLocaleString()}</Label>
          </View>
        </Section>
      ))}
      <Section>
        <Field label="Mensaje" value={body} onChange={setBody} />
        <Button
          title="Enviar"
          disabled={a.busy || !online || !body.trim()}
          onPress={() =>
            void a.run(async () => {
              if (body.trim().length > 4000)
                throw new Error("Máximo 4000 caracteres.");
              if (!pending.current || pending.current.body !== body.trim())
                pending.current = {
                  id: Crypto.randomUUID(),
                  body: body.trim(),
                };
              const message = pending.current;
              const { error } = await db().from("messages").insert({
                id: message.id,
                conversation_id: id,
                sender_id: session!.user.id,
                body: message.body,
              });
              if (error && error.code !== "23505") throw error;
              pending.current = null;
              setBody("");
              await query.refetch();
            })
          }
        />
      </Section>
    </Screen>
  );
}
