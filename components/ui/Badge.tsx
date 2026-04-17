import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { Colors } from "@/constants/Colors";

type BadgeVariant = "blue" | "green" | "purple" | "amber" | "red" | "default";

const VARIANTS: Record<BadgeVariant, { bg: string; border: string; text: string }> = {
  blue: {
    bg: "rgba(59, 130, 246, 0.15)",
    border: "rgba(59, 130, 246, 0.35)",
    text: "#93C5FD",
  },
  green: {
    bg: "rgba(16, 185, 129, 0.15)",
    border: "rgba(16, 185, 129, 0.35)",
    text: "#6EE7B7",
  },
  purple: {
    bg: "rgba(139, 92, 246, 0.15)",
    border: "rgba(139, 92, 246, 0.35)",
    text: "#C4B5FD",
  },
  amber: {
    bg: "rgba(245, 158, 11, 0.15)",
    border: "rgba(245, 158, 11, 0.35)",
    text: "#FCD34D",
  },
  red: {
    bg: "rgba(239, 68, 68, 0.15)",
    border: "rgba(239, 68, 68, 0.35)",
    text: "#FCA5A5",
  },
  default: {
    bg: Colors.BG_INPUT,
    border: Colors.BORDER,
    text: Colors.TEXT_SECONDARY,
  },
};

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

export function Badge({ label, variant = "default", style }: BadgeProps) {
  const v = VARIANTS[variant];
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: v.bg, borderColor: v.border },
        style,
      ]}
    >
      <Text style={[styles.label, { color: v.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});
