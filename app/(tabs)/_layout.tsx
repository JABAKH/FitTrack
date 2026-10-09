import { View } from "react-native";
import React from "react";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { feedback, fonts, palette } from "../../src/ui";
const tabs = [
  ["index", "Inicio", "activity"],
  ["activity", "Actividad", "navigation"],
  ["goals", "Metas", "target"],
  ["trainers", "Coaches", "users"],
  ["profile", "Perfil", "user"],
] as const;
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: "fade",
        sceneStyle: { backgroundColor: palette.bg },
        tabBarActiveTintColor: palette.green,
        tabBarInactiveTintColor: palette.muted,
        tabBarStyle: {
          backgroundColor: palette.bg,
          borderTopWidth: 0.5,
          borderTopColor: palette.line,
          elevation: 0,
          boxShadow: "none",
        },
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 10 },
        tabBarItemStyle: { paddingTop: 8, paddingBottom: 4 },
      }}
    >
      {tabs.map(([name, title, icon]) => (
        <Tabs.Screen
          key={name}
          name={name}
          listeners={{ tabPress: feedback }}
          options={{
            title,
            tabBarIcon: ({ color, size, focused }) => (
              <View style={{ alignItems: "center", gap: 4 }}>
                <Feather name={icon} color={color} size={Math.min(size, 21)} />
                <View
                  style={{
                    width: focused ? 16 : 4,
                    height: 2,
                    borderRadius: 2,
                    backgroundColor: focused ? palette.green : "transparent",
                  }}
                />
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
