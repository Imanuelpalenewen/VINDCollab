import { Colors } from "@/constants/Colors";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from "react-native-svg";

interface LineChartDataPoint {
  label: string;
  value: number;
  tooltip?: string;
}

interface InteractiveLineChartProps {
  data: LineChartDataPoint[];
  height?: number;
  onDataPointPress?: (index: number, data: LineChartDataPoint) => void;
  showTooltip?: boolean;
  yAxisLabel?: string;
  unit?: string;
}

export const InteractiveLineChart: React.FC<InteractiveLineChartProps> = ({
  data,
  height = 260,
  onDataPointPress,
  showTooltip = true,
  yAxisLabel = "Value",
  unit = "%",
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (!data || data.length < 2) return null;

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const minValue = 0;
  const range = maxValue - minValue || 1;

  const paddingLeft = 34;
  const paddingRight = 12;
  const paddingTop = 22;
  const paddingBottom = 30;
  const viewBoxW = 300;
  const viewBoxH = height;
  const chartW = viewBoxW - paddingLeft - paddingRight;
  const chartH = viewBoxH - paddingTop - paddingBottom;

  const getX = (index: number) =>
    paddingLeft + (index / (data.length - 1)) * chartW;
  const getY = (value: number) =>
    paddingTop + chartH - ((value - minValue) / range) * chartH;

  const points = data.map((item, i) => ({
    x: getX(i),
    y: getY(item.value),
    value: item.value,
    label: item.label,
    tooltip: item.tooltip,
  }));

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  // Smooth area fill
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${
    paddingTop + chartH
  } L ${points[0].x} ${paddingTop + chartH} Z`;

  const yTicks = 4;

  return (
    <View style={styles.wrapper}>
      <View style={styles.yAxisLabelContainer}>
        <Text style={styles.yAxisLabel}>{yAxisLabel}</Text>
      </View>

      <View style={styles.chartArea}>
        <Svg
          width="100%"
          height={height}
          viewBox={`0 0 ${viewBoxW} ${viewBoxH}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <Defs>
            <LinearGradient id="lineAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={Colors.INFO} stopOpacity="0.35" />
              <Stop offset="100%" stopColor={Colors.INFO} stopOpacity="0.02" />
            </LinearGradient>
          </Defs>

          {/* Y-axis gridlines + labels */}
          {Array.from({ length: yTicks + 1 }).map((_, i) => {
            const ratio = i / yTicks;
            const yPos = paddingTop + chartH - ratio * chartH;
            const labelValue = Math.round(minValue + range * ratio);
            return (
              <React.Fragment key={`ytick-${i}`}>
                <Line
                  x1={paddingLeft}
                  y1={yPos}
                  x2={viewBoxW - paddingRight}
                  y2={yPos}
                  stroke="rgba(255,255,255,0.07)"
                  strokeWidth="0.7"
                  strokeDasharray={i === 0 ? "0" : "3,3"}
                />
                <SvgText
                  x={paddingLeft - 4}
                  y={yPos + 3}
                  textAnchor="end"
                  fontSize="7"
                  fill="rgba(255,255,255,0.35)"
                  fontWeight="600"
                >
                  {labelValue}{unit}
                </SvgText>
              </React.Fragment>
            );
          })}

          {/* X baseline */}
          <Line
            x1={paddingLeft}
            y1={paddingTop + chartH}
            x2={viewBoxW - paddingRight}
            y2={paddingTop + chartH}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="0.8"
          />

          {/* Vertical selected line */}
          {selectedIndex !== null && (
            <Line
              x1={points[selectedIndex].x}
              y1={paddingTop}
              x2={points[selectedIndex].x}
              y2={paddingTop + chartH}
              stroke={Colors.PRIMARY}
              strokeWidth="0.8"
              strokeDasharray="3,3"
              opacity={0.7}
            />
          )}

          {/* Area fill */}
          <Path d={areaPath} fill="url(#lineAreaGrad)" stroke="none" />

          {/* Main line */}
          <Path
            d={linePath}
            stroke={Colors.INFO}
            strokeWidth="2.2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {points.map((point, index) => {
            const isSelected = selectedIndex === index;
            return (
              <React.Fragment key={`point-${index}`}>
                {isSelected && (
                  <Circle
                    cx={point.x}
                    cy={point.y}
                    r="8"
                    fill={Colors.PRIMARY}
                    opacity="0.15"
                  />
                )}
                <Circle
                  cx={point.x}
                  cy={point.y}
                  r={isSelected ? 4 : 2.5}
                  fill={isSelected ? Colors.PRIMARY : Colors.INFO}
                  stroke={isSelected ? "#fff" : "rgba(0,0,0,0.5)"}
                  strokeWidth={isSelected ? "1.5" : "0.8"}
                />
                {/* Always-visible value label */}
                <SvgText
                  x={point.x}
                  y={point.y - 8}
                  textAnchor="middle"
                  fontSize={isSelected ? "8.5" : "7"}
                  fontWeight="700"
                  fill={isSelected ? Colors.PRIMARY : "rgba(255,255,255,0.6)"}
                >
                  {point.value}{unit}
                </SvgText>
              </React.Fragment>
            );
          })}

          {/* X-axis labels */}
          {points.map((point, index) => (
            <SvgText
              key={`xlabel-${index}`}
              x={point.x}
              y={paddingTop + chartH + 14}
              textAnchor="middle"
              fontSize="6.5"
              fill={
                selectedIndex === index
                  ? Colors.PRIMARY
                  : "rgba(255,255,255,0.4)"
              }
              fontWeight={selectedIndex === index ? "700" : "500"}
            >
              {point.label}
            </SvgText>
          ))}
        </Svg>

        {/* Invisible tap areas */}
        <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
          <View style={styles.tapRow}>
            {data.map((item, index) => (
              <TouchableOpacity
                key={`tap-${index}`}
                style={styles.tapArea}
                onPress={() => {
                  const newIdx = selectedIndex === index ? null : index;
                  setSelectedIndex(newIdx);
                  if (newIdx !== null) onDataPointPress?.(index, item);
                }}
                activeOpacity={0.5}
              />
            ))}
          </View>
        </View>
      </View>

      {/* Trend indicator */}
      {data.length >= 2 && (
        <View style={styles.trendRow}>
          {(() => {
            const first = data[0].value;
            const last = data[data.length - 1].value;
            const diff = last - first;
            const isUp = diff >= 0;
            return (
              <>
                <View
                  style={[
                    styles.trendBadge,
                    {
                      backgroundColor: isUp
                        ? "rgba(16,185,129,0.12)"
                        : "rgba(239,68,68,0.12)",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.trendText,
                      { color: isUp ? "#10B981" : "#EF4444" },
                    ]}
                  >
                    {isUp ? "▲" : "▼"} {Math.abs(diff).toFixed(1)}{unit} overall
                  </Text>
                </View>
                <Text style={styles.trendHint}>Tap any point to inspect</Text>
              </>
            );
          })()}
        </View>
      )}

      {/* Selected detail */}
      {selectedIndex !== null && (
        <View style={styles.detailCard}>
          <View style={styles.detailCardTop}>
            <View style={styles.detailCardDot} />
            <Text style={styles.detailCardDate}>
              {data[selectedIndex].label}
            </Text>
            <TouchableOpacity
              onPress={() => setSelectedIndex(null)}
              style={styles.dismissBtn}
            >
              <Text style={styles.dismissText}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.detailStats}>
            <View style={styles.detailStat}>
              <Text style={styles.detailStatLabel}>Completion</Text>
              <Text style={styles.detailStatValue}>
                {data[selectedIndex].value}{unit}
              </Text>
            </View>
            <View style={styles.detailStat}>
              <Text style={styles.detailStatLabel}>Remaining</Text>
              <Text style={[styles.detailStatValue, { color: "#F87171" }]}>
                {(100 - data[selectedIndex].value).toFixed(1)}{unit}
              </Text>
            </View>
            {selectedIndex > 0 && (
              <View style={styles.detailStat}>
                <Text style={styles.detailStatLabel}>Change</Text>
                <Text
                  style={[
                    styles.detailStatValue,
                    {
                      color:
                        data[selectedIndex].value >= data[selectedIndex - 1].value
                          ? "#10B981"
                          : "#F87171",
                    },
                  ]}
                >
                  {data[selectedIndex].value >= data[selectedIndex - 1].value
                    ? "+"
                    : ""}
                  {(
                    data[selectedIndex].value - data[selectedIndex - 1].value
                  ).toFixed(1)}{unit}
                </Text>
              </View>
            )}
          </View>
          {data[selectedIndex].tooltip && (
            <Text style={styles.tooltipText}>{data[selectedIndex].tooltip}</Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  yAxisLabelContainer: { paddingLeft: 4 },
  yAxisLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.3)",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  chartArea: { position: "relative" },
  tapRow: {
    flex: 1,
    flexDirection: "row",
    height: "100%",
  },
  tapArea: { flex: 1, height: "100%" },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingTop: 2,
  },
  trendBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  trendText: {
    fontSize: 11,
    fontWeight: "700",
  },
  trendHint: {
    fontSize: 10,
    color: "rgba(255,255,255,0.3)",
    fontStyle: "italic",
  },
  detailCard: {
    marginTop: 4,
    padding: 14,
    backgroundColor: "rgba(6,182,212,0.07)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(6,182,212,0.2)",
    gap: 10,
  },
  detailCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailCardDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.INFO,
  },
  detailCardDate: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.8)",
  },
  dismissBtn: {
    padding: 4,
  },
  dismissText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
  },
  detailStats: {
    flexDirection: "row",
    gap: 8,
  },
  detailStat: {
    flex: 1,
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 8,
    gap: 4,
  },
  detailStatLabel: {
    fontSize: 9,
    color: "rgba(255,255,255,0.4)",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  detailStatValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
  },
  tooltipText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.45)",
    lineHeight: 16,
    fontStyle: "italic",
  },
});