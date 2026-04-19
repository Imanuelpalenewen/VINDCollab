import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from "react-native";
import { Colors } from "@/constants/Colors";

export default function AIGeneratingLoader() {
  const [dotCount, setDotCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setDotCount((prev) => (prev + 1) % 4);
    }, 500);
    return () => clearInterval(timer);
  }, []);

  const dots = ".".repeat(dotCount + 1);

  return (
    <View style={s.container}>
      <View style={s.loaderWrapper}>
        <ActivityIndicator size="large" color={Colors.PRIMARY} />
        <Text style={s.title}>AI sedang membuat rencana kerja{dots}</Text>
        <Text style={s.subtitle}>Biasanya 5-10 detik</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BG_DARK,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loaderWrapper: {
    alignItems: "center",
    gap: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.TEXT_PRIMARY,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: Colors.TEXT_MUTED,
    textAlign: "center",
  },
});
