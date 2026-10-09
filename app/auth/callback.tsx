import React, { useEffect, useState } from "react";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { completeAuth } from "../../src/services/auth";
import { db } from "../../src/lib/supabase";
import { ErrorBox, Loading, Screen } from "../../src/ui";
export default function Callback() {
  const url = Linking.useURL(),
    [error, setError] = useState<unknown>(null);
  useEffect(() => {
    if (!url) return;
    let alive = true;
    async function run() {
      try {
        const parsed = new URL(url!);
        const recovery =
          parsed.searchParams.get("type") === "recovery" ||
          new URLSearchParams(parsed.hash.slice(1)).get("type") === "recovery";
        await completeAuth(url!);
        if (alive) router.replace(recovery ? "/reset-password" : "/(tabs)");
      } catch (e) {
        const { data } = await db().auth.getSession();
        if (alive) {
          if (data.session) router.replace("/(tabs)");
          else setError(e);
        }
      }
    }
    void run();
    return () => {
      alive = false;
    };
  }, [url]);
  return (
    <Screen title="Confirmando sesión">
      {error ? <ErrorBox error={error} /> : <Loading />}
    </Screen>
  );
}
