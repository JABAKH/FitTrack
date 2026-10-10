import { finishBackgroundSession } from "./services/backgroundTracking";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import {
  QueryClient,
  QueryClientProvider,
  onlineManager,
  useQueryClient,
} from "@tanstack/react-query";
import NetInfo from "@react-native-community/netinfo";
import { AppState } from "react-native";
import { db, supabase } from "./lib/supabase";
import { personalTables } from "./services/data";
import { SafeAreaProvider } from "react-native-safe-area-context";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30000 },
    mutations: { retry: 0, networkMode: "always" },
  },
});
const AuthContext = createContext<{
  session: Session | null;
  loading: boolean;
  online: boolean;
  error: string | null;
  recovery: boolean;
  finishRecovery: () => void;
}>({
  session: null,
  loading: true,
  online: true,
  error: null,
  recovery: false,
  finishRecovery: () => {},
});
export const useAuth = () => useContext(AuthContext);
function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null),
    [loading, setLoading] = useState(!!supabase),
    [online, setOnline] = useState(true),
    [error, setError] = useState<string | null>(null),
    [recovery, setRecovery] = useState(false);
  const cache = useQueryClient(),
    userId = session?.user.id;
  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (alive) {
          setSession(data.session);
          setError(error?.message ?? null);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (alive) {
          setError(String(e));
          setLoading(false);
        }
      });
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === "SIGNED_OUT") {
        void finishBackgroundSession().catch((error) =>
          console.warn(
            "No se pudo detener el seguimiento al cerrar sesión",
            error,
          ),
        );
        cache.clear();
        setRecovery(false);
      }
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      setSession(next);
      setLoading(false);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, [cache]);
  useEffect(
    () =>
      NetInfo.addEventListener((state) => {
        const connected =
          state.isConnected !== false && state.isInternetReachable !== false;
        setOnline(connected);
        onlineManager.setOnline(connected);
        if (connected) void cache.invalidateQueries();
      }),
    [cache],
  );
  useEffect(() => {
    if (!userId) return;
    const channel = db().channel(`user-${userId}`);
    for (const table of personalTables)
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `user_id=eq.${userId}`,
        },
        () => void cache.invalidateQueries({ queryKey: [table] }),
      );
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "trainers" },
      () => void cache.invalidateQueries({ queryKey: ["trainers"] }),
    );
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") void cache.invalidateQueries();
    });
    const app = AppState.addEventListener("change", (state) => {
      if (state === "active") void cache.invalidateQueries();
    });
    return () => {
      void db().removeChannel(channel);
      app.remove();
    };
  }, [userId, cache]);
  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        online,
        error,
        recovery,
        finishRecovery: () => setRecovery(false),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
