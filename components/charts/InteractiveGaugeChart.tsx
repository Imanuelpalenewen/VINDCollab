import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from "react-native-svg";

interface InteractiveGaugeChartProps {
  value: number;
  maxValue?: number;
  label?: string;
  riskLevel?: "GREEN" | "YELLOW" | "RED";
  onPress?: () => void;
  description?: string;
  recommendations?: string[];
}

export const InteractiveGaugeChart: React.FC<InteractiveGaugeChartProps> = ({
  value,
  maxValue = 100,
  label,
  riskLevel = "YELLOW",
  onPress,
  description,
  recommendations,
}) => {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2 + 10;
  const radius = 80;

  const percentage = Math.min((value / maxValue) * 100, 100);
  const startAngle = -210; // degrees from right
  const sweepTotal = 240;  // degrees

  // Convert polar to cartesian
  const polarToCart = (angleDeg: number, r: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  };

  // Arc path helper
  const describeArc = (startDeg: number, endDeg: number, r: number) => {
    const s = polarToCart(startDeg, r);
    const e = polarToCart(endDeg, r);
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`;
  };

  // Zone arcs (each 80 degrees for 3 zones)
  const zoneSize = sweepTotal / 3;
  const bgStart = startAngle;
  const greenEnd = bgStart + zoneSize;
  const yellowEnd = greenEnd + zoneSize;
  const redEnd = yellowEnd + zoneSize;

  // Progress arc
  const progressEnd = startAngle + (percentage / 100) * sweepTotal;

  // Needle
  const needleAngle = startAngle + (percentage / 100) * sweepTotal;
  const needleLen = radius - 12;
  const needleTip = polarToCart(needleAngle, needleLen);
  const needleBase1 = polarToCart(needleAngle + 90, 6);
  const needleBase2 = polarToCart(needleAngle - 90, 6);

  const getColor = () => {
    switch (riskLevel) {
      case "GREEN": return "#10B981";
      case "YELLOW": return "#F59E0B";
      case "RED": return "#EF4444";
      default: return "#F59E0B";
    }
  };

  const getRiskLabel = () => {
    switch (riskLevel) {
      case "GREEN": return "Low Risk";
      case "YELLOW": return "Moderate Risk";
      case "RED": return "High Risk";
      default: return "Unknown";
    }
  };

  const getRiskIcon = () => {
    switch (riskLevel) {
      case "GREEN": return "shield-checkmark";
      case "YELLOW": return "warning";
      case "RED": return "alert-circle";
      default: return "help-circle";
    }
  };

  const getBgColor = () => {
    switch (riskLevel) {
      case "GREEN": return "rgba(16,185,129,0.1)";
      case "YELLOW": return "rgba(245,158,11,0.1)";
      case "RED": return "rgba(239,68,68,0.1)";
      default: return "rgba(245,158,11,0.1)";
    }
  };

  const color = getColor();

  // Zone label positions
  const lowPos = polarToCart(bgStart + zoneSize * 0.5, radius + 16);
  const medPos = polarToCart(bgStart + zoneSize * 1.5, radius + 16);
  const hiPos = polarToCart(bgStart + zoneSize * 2.5, radius + 16);

  // Tick marks
  const ticks = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={onPress ? 0.85 : 1}
    >
      {/* Gauge SVG */}
      <View style={styles.gaugeWrapper}>
        <Svg width={size} height={size * 0.88} viewBox={`0 0 ${size} ${size * 0.88}`}>
          <Defs>
            <LinearGradient id="needleGrad" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
              <Stop offset="100%" stopColor={color} stopOpacity="1" />
            </LinearGradient>
          </Defs>

          {/* Zone background arcs */}
          <Path
            d={describeArc(bgStart, greenEnd, radius)}
            stroke="#10B981"
            strokeWidth="10"
            fill="none"
            strokeLinecap="butt"
            opacity="0.25"
          />
          <Path
            d={describeArc(greenEnd, yellowEnd, radius)}
            stroke="#F59E0B"
            strokeWidth="10"
            fill="none"
            strokeLinecap="butt"
            opacity="0.25"
          />
          <Path
            d={describeArc(yellowEnd, redEnd, radius)}
            stroke="#EF4444"
            strokeWidth="10"
            fill="none"
            strokeLinecap="butt"
            opacity="0.25"
          />

          {/* Zone dividers */}
          {[greenEnd, yellowEnd].map((angle, i) => {
            const inner = polarToCart(angle, radius - 8);
            const outer = polarToCart(angle, radius + 8);
            return (
              <Line
                key={`div-${i}`}
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke="rgba(0,0,0,0.5)"
                strokeWidth="1.5"
              />
            );
          })}

          {/* Progress arc (colored) */}
          {percentage > 0 && (
            <Path
              d={describeArc(bgStart, progressEnd, radius)}
              stroke={color}
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
            />
          )}

          {/* Tick marks */}
          {ticks.map((tick) => {
            const tickAngle = startAngle + (tick / 100) * sweepTotal;
            const isMajor = tick % 50 === 0;
            const innerR = radius - (isMajor ? 16 : 13);
            const outerR = radius - 8;
            const s = polarToCart(tickAngle, innerR);
            const e = polarToCart(tickAngle, outerR);
            return (
              <Line
                key={`tick-${tick}`}
                x1={s.x}
                y1={s.y}
                x2={e.x}
                y2={e.y}
                stroke="rgba(255,255,255,0.25)"
                strokeWidth={isMajor ? "1.5" : "0.8"}
              />
            );
          })}

          {/* Scale labels */}
          {[0, 25, 50, 75, 100].map((v) => {
            const tickAngle = startAngle + (v / 100) * sweepTotal;
            const pos = polarToCart(tickAngle, radius - 26);
            return (
              <SvgText
                key={`scale-${v}`}
                x={pos.x}
                y={pos.y + 3}
                textAnchor="middle"
                fontSize="7"
                fill="rgba(255,255,255,0.4)"
                fontWeight="600"
              >
                {v}
              </SvgText>
            );
          })}

          {/* Zone labels */}
          <SvgText x={lowPos.x} y={lowPos.y + 3} textAnchor="middle" fontSize="6.5" fill="#10B981" fontWeight="700" opacity="0.8">LOW</SvgText>
          <SvgText x={medPos.x} y={medPos.y + 3} textAnchor="middle" fontSize="6.5" fill="#F59E0B" fontWeight="700" opacity="0.8">MED</SvgText>
          <SvgText x={hiPos.x} y={hiPos.y + 3} textAnchor="middle" fontSize="6.5" fill="#EF4444" fontWeight="700" opacity="0.8">HIGH</SvgText>

          {/* Needle */}
          <Path
            d={`M ${needleBase1.x} ${needleBase1.y} L ${needleTip.x} ${needleTip.y} L ${needleBase2.x} ${needleBase2.y} Z`}
            fill="url(#needleGrad)"
            opacity="0.9"
          />

          {/* Needle pivot */}
          <Circle cx={cx} cy={cy} r="7" fill={color} opacity="0.9" />
          <Circle cx={cx} cy={cy} r="3.5" fill="#fff" opacity="0.95" />

          {/* Center value display */}
          <SvgText
            x={cx}
            y={cy + 28}
            textAnchor="middle"
            fontSize="22"
            fontWeight="800"
            fill={color}
          >
            {value}
          </SvgText>
          {label && (
            <SvgText
              x={cx}
              y={cy + 40}
              textAnchor="middle"
              fontSize="8"
              fill="rgba(255,255,255,0.4)"
              fontWeight="600"
            >
              {label}
            </SvgText>
          )}
        </Svg>
      </View>

      {/* Risk status badge */}
      <View style={[styles.statusBadge, { backgroundColor: getBgColor(), borderColor: `${color}40` }]}>
        <Ionicons name={getRiskIcon() as any} size={18} color={color} />
        <View style={styles.statusContent}>
          <Text style={[styles.statusLabel, { color }]}>{getRiskLabel()}</Text>
          <Text style={styles.statusSub}>Score: {value} / {maxValue}</Text>
        </View>
        {onPress && (
          <View style={styles.tapHint}>
            <Text style={styles.tapHintText}>Tap for details</Text>
            <Ionicons name="chevron-forward" size={12} color="rgba(255,255,255,0.3)" />
          </View>
        )}
      </View>

      {/* Zone explanation */}
      <View style={styles.zoneExplanation}>
        <View style={styles.zoneItem}>
          <View style={[styles.zoneDot, { backgroundColor: "#10B981" }]} />
          <Text style={styles.zoneText}>0–33: Low Risk</Text>
        </View>
        <View style={styles.zoneItem}>
          <View style={[styles.zoneDot, { backgroundColor: "#F59E0B" }]} />
          <Text style={styles.zoneText}>34–66: Moderate</Text>
        </View>
        <View style={styles.zoneItem}>
          <View style={[styles.zoneDot, { backgroundColor: "#EF4444" }]} />
          <Text style={styles.zoneText}>67–100: High Risk</Text>
        </View>
      </View>

      {/* Description */}
      {description && (
        <View style={styles.descriptionBox}>
          <Ionicons name="information-circle-outline" size={14} color="rgba(255,255,255,0.35)" />
          <Text style={styles.description}>{description}</Text>
        </View>
      )}

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <View style={styles.recContainer}>
          <View style={styles.recHeader}>
            <Ionicons name="bulb-outline" size={14} color="#F59E0B" />
            <Text style={styles.recTitle}>Recommendations</Text>
          </View>
          {recommendations.map((rec, i) => (
            <View key={i} style={styles.recItem}>
              <View style={styles.recBullet} />
              <Text style={styles.recText}>{rec}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { gap: 12 },
  gaugeWrapper: {
    alignItems: "center",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusContent: { flex: 1 },
  statusLabel: {
    fontSize: 14,
    fontWeight: "800",
  },
  statusSub: {
    fontSize: 10,
    color: "rgba(255,255,255,0.4)",
    marginTop: 1,
  },
  tapHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  tapHintText: {
    fontSize: 9,
    color: "rgba(255,255,255,0.3)",
    fontStyle: "italic",
  },
  zoneExplanation: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  zoneItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  zoneDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  zoneText: {
    fontSize: 9.5,
    color: "rgba(255,255,255,0.45)",
    fontWeight: "600",
  },
  descriptionBox: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  description: {
    flex: 1,
    fontSize: 11,
    color: "rgba(255,255,255,0.45)",
    lineHeight: 17,
  },
  recContainer: {
    padding: 12,
    backgroundColor: "rgba(245,158,11,0.06)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.15)",
    gap: 8,
  },
  recHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  recTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.7)",
  },
  recItem: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  recBullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#F59E0B",
    marginTop: 5,
    flexShrink: 0,
  },
  recText: {
    flex: 1,
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    lineHeight: 17,
  },
});