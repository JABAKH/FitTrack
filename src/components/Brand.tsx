import React from "react";
import { Image, View } from "react-native";
export default function Brand({ hero = false }: { hero?: boolean }) {
  return (
    <View style={{ alignItems: hero ? "center" : "flex-start" }}>
      <Image
        source={require("../../assets/fittrack-logo.jpg")}
        accessibilityLabel="FitTrack"
        resizeMode="contain"
        style={{
          width: hero ? 280 : 78,
          height: hero ? 153 : 43,
          maxWidth: "100%",
        }}
      />
    </View>
  );
}
