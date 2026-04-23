import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface RiskScoreCardProps {
  riskScore: number;
  riskLevel: "GREEN" | "YELLOW" | "RED";
  generatedAt: number;
  isHost: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}

const RISK_COLORS = {
  GREEN: Colors.SUCCESS,
  YELLOW: Colors.WARNING,
  RED: Colors.ERROR,
};

const RISK_LABELS = {
  GREEN: "On Track",
  YELLOW: "At Risk",
  RED: "Critical",
};

const RISK_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  GREEN: "checkmark-circle",
  YELLOW: "warning",
  RED: "alert-circle",
};

export const RiskScoreCard: React.FC<RiskScoreCardProps> = ({
  riskScore,
  riskLevel,
  generatedAt,
  isHost,
  refreshing,
  onRefresh,
}) => {
  const color = RISK_COLORS[riskLevel];
  const label = RISK_LABELS[riskLevel];
  const iconName = RISK_ICONS[riskLevel];

  const hoursAgo = Math.floor((Date.now() - generatedAt) / (1000 * 60 * 60));
  const timeLabel =
    hoursAgo === 0 ? "Just now" : hoursAgo === 1 ? "1 hour ago" : `${hoursAgo} hours ago`;

  return (
    <View style={[styles.card, { borderColor: color + "40" }]}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.cardTitle}>Risk Assessment</Text>
          <Text style={styles.timeLabel}>Updated {timeLabel}</Text>
        </View>
        {isHost && (
          <TouchableOpacity
            style={[styles.refreshBtn, { borderColor: color + "60" }]}
            onPress={onRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={color} />
            ) : (
              <View style={styles.refreshInner}>
                <Ionicons name="refresh" size={14} color={color} />
                <Text style={[styles.refreshText, { color }]}>Refresh</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.scoreRow}>
        <View style={[styles.scoreCircle, { borderColor: color, backgroundColor: color + "15" }]}>
          <Text style={[styles.scoreNumber, { color }]}>{riskScore}</Text>
          <Text style={styles.scoreMax}>/100</Text>
        </View>

        <View style={styles.scoreInfo}>
          <Ionicons name={iconName} size={28} color={color} />
          <View style={[styles.riskBadge, { backgroundColor: color + "20", borderColor: color + "60" }]}>
            <Text style={[styles.riskBadgeText, { color }]}>{label}</Text>
          </View>
          <Text style={styles.riskLevelText}>{riskLevel} Risk</Text>
          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: `${riskScore}%` as any, backgroundColor: color }]} />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.BG_CARD,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 16,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.TEXT_PRIMARY,
  },
  timeLabel: {
    fontSize: 11,
    color: Colors.TEXT_MUTED,
    marginTop: 2,
  },
  refreshBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    minWidth: 88,
    alignItems: "center",
  },
  refreshInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  refreshText: {
    fontSize: 12,
    fontWeight: "700",
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  scoreCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreNumber: {
    fontSize: 28,
    fontWeight: "900",
  },
  scoreMax: {
    fontSize: 10,
    color: Colors.TEXT_MUTED,
    marginTop: -4,
  },
  scoreInfo: {
    flex: 1,
    gap: 8,
  },
  riskBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  riskBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  riskLevelText: {
    fontSize: 11,
    color: Colors.TEXT_MUTED,
  },
  barBg: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
  },
});