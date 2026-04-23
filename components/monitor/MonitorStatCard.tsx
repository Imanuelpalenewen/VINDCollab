import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface MonitorStatCardProps {
  label: string;
  value: string;
  iconName: keyof typeof Ionicons.glyphMap;
  color?: string;
}

export const MonitorStatCard: React.FC<MonitorStatCardProps> = ({
  label,
  value,
  iconName,
  color = Colors.PRIMARY,
}) => {
  return (
    <View style={[styles.card, { borderColor: color + "33" }]}>
      <Ionicons name={iconName} size={20} color={color} />
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.BG_CARD,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: "800",
  },
  label: {
    fontSize: 10,
    color: Colors.TEXT_MUTED,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
  },
});