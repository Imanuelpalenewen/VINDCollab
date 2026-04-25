import { Colors } from "@/constants/Colors";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface HorizontalProgressBarProps {
  label: string;
  value: string | number;
  percentage: number;
  color?: string;
  showLabel?: boolean;
  showPercentage?: boolean;
}

export const HorizontalProgressBar: React.FC<HorizontalProgressBarProps> = ({
  label,
  value,
  percentage,
  color = Colors.INFO,
  showLabel = true,
  showPercentage = true,
}) => {
  const safePercentage = Math.min(Math.max(percentage, 0), 100);

  const getStatusLabel = () => {
    if (safePercentage >= 80) return { text: "Excellent", color: "#10B981" };
    if (safePercentage >= 60) return { text: "Good", color: "#22D3EE" };
    if (safePercentage >= 40) return { text: "Average", color: "#F59E0B" };
    return { text: "Slow", color: "#EF4444" };
  };

  const status = getStatusLabel();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.labelGroup}>
          {showLabel && label ? (
            <Text style={styles.label} numberOfLines={1}>{label}</Text>
          ) : null}
          {value ? (
            <Text style={styles.value}>{value}</Text>
          ) : null}
        </View>
        <View style={styles.rightGroup}>
          {showPercentage && (
            <Text style={[styles.percentage, { color }]}>
              {Math.round(safePercentage)}%
            </Text>
          )}
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${status.color}18` },
            ]}
          >
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.text}
            </Text>
          </View>
        </View>
      </View>

      {/* Bar track */}
      <View style={styles.barTrack}>
        {/* Fill */}
        <View
          style={[
            styles.barFill,
            {
              width: `${safePercentage}%`,
              backgroundColor: color,
            },
          ]}
        />
        {/* Shine */}
        <View
          style={[
            styles.barShine,
            { width: `${safePercentage}%` },
          ]}
        />
        {/* Milestone markers */}
        {[25, 50, 75].map((mark) => (
          <View
            key={`mark-${mark}`}
            style={[
              styles.marker,
              {
                left: `${mark}%`,
                backgroundColor:
                  safePercentage >= mark
                    ? "rgba(0,0,0,0.25)"
                    : "rgba(255,255,255,0.1)",
              },
            ]}
          />
        ))}
      </View>

      {/* Scale labels */}
      <View style={styles.scaleRow}>
        <Text style={styles.scaleLabel}>0</Text>
        <Text style={styles.scaleLabel}>25%</Text>
        <Text style={styles.scaleLabel}>50%</Text>
        <Text style={styles.scaleLabel}>75%</Text>
        <Text style={styles.scaleLabel}>100%</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  labelGroup: {
    flex: 1,
    gap: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.85)",
  },
  value: {
    fontSize: 11,
    color: "rgba(255,255,255,0.4)",
  },
  rightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  percentage: {
    fontSize: 14,
    fontWeight: "800",
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  barTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    position: "relative",
  },
  barFill: {
    position: "absolute",
    left: 0,
    top: 0,
    height: "100%",
    borderRadius: 5,
  },
  barShine: {
    position: "absolute",
    left: 0,
    top: 0,
    height: "40%",
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  marker: {
    position: "absolute",
    top: 0,
    width: 1.5,
    height: "100%",
    marginLeft: -0.75,
  },
  scaleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 0,
  },
  scaleLabel: {
    fontSize: 9,
    color: "rgba(255,255,255,0.2)",
    fontWeight: "500",
  },
});