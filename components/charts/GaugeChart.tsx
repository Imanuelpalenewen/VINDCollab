import { Colors } from "@/constants/Colors";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

interface GaugeChartProps {
  value: number;
  maxValue?: number;
  label?: string;
  riskLevel?: "GREEN" | "YELLOW" | "RED";
}

export const GaugeChart: React.FC<GaugeChartProps> = ({
  value,
  maxValue = 100,
  label,
  riskLevel = "YELLOW",
}) => {
  const size = 120;
  const radius = 50;
  const circumference = Math.PI * radius;

  // Calculate the percentage and angle
  const percentage = Math.min((value / maxValue) * 100, 100);
  const angle = (percentage / 100) * 180; // 180 degrees for semi-circle

  const getColor = () => {
    switch (riskLevel) {
      case "GREEN":
        return "#10B981";
      case "YELLOW":
        return "#F59E0B";
      case "RED":
        return "#EF4444";
      default:
        return "#F59E0B";
    }
  };

  const getBackgroundColor = () => {
    switch (riskLevel) {
      case "GREEN":
        return "rgba(16,185,129,0.15)";
      case "YELLOW":
        return "rgba(245,158,11,0.15)";
      case "RED":
        return "rgba(239,68,68,0.15)";
      default:
        return "rgba(245,158,11,0.15)";
    }
  };

  // Convert angle to radians for arc calculation
  const rad = (angle * Math.PI) / 180;
  const x = radius * Math.sin(rad);
  const y = radius * (1 - Math.cos(rad));

  return (
    <View style={styles.container}>
      <View style={{ width: size, height: size / 2, alignItems: "center" }}>
        <Svg width={size} height={size / 2} viewBox={`0 0 ${size} ${size / 2}`}>
          {/* Background arc */}
          <Path
            d={`M 10 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2}`}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
          />
          {/* Progress arc */}
          <Path
            d={`M 10 ${size / 2} A ${radius} ${radius} 0 ${angle > 90 ? 1 : 0} 1 ${
              10 + x
            } ${size / 2 - y}`}
            stroke={getColor()}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
          />
        </Svg>
      </View>

      {/* Value display */}
      <Text style={[styles.value, { color: getColor() }]}>{value}</Text>
      {label && <Text style={styles.label}>{label}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  value: {
    fontSize: 28,
    fontWeight: "800",
  },
  label: {
    fontSize: 12,
    color: Colors.TEXT_MUTED,
    fontWeight: "600",
  },
});
