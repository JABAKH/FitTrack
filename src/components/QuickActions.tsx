import React from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { feedback, fonts, palette } from "../ui";
const actions = [
  {
    title: "Mi balance",
    icon: "pie-chart",
    route: "/(tabs)/goals",
    color: palette.orange,
  },
  {
    title: "Mi coach",
    icon: "users",
    route: "/(tabs)/trainers",
    color: palette.purple,
  },
  {
    title: "Mi perfil",
    icon: "user",
    route: "/(tabs)/profile",
    color: palette.green,
  },
] as const;
export default function QuickActions() {
  return (
    <View style={{ flexDirection: "row", gap: 16 }}>
      {actions.map((a) => (
        <Pressable
          key={a.title}
          accessibilityRole="button"
          onPress={() => {
            feedback();
            router.push(a.route);
          }}
          style={({ pressed }) => ({
            flex: 1,
            minHeight: 72,
            justifyContent: "center",
            alignItems: "center",
            gap: 10,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Feather name={a.icon} size={23} color={a.color} />
          <Text
            style={{
              color: palette.text,
              fontFamily: fonts.medium,
              fontSize: 12,
              textAlign: "center",
            }}
          >
            {a.title}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
