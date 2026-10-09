import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { db } from "../lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
if (Platform.OS !== "web")
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
export async function notifyStepGoal(
  userId: string,
  day: string,
  steps: number,
) {
  if (Platform.OS === "web") return;
  const key = `step-goal-notified:${userId}:${day}`;
  if (await AsyncStorage.getItem(key)) return;
  const [{ data: goal }, { data: prefs }] = await Promise.all([
    db()
      .from("fitness_goals")
      .select("daily_steps")
      .eq("user_id", userId)
      .single(),
    db()
      .from("notification_preferences")
      .select("steps")
      .eq("user_id", userId)
      .single(),
  ]);
  if (!prefs?.steps || !goal || steps < goal.daily_steps) return;
  const permission = await Notifications.getPermissionsAsync();
  if (permission.status !== "granted") return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "¡Meta de pasos alcanzada!",
      body: `Registraste ${steps} pasos hoy.`,
      data: { app: "fittrack" },
    },
    trigger: null,
  });
  await AsyncStorage.setItem(key, "1");
}
export async function configureNotifications(
  userId: string,
  prefs: {
    activity: boolean;
    weight: boolean;
    messages: boolean;
    renewals: boolean;
    steps: boolean;
  },
) {
  if (Platform.OS === "web")
    throw new Error("Las notificaciones locales requieren Android o iOS.");
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("fittrack", {
      name: "FitTrack",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  const permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted")
    throw new Error("Permiso de notificaciones denegado.");
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled)
    if (n.content.data?.app === "fittrack")
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
  if (prefs.activity)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Momento de moverte",
        body: "Registra tu caminata o carrera de hoy.",
        data: { app: "fittrack" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 18,
        minute: 0,
      },
    });
  if (prefs.weight)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Tu progreso semanal",
        body: "Registra tu peso en FitTrack.",
        data: { app: "fittrack" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 2,
        hour: 9,
        minute: 0,
      },
    });
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (projectId) {
    const token = (await Notifications.getExpoPushTokenAsync({ projectId }))
      .data;
    const { error } = await db()
      .from("notification_preferences")
      .update({ expo_push_token: token })
      .eq("user_id", userId);
    if (error) throw error;
  }
}

export async function requestCoachNotificationPermission() {
  if (Platform.OS === "web") return false;
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("fittrack", {
      name: "FitTrack",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}
const coachNotificationInFlight = new Set<string>();
export async function notifyCoachReady(
  userId: string,
  trainerId: string,
  attempt: string,
) {
  if (Platform.OS === "web") return;
  const key = "coach-ready:" + userId + ":" + trainerId + ":" + attempt;
  if (coachNotificationInFlight.has(key)) return;
  coachNotificationInFlight.add(key);
  try {
    if (await AsyncStorage.getItem(key)) return;
    const [
      { data: coach, error: coachError },
      { data: prefs, error: prefsError },
    ] = await Promise.all([
      db()
        .from("trainers")
        .select("name")
        .eq("id", trainerId)
        .eq("active", true)
        .maybeSingle(),
      db()
        .from("notification_preferences")
        .select("messages,expo_push_token")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);
    if (coachError) throw coachError;
    if (prefsError) throw prefsError;
    if (!coach || !prefs?.messages) return;
    // Registered push devices receive this welcome from the Stripe webhook instead.
    if (prefs.expo_push_token) {
      await AsyncStorage.setItem(key, "1");
      return;
    }
    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) return;
    await Notifications.scheduleNotificationAsync({
      identifier: key,
      content: {
        title: coach.name + " · Tu próximo entreno",
        body: "¡Estoy listo para el próximo entreno! Te espero en el gym.",
        sound: "default",
        data: { app: "fittrack", coach_id: trainerId, url: "/(tabs)/trainers" },
      },
      trigger: null,
    });
    await AsyncStorage.setItem(key, "1");
  } finally {
    coachNotificationInFlight.delete(key);
  }
}
