import { Colors } from "@/constants/Colors";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, G, LinearGradient, Stop } from "react-native-svg";

interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  percentage,
  size = 180,
  strokeWidth = 14,
  label = "COMPLETE",
}) => {
  // Add padding so the outer glow ring is never clipped by SVG edges
  const pad = 14;
  const svgSize = size + pad * 2;
  const cx = svgSize / 2;
  const cy = svgSize / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(percentage, 100) / 100) * circumference;

  const getColor = () => {
    if (percentage >= 70) return "#10B981";
    if (percentage >= 40) return "#F59E0B";
    return "#EF4444";
  };

  const getTrackColor = () => {
    if (percentage >= 70) return "rgba(16,185,129,0.12)";
    if (percentage >= 40) return "rgba(245,158,11,0.12)";
    return "rgba(239,68,68,0.12)";
  };

  const getStatusText = () => {
    if (percentage >= 70) return "On Track";
    if (percentage >= 40) return "In Progress";
    return "Needs Attention";
  };

  const color = getColor();

  // Milestones on the ring
  const milestones = [25, 50, 75, 100];

  return (
    <View style={styles.outerWrapper}>
      <View style={{ width: svgSize, height: svgSize, position: "relative" }}>
        <Svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
          <Defs>
            <LinearGradient id="progressGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor={color} stopOpacity="0.7" />
              <Stop offset="100%" stopColor={color} stopOpacity="1" />
            </LinearGradient>
          </Defs>

          {/* Outer glow ring */}
          <Circle
            cx={cx}
            cy={cy}
            r={radius + 2}
            stroke={getTrackColor()}
            strokeWidth={strokeWidth + 6}
            fill="none"
          />

          {/* Track (background circle) */}
          <Circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={strokeWidth}
            fill="none"
          />

          {/* Progress circle */}
          <G rotation={-90} origin={`${cx}, ${cy}`}>
            <Circle
              cx={cx}
              cy={cy}
              r={radius}
              stroke="url(#progressGrad)"
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </G>

          {/* Milestone tick marks */}
          {milestones.map((m) => {
            const angle = (m / 100) * 360 - 90;
            const rad = (angle * Math.PI) / 180;
            const innerR = radius - strokeWidth / 2 - 3;
            const outerR = radius + strokeWidth / 2 + 3;
            const x1 = cx + innerR * Math.cos(rad);
            const y1 = cy + innerR * Math.sin(rad);
            const x2 = cx + outerR * Math.cos(rad);
            const y2 = cy + outerR * Math.sin(rad);
            const isReached = percentage >= m;
            return (
              <G key={`milestone-${m}`}>
                <Circle
                  cx={(x1 + x2) / 2}
                  cy={(y1 + y2) / 2}
                  r="3"
                  fill={isReached ? color : "rgba(255,255,255,0.15)"}
                />
              </G>
            );
          })}
        </Svg>

        {/* Center content */}
        <View style={styles.centerContent}>
          <Text style={[styles.percentage, { color }]}>
            {Math.round(percentage)}%
          </Text>
          <Text style={styles.label}>{label}</Text>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: getTrackColor() },
            ]}
          >
            <Text style={[styles.statusText, { color }]}>
              {getStatusText()}
            </Text>
          </View>
        </View>
      </View>

      {/* Milestone row */}
      <View style={styles.milestoneRow}>
        {milestones.map((m) => {
          const isReached = percentage >= m;
          return (
            <View key={`mrow-${m}`} style={styles.milestoneItem}>
              <View
                style={[
                  styles.milestoneDot,
                  {
                    backgroundColor: isReached
                      ? color
                      : "rgba(255,255,255,0.12)",
                  },
                ]}
              />
              <Text
                style={[
                  styles.milestoneLabel,
                  { color: isReached ? color : "rgba(255,255,255,0.3)" },
                ]}
              >
                {m}%
              </Text>
            </View>
          );
        })}
      </View>

      {/* Helper text */}
      <Text style={styles.helperText}>
        {percentage < 40
          ? "Project needs significant effort to get back on track."
          : percentage < 70
          ? "Good progress — keep the momentum going."
          : "Excellent progress — project is well ahead."}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  outerWrapper: {
    alignItems: "center",
    gap: 16,
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
    fontSize: 44,
    fontWeight: "900",
    letterSpacing: -1,
  },
  label: {
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 1.5,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  milestoneRow: {
    flexDirection: "row",
    gap: 20,
    paddingHorizontal: 8,
  },
  milestoneItem: {
    alignItems: "center",
    gap: 4,
  },
  milestoneDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  milestoneLabel: {
    fontSize: 10,
    fontWeight: "700",
  },
  helperText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
    textAlign: "center",
    lineHeight: 16,
    paddingHorizontal: 8,
  },
});