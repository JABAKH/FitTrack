import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, processLock } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export const configured = !!url && !!key;
// No fallback keys or fabricated project. Missing configuration is shown before mounting auth.
export const supabase = configured
  ? createClient(url!, key!, {
      auth: {
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: "pkce",
        lock: processLock,
      },
    })
  : null;
export function db() {
  if (!supabase)
    throw new Error(
      "Configura EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY en .env.",
    );
  return supabase;
}
if (Platform.OS !== "web" && supabase) {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
  if (AppState.currentState === "active") supabase.auth.startAutoRefresh();
}
