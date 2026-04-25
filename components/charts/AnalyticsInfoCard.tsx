import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface AnalyticsInfoCardProps {
  title: string;
  icon: string;
  description: string;
  details?: Array<{
    label: string;
    value: string | number;
    unit?: string;
    trend?: "up" | "down" | "neutral";
  }>;
  onPress?: () => void;
  accentColor?: string;
}

export const AnalyticsInfoCard: React.FC<AnalyticsInfoCardProps> = ({
  title,
  icon,
  description,
  details,
  onPress,
  accentColor = Colors.PRIMARY,
}) => {
  const getTrendIcon = (trend?: "up" | "down" | "neutral") => {
    if (trend === "up") return { name: "trending-up", color: "#10B981" };
    if (trend === "down") return { name: "trending-down", color: "#EF4444" };
    return null;
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
    >
      {/* Accent bar */}
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

      <View style={styles.inner}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: `${accentColor}18` }]}>
            <Ionicons name={icon as any} size={18} color={accentColor} />
          </View>
          <View style={styles.titleWrap}>
            <Text style={styles.title}>{title}</Text>
            {onPress && (
              <View style={styles.tapHint}>
                <Text style={styles.tapHintText}>Tap for details</Text>
                <Ionicons
                  name="chevron-forward"
                  size={12}
                  color="rgba(255,255,255,0.3)"
                />
              </View>
            )}
          </View>
        </View>

        {/* Description */}
        <Text style={styles.description}>{description}</Text>

        {/* Details grid */}
        {details && details.length > 0 && (
          <View style={styles.detailsGrid}>
            {details.map((d, i) => {
              const trendIcon = getTrendIcon(d.trend);
              return (
                <View key={i} style={styles.detailCell}>
                  <Text style={styles.detailLabel}>{d.label}</Text>
                  <View style={styles.detailValueRow}>
                    <Text style={[styles.detailValue, { color: accentColor }]}>
                      {d.value}
                    </Text>
                    {d.unit && (
                      <Text style={styles.detailUnit}>{d.unit}</Text>
                    )}
                    {trendIcon && (
                      <Ionicons
                        name={trendIcon.name as any}
                        size={12}
                        color={trendIcon.color}
                      />
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: Colors.BG_CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    overflow: "hidden",
  },
  accentBar: {
    width: 4,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  inner: {
    flex: 1,
    padding: 14,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: "800",
    color: "rgba(255,255,255,0.9)",
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
  description: {
    fontSize: 11.5,
    color: "rgba(255,255,255,0.45)",
    lineHeight: 17,
  },
  detailsGrid: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  detailCell: {
    flex: 1,
    minWidth: 80,
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 10,
    gap: 4,
  },
  detailLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "rgba(255,255,255,0.35)",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  detailValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "800",
  },
  detailUnit: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255,255,255,0.35)",
  },
});