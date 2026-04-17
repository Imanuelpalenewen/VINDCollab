import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Colors } from "@/constants/Colors";

interface ButtonProps {
  onPress: () => void;
  title: string;
  /** "primary" = filled blue | "outline" = bordered | "ghost" = text-only */
  variant?: "primary" | "outline" | "ghost";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  onPress,
  title,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
  textStyle,
}: ButtonProps) {
  const isPrimary = variant === "primary";
  const isOutline = variant === "outline";

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.base,
        isPrimary && styles.primary,
        isOutline && styles.outline,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={isPrimary ? "#fff" : Colors.PRIMARY}
          size="small"
        />
      ) : (
        <Text
          style={[
            styles.text,
            isOutline && styles.outlineText,
            variant === "ghost" && styles.ghostText,
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
  },
  primary: {
    backgroundColor: Colors.PRIMARY,
    // Glow shadow simulates gradient depth
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: Colors.BORDER,
  },
  disabled: {
    opacity: 0.45,
  },
  text: {
    color: Colors.TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  outlineText: {
    color: Colors.TEXT_SECONDARY,
  },
  ghostText: {
    color: Colors.PRIMARY,
    fontWeight: "600",
  },
});
