import React, { useState } from "react";
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";

interface InputProps extends TextInputProps {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  error?: string;
  isPassword?: boolean;
  containerStyle?: ViewStyle;
}

export function Input({
  label,
  icon,
  error,
  isPassword,
  containerStyle,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const hasError = !!error;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputFocused,
          hasError && styles.inputError,
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={18}
            color={isFocused ? Colors.PRIMARY : Colors.TEXT_MUTED}
            style={styles.icon}
          />
        )}

        <TextInput
          style={styles.input}
          placeholderTextColor={Colors.TEXT_MUTED}
          secureTextEntry={isPassword && !showPassword}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />

        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword((v) => !v)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.eyeBtn}
          >
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={Colors.TEXT_MUTED}
            />
          </TouchableOpacity>
        )}
      </View>

      {hasError && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={13} color={Colors.ERROR} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    color: Colors.TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.BG_INPUT,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.BORDER,
    paddingHorizontal: 14,
    height: 54,
  },
  inputFocused: {
    borderColor: Colors.BORDER_FOCUS,
    backgroundColor: "rgba(59, 130, 246, 0.06)",
  },
  inputError: {
    borderColor: Colors.BORDER_ERROR,
    backgroundColor: "rgba(239, 68, 68, 0.04)",
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: Colors.TEXT_PRIMARY,
    fontSize: 15,
    height: "100%",
  },
  eyeBtn: {
    padding: 4,
    marginLeft: 8,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
  },
  errorText: {
    color: Colors.ERROR,
    fontSize: 12,
    flex: 1,
  },
});
