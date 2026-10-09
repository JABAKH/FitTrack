import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { db } from "../lib/supabase";
WebBrowser.maybeCompleteAuthSession();
export const authRedirect = () =>
  Linking.createURL("auth/callback", { scheme: "fittrack" });
export async function completeAuth(url: string) {
  const parsed = new URL(url);
  const error = parsed.searchParams.get("error_description");
  if (error) throw new Error(error);
  const code = parsed.searchParams.get("code");
  if (code) {
    const { error } = await db().auth.exchangeCodeForSession(code);
    if (error) throw error;
    return;
  }
  const hash = new URLSearchParams(parsed.hash.slice(1));
  if (hash.get("access_token") && hash.get("refresh_token")) {
    const { error } = await db().auth.setSession({
      access_token: hash.get("access_token")!,
      refresh_token: hash.get("refresh_token")!,
    });
    if (error) throw error;
    return;
  }
  throw new Error("Enlace de autenticación inválido o vencido.");
}
export async function oauth(provider: "google" | "apple") {
  const redirectTo = authRedirect();
  const { data, error } = await db().auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type === "success") await completeAuth(result.url);
}
