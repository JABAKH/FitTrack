import CoachNotifications from "../src/components/CoachNotifications";
import { useRows } from "../src/hooks/useData";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import React from "react";
import { Stack } from "expo-router";
import { Providers, useAuth } from "../src/providers";
import { configured } from "../src/lib/supabase";
import { Screen, Section, Label, Loading, ErrorBox } from "../src/ui";
function Routes() {
  const { session, loading, error } = useAuth();
  const profile = useRows("profiles");
  const p = profile.data?.[0];
  const complete = !!(
    p?.full_name?.trim() &&
    p.birth_date &&
    p.sex &&
    p.height_cm &&
    p.weight_kg
  );
  if (!configured)
    return (
      <Screen title="FitTrack">
        <Section>
          <Label>Falta conectar Supabase.</Label>
          <Label muted>
            Copia .env.example a .env y agrega EXPO_PUBLIC_SUPABASE_URL y
            EXPO_PUBLIC_SUPABASE_ANON_KEY. Reinicia Expo.
          </Label>
        </Section>
      </Screen>
    );
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  if (session && profile.isLoading) return <Loading />;
  if (session && profile.error)
    return (
      <Screen title="Tu perfil">
        <ErrorBox error={profile.error} retry={() => void profile.refetch()} />
      </Screen>
    );
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#080D1B" },
      }}
    >
      <Stack.Protected guard={!!session && complete}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="chat/[id]" />
      </Stack.Protected>
      <Stack.Protected guard={!!session && !complete}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
      <Stack.Screen name="auth/callback" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="payment-return" />
    </Stack>
  );
}
export default function Layout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  if (!fontsLoaded && !fontError)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#080D1B",
          justifyContent: "center",
        }}
      >
        <Loading />
      </View>
    );
  return (
    <Providers>
      <StatusBar style="light" />
      <CoachNotifications />
      <Routes />
    </Providers>
  );
}
