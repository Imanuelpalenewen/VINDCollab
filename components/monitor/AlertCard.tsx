import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface Alert {
  id: string;
  title: string;
  description: string;
  riskLevel: "GREEN" | "YELLOW" | "RED";
  suggestions: string[];
  detectedAt: number;
}

interface AlertCardProps {
  alert: Alert;
  progressReportId: string;
  onFeedback: (alertId: string, action: "ACKNOWLEDGED" | "DISMISSED") => Promise<void>;
}

const RISK_COLORS = {
  GREEN: Colors.SUCCESS,
  YELLOW: Colors.WARNING,
  RED: Colors.ERROR,
};

const RISK_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  GREEN: "checkmark-circle",
  YELLOW: "warning",
  RED: "alert-circle",
};

export const AlertCard: React.FC<AlertCardProps> = ({ alert, onFeedback }) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const color = RISK_COLORS[alert.riskLevel];
  const iconName = RISK_ICONS[alert.riskLevel];

  const handleFeedback = async (action: "ACKNOWLEDGED" | "DISMISSED") => {
    setLoading(action);
    try {
      await onFeedback(alert.id, action);
      setDone(true);
    } finally {
      setLoading(null);
    }
  };

  if (done) return null;

  return (
    <View style={[styles.card, { borderLeftColor: color, borderColor: color + "30" }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name={iconName} size={16} color={color} />
          <View style={[styles.badge, { backgroundColor: color + "20" }]}>
            <Text style={[styles.badgeText, { color }]}>{alert.riskLevel}</Text>
          </View>
        </View>
        <Text style={styles.time}>
          {new Date(alert.detectedAt).toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>

      <Text style={styles.title}>{alert.title}</Text>
      <Text style={styles.description}>{alert.description}</Text>

      {alert.suggestions.length > 0 && (
        <View style={styles.suggestions}>
          <View style={styles.suggestionsHeader}>
            <Ionicons name="bulb-outline" size={12} color={Colors.TEXT_MUTED} />
            <Text style={styles.suggestionsLabel}>Suggestions</Text>
          </View>
          {alert.suggestions.map((s, i) => (
            <View key={i} style={styles.suggestionRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.suggestionText}>{s}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, styles.ackBtn]}
          onPress={() => handleFeedback("ACKNOWLEDGED")}
          disabled={loading !== null}
        >
          {loading === "ACKNOWLEDGED" ? (
            <ActivityIndicator size="small" color={Colors.PRIMARY} />
          ) : (
            <View style={styles.btnInner}>
              <Ionicons name="checkmark" size={14} color={Colors.PRIMARY} />
              <Text style={styles.ackText}>Acknowledge</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.dismissBtn]}
          onPress={() => handleFeedback("DISMISSED")}
          disabled={loading !== null}
        >
          {loading === "DISMISSED" ? (
            <ActivityIndicator size="small" color={Colors.TEXT_MUTED} />
          ) : (
            <View style={styles.btnInner}>
              <Ionicons name="close" size={14} color={Colors.TEXT_MUTED} />
              <Text style={styles.dismissText}>Dismiss</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.BG_CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 3,
    padding: 14,
    gap: 10,
    marginBottom: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  time: {
    fontSize: 11,
    color: Colors.TEXT_MUTED,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.TEXT_PRIMARY,
  },
  description: {
    fontSize: 12,
    color: Colors.TEXT_SECONDARY,
    lineHeight: 18,
  },
  suggestions: {
    backgroundColor: "rgba(59,130,246,0.05)",
    borderRadius: 8,
    padding: 10,
    gap: 6,
  },
  suggestionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  suggestionsLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.TEXT_MUTED,
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  bulletDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.PRIMARY,
    marginTop: 7,
  },
  suggestionText: {
    flex: 1,
    fontSize: 12,
    color: Colors.TEXT_SECONDARY,
    lineHeight: 18,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  btn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  btnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ackBtn: {
    borderColor: Colors.PRIMARY + "60",
    backgroundColor: "rgba(59,130,246,0.1)",
  },
  ackText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.PRIMARY,
  },
  dismissBtn: {
    borderColor: Colors.BORDER,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  dismissText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.TEXT_MUTED,
  },
});