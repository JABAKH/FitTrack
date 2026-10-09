import React, { useEffect } from "react";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "./lib/supabase";
import { Button, Section, Label, ErrorBox } from "./ui";
export function ConversationInbox() {
  const cache = useQueryClient(),
    q = useQuery({
      queryKey: ["conversations"],
      queryFn: async () => {
        const { data, error } = await db()
          .from("conversations")
          .select("id,trainer_id,trainers(name)")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return data ?? [];
      },
    });
  useEffect(() => {
    const c = db()
      .channel("conversation-inbox")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => void cache.invalidateQueries({ queryKey: ["conversations"] }),
      )
      .subscribe();
    return () => {
      void db().removeChannel(c);
    };
  }, [cache]);
  return (
    <>
      <Label>Conversaciones</Label>
      <ErrorBox error={q.error} />
      {q.data?.map((c) => {
        const trainer = Array.isArray(c.trainers) ? c.trainers[0] : c.trainers;
        return (
          <Section key={c.id}>
            <Label>{trainer?.name ?? "Conversación privada"}</Label>
            <Button
              title="Abrir conversación"
              onPress={() => router.push(`/chat/${c.id}`)}
            />
          </Section>
        );
      })}
    </>
  );
}
