import { Colors } from "@/constants/Colors";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  percentage,
  size = 180,
  strokeWidth = 12,
  label = "COMPLETE",
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Color based on percentage
  const getColor = () => {
    if (percentage >= 70) return "#10B981"; // Green
    if (percentage >= 40) return "#F59E0B"; // Orange
    return "#EF4444"; // Red
  };

  return (
    <View style={styles.container}>
      <View style={{ width: size, height: size, position: "relative" }}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress circle */}
          <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={getColor()}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </G>
        </Svg>

        {/* Center text */}
        <View style={styles.centerContent}>
          <Text style={styles.percentage}>{Math.round(percentage)}%</Text>
          <Text style={styles.label}>{label}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  centerContent: {
    position: "absolute",
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  percentage: {
    fontSize: 48,
    fontWeight: "800",
    color: Colors.TEXT_PRIMARY,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.TEXT_MUTED,
    letterSpacing: 1,
  },
});
