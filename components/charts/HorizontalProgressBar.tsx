import { Colors } from "@/constants/Colors";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface HorizontalProgressBarProps {
  label: string;
  value: string | number;
  percentage: number;
  color?: string;
  showLabel?: boolean;
}

export const HorizontalProgressBar: React.FC<HorizontalProgressBarProps> = ({
  label,
  value,
  percentage,
  color = Colors.INFO,
  showLabel = true,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.label}>{label}</Text>
          {showLabel && <Text style={styles.value}>{value}</Text>}
        </View>
        <Text style={[styles.percentage, { color }]}>{percentage}%</Text>
      </View>

      <View style={styles.barContainer}>
        <View
          style={[
            styles.barFill,
            {
              width: `${percentage}%`,
              backgroundColor: color,
            },
          ]}
        />
        <View style={styles.barBackground} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.TEXT_PRIMARY,
  },
  value: {
    fontSize: 11,
    color: Colors.TEXT_MUTED,
    marginTop: 2,
  },
  percentage: {
    fontSize: 13,
    fontWeight: "700",
  },
  barContainer: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 4,
  },
  barBackground: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
});
