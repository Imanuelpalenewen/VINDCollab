import { Colors } from "@/constants/Colors";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { G, Rect } from "react-native-svg";

interface BarChartProps {
  data: Array<{
    label: string;
    value: number;
  }>;
  maxValue?: number;
  height?: number;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  maxValue,
  height = 200,
}) => {
  const max = maxValue || Math.max(...data.map((d) => d.value));
  const barWidth = 100 / data.length;
  const padding = 40;
  const chartWidth = 100 - padding * 2;
  const chartHeight = height - padding * 2;

  return (
    <View style={styles.container}>
      <Svg
        width="100%"
        height={height}
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {data.map((item, index) => {
          const barHeight = (item.value / max) * chartHeight;
          const x = padding + index * barWidth + (barWidth - 6) / 2;
          const y = height - padding - barHeight;

          // Color based on value
          const getColor = () => {
            if (item.value >= max * 0.7) return Colors.INFO;
            return Colors.WARNING;
          };

          return (
            <G key={index}>
              {/* Bar */}
              <Rect
                x={x}
                y={y}
                width="6"
                height={barHeight}
                fill={getColor()}
                rx="1"
              />
            </G>
          );
        })}
      </Svg>

      {/* Labels */}
      <View style={styles.labels}>
        {data.map((item, index) => (
          <View key={index} style={[styles.label, { flex: 1 }]}>
            <Text style={styles.labelText} numberOfLines={1}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  labels: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 20,
    gap: 8,
  },
  label: {
    alignItems: "center",
  },
  labelText: {
    fontSize: 10,
    color: Colors.TEXT_MUTED,
    fontWeight: "600",
  },
});
