import { Colors } from "@/constants/Colors";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

interface LineChartProps {
  data: Array<{
    label: string;
    value: number;
  }>;
  height?: number;
}

export const LineChart: React.FC<LineChartProps> = ({ data, height = 200 }) => {
  if (data.length < 2) return null;

  const maxValue = Math.max(...data.map((d) => d.value));
  const padding = 40;
  const chartWidth = 100 - padding * 2;
  const chartHeight = height - padding * 2;

  // Calculate points for the line
  const points = data.map((item, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth;
    const y = height - padding - (item.value / maxValue) * chartHeight;
    return { x, y, label: item.label };
  });

  // Create path string for the line
  const pathString = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  // Create filled area path
  const areaPath = `${pathString} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <View style={styles.container}>
      <Svg
        width="100%"
        height={height}
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Fill area */}
        <Path
          d={areaPath}
          fill={`${Colors.INFO}20`}
          stroke="none"
        />
        {/* Line */}
        <Path d={pathString} stroke={Colors.INFO} strokeWidth="2" fill="none" />
      </Svg>

      {/* Labels */}
      <View style={styles.labels}>
        {points.map((point, index) => (
          <View
            key={index}
            style={[
              styles.label,
              {
                position: "absolute",
                left: `calc(${(index / (data.length - 1)) * 100}% - 16px)`,
                bottom: -24,
              } as any,
            ]}
          >
            <Text style={styles.labelText}>{point.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
    marginBottom: 40,
  },
  labels: {
    position: "relative",
    width: "100%",
    height: 30,
  },
  label: {
    alignItems: "center",
    width: 32,
  },
  labelText: {
    fontSize: 10,
    color: Colors.TEXT_MUTED,
    fontWeight: "600",
  },
});
