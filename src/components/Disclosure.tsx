import React, { useState } from "react";
import { Pressable, View, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, ReduceMotion } from "react-native-reanimated";
import { feedback, fonts, palette } from "../ui";
export default function Disclosure({
  title,
  children,
  initiallyOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  initiallyOpen?: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <View style={{ gap: 18 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={title}
        onPress={() => {
          feedback();
          setOpen(!open);
        }}
        style={{
          minHeight: 48,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
        }}
      >
        <Text
          style={{
            flex: 1,
            color: palette.green,
            fontFamily: fonts.medium,
            fontSize: 14,
          }}
        >
          {title}
        </Text>
        <Feather
          name={open ? "minus" : "plus"}
          size={18}
          color={palette.green}
        />
      </Pressable>
      {open && (
        <Animated.View
          entering={FadeIn.duration(200).reduceMotion(ReduceMotion.System)}
          style={{ gap: 16 }}
        >
          {children}
        </Animated.View>
      )}
    </View>
  );
}
