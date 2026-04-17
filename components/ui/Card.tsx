import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { Colors } from "@/constants/Colors";

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Use "elevated" for stronger shadow, "flat" for no border */
  variant?: "default" | "elevated" | "flat";
}

export function Card({ children, style, variant = "default" }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        variant === "elevated" && styles.elevated,
        variant === "flat" && styles.flat,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.BG_CARD,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  elevated: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  flat: {
    borderWidth: 0,
  },
});
