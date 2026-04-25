import { Colors } from "@/constants/Colors";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { G, Line, Rect, Text as SvgText } from "react-native-svg";

interface BarChartDataPoint {
  label: string;
  value: number;
  tooltip?: string;
}

interface InteractiveBarChartProps {
  data: BarChartDataPoint[];
  maxValue?: number;
  height?: number;
  onBarPress?: (index: number, data: BarChartDataPoint) => void;
  yAxisLabel?: string;
}

export const InteractiveBarChart: React.FC<InteractiveBarChartProps> = ({
  data,
  maxValue,
  height = 260,
  onBarPress,
  yAxisLabel = "Tasks",
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (!data || data.length === 0) return null;

  const max = maxValue || Math.max(...data.map((d) => d.value), 1);
  const paddingLeft = 32;
  const paddingRight = 8;
  const paddingTop = 20;
  const paddingBottom = 28;
  const viewBoxWidth = 300;
  const viewBoxHeight = height;
  const chartWidth = viewBoxWidth - paddingLeft - paddingRight;
  const chartHeight = viewBoxHeight - paddingTop - paddingBottom;

  const barSpacing = chartWidth / data.length;
  const barWidth = Math.min(barSpacing * 0.55, 22);

  // Y-axis ticks
  const yTicks = 4;
  const getBarColor = (value: number, isSelected: boolean) => {
    if (isSelected) return Colors.PRIMARY;
    if (value >= max * 0.7) return "#22D3EE"; // cyan for high
    if (value >= max * 0.4) return "#F59E0B"; // amber for medium
    return "#F87171"; // red for low
  };

  return (
    <View style={styles.wrapper}>
      {/* Y-axis label */}
      <View style={styles.yAxisLabelContainer}>
        <Text style={styles.yAxisLabel}>{yAxisLabel}</Text>
      </View>

      <View style={styles.chartArea}>
        <Svg
          width="100%"
          height={height}
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Y-axis gridlines and labels */}
          {Array.from({ length: yTicks + 1 }).map((_, i) => {
            const ratio = i / yTicks;
            const yPos = paddingTop + chartHeight - ratio * chartHeight;
            const labelValue = Math.round(max * ratio);
            return (
              <G key={`ytick-${i}`}>
                <Line
                  x1={paddingLeft}
                  y1={yPos}
                  x2={viewBoxWidth - paddingRight}
                  y2={yPos}
                  stroke="rgba(255,255,255,0.07)"
                  strokeWidth="0.8"
                  strokeDasharray={i === 0 ? "0" : "2,2"}
                />
                <SvgText
                  x={paddingLeft - 4}
                  y={yPos + 3}
                  textAnchor="end"
                  fontSize="7"
                  fill="rgba(255,255,255,0.35)"
                  fontWeight="600"
                >
                  {labelValue}
                </SvgText>
              </G>
            );
          })}

          {/* X-axis baseline */}
          <Line
            x1={paddingLeft}
            y1={paddingTop + chartHeight}
            x2={viewBoxWidth - paddingRight}
            y2={paddingTop + chartHeight}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="0.8"
          />

          {/* Bars */}
          {data.map((item, index) => {
            const barH = Math.max((item.value / max) * chartHeight, 2);
            const centerX = paddingLeft + index * barSpacing + barSpacing / 2;
            const x = centerX - barWidth / 2;
            const y = paddingTop + chartHeight - barH;
            const isSelected = selectedIndex === index;
            const color = getBarColor(item.value, isSelected);

            return (
              <G key={`bar-${index}`}>
                {/* Selection highlight background */}
                {isSelected && (
                  <Rect
                    x={x - 3}
                    y={paddingTop}
                    width={barWidth + 6}
                    height={chartHeight}
                    fill={`${Colors.PRIMARY}15`}
                    rx="3"
                  />
                )}

                {/* Bar shadow */}
                <Rect
                  x={x + 1.5}
                  y={y + 2}
                  width={barWidth}
                  height={barH}
                  fill="rgba(0,0,0,0.3)"
                  rx="3"
                />

                {/* Main bar */}
                <Rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barH}
                  fill={color}
                  rx="3"
                  opacity={isSelected ? 1 : 0.85}
                />

                {/* Top cap accent */}
                <Rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={3}
                  fill={isSelected ? "#fff" : `${color}CC`}
                  rx="2"
                  opacity={0.6}
                />

                {/* Value label above bar — always visible */}
                <SvgText
                  x={centerX}
                  y={y - 4}
                  textAnchor="middle"
                  fontSize={isSelected ? "9" : "7.5"}
                  fontWeight="700"
                  fill={isSelected ? Colors.PRIMARY : "rgba(255,255,255,0.7)"}
                >
                  {item.value}
                </SvgText>
              </G>
            );
          })}

          {/* X-axis labels */}
          {data.map((item, index) => {
            const centerX = paddingLeft + index * barSpacing + barSpacing / 2;
            return (
              <SvgText
                key={`xlabel-${index}`}
                x={centerX}
                y={paddingTop + chartHeight + 14}
                textAnchor="middle"
                fontSize="6.5"
                fill={
                  selectedIndex === index
                    ? Colors.PRIMARY
                    : "rgba(255,255,255,0.4)"
                }
                fontWeight={selectedIndex === index ? "700" : "500"}
              >
                {item.label}
              </SvgText>
            );
          })}
        </Svg>

        {/* Invisible tap areas */}
        <View style={StyleSheet.absoluteFillObject}>
          <View style={[styles.tapRow, { paddingLeft: (paddingLeft / 300) * 100 + "%" as any }]}>
            {data.map((item, index) => (
              <TouchableOpacity
                key={`tap-${index}`}
                style={styles.tapArea}
                onPress={() => {
                  setSelectedIndex(selectedIndex === index ? null : index);
                  onBarPress?.(index, item);
                }}
                activeOpacity={0.6}
              />
            ))}
          </View>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#22D3EE" }]} />
          <Text style={styles.legendText}>High (≥70%)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#F59E0B" }]} />
          <Text style={styles.legendText}>Medium (40–69%)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#F87171" }]} />
          <Text style={styles.legendText}>Low (&lt;40%)</Text>
        </View>
      </View>

      {/* Selected detail card */}
      {selectedIndex !== null && (
        <View style={styles.detailCard}>
          <View style={styles.detailCardHeader}>
            <View style={styles.detailCardDot} />
            <Text style={styles.detailCardDate}>
              {data[selectedIndex].label}
            </Text>
            <View style={styles.detailCardBadge}>
              <Text style={styles.detailCardBadgeText}>SELECTED</Text>
            </View>
          </View>
          <View style={styles.detailCardBody}>
            <View style={styles.detailCardStat}>
              <Text style={styles.detailCardStatLabel}>Tasks Completed</Text>
              <Text style={styles.detailCardStatValue}>
                {data[selectedIndex].value}
              </Text>
            </View>
            <View style={styles.detailCardStat}>
              <Text style={styles.detailCardStatLabel}>vs. Max</Text>
              <Text style={styles.detailCardStatValue}>
                {Math.round((data[selectedIndex].value / max) * 100)}%
              </Text>
            </View>
            <View style={styles.detailCardStat}>
              <Text style={styles.detailCardStatLabel}>Level</Text>
              <Text
                style={[
                  styles.detailCardStatValue,
                  {
                    color:
                      data[selectedIndex].value >= max * 0.7
                        ? "#22D3EE"
                        : data[selectedIndex].value >= max * 0.4
                        ? "#F59E0B"
                        : "#F87171",
                  },
                ]}
              >
                {data[selectedIndex].value >= max * 0.7
                  ? "High"
                  : data[selectedIndex].value >= max * 0.4
                  ? "Medium"
                  : "Low"}
              </Text>
            </View>
          </View>
          {data[selectedIndex].tooltip && (
            <Text style={styles.detailCardTooltip}>
              {data[selectedIndex].tooltip}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  yAxisLabelContainer: {
    paddingLeft: 4,
  },
  yAxisLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.3)",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  chartArea: {
    position: "relative",
  },
  tapRow: {
    flex: 1,
    flexDirection: "row",
  },
  tapArea: {
    flex: 1,
    height: "100%",
  },
  legend: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 4,
    paddingTop: 4,
    flexWrap: "wrap",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    color: "rgba(255,255,255,0.45)",
    fontWeight: "500",
  },
  detailCard: {
    marginTop: 4,
    padding: 14,
    backgroundColor: "rgba(59,130,246,0.08)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.25)",
    gap: 10,
  },
  detailCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailCardDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.PRIMARY,
  },
  detailCardDate: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.8)",
  },
  detailCardBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: "rgba(59,130,246,0.2)",
    borderRadius: 6,
  },
  detailCardBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: Colors.PRIMARY,
    letterSpacing: 0.5,
  },
  detailCardBody: {
    flexDirection: "row",
    gap: 8,
  },
  detailCardStat: {
    flex: 1,
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 8,
    gap: 4,
  },
  detailCardStatLabel: {
    fontSize: 9,
    color: "rgba(255,255,255,0.4)",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  detailCardStatValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
  },
  detailCardTooltip: {
    fontSize: 11,
    color: "rgba(255,255,255,0.45)",
    lineHeight: 16,
    fontStyle: "italic",
  },
});