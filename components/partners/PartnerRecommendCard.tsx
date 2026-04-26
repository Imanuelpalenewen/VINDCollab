import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";

// Types
export interface Recommendation {
  orgId: string;
  orgName: string;
  orgCategory: string;
  orgCapabilities: string[];
  score: number;
  matchedCapabilities: string[];
  reasoning: string;
}

interface Props {
  recommendation: Recommendation;
  rank: number;
  onInvite?: (orgId: string) => void;
}

// Component
export default function PartnerRecommendCard({
  recommendation,
  rank,
  onInvite,
}: Props) {
  const { orgName, orgCategory, score, matchedCapabilities, reasoning, orgCapabilities } =
    recommendation;

  const scoreStyle = getScoreStyle(score);
  const isTopThree = rank <= 3;

  return (
    <View style={[s.card, isTopThree && s.cardHighlight]}>
      {/* Rank + Header */}
      <View style={s.headerRow}>
        <View
          style={[
            s.rankBadge,
            isTopThree && { backgroundColor: "rgba(59,130,246,0.15)", borderColor: "rgba(59,130,246,0.3)" },
          ]}
        >
          <Text style={[s.rankText, isTopThree && { color: Colors.PRIMARY }]}>
            #{rank}
          </Text>
        </View>

        <View style={s.headerInfo}>
          <Text style={s.orgName} numberOfLines={1}>
            {orgName}
          </Text>
          <View style={s.categoryRow}>
            <Ionicons name="business-outline" size={11} color={Colors.TEXT_MUTED} />
            <Text style={s.orgCategory}>{orgCategory}</Text>
          </View>
        </View>

        {/* Score */}
        <View
          style={[
            s.scoreBadge,
            { backgroundColor: scoreStyle.bg, borderColor: scoreStyle.border },
          ]}
        >
          <Text style={[s.scoreValue, { color: scoreStyle.color }]}>{score}</Text>
          <Text style={[s.scoreLabel, { color: scoreStyle.color }]}>
            {scoreStyle.label}
          </Text>
        </View>
      </View>

      {/* Matched Capabilities */}
      {matchedCapabilities.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>MATCHED CAPABILITIES</Text>
          <View style={s.chipRow}>
            {matchedCapabilities.map((cap) => (
              <View key={cap} style={s.matchChip}>
                <Ionicons name="checkmark-circle" size={11} color={Colors.SUCCESS} />
                <Text style={s.matchChipText}>{cap}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* All Capabilities */}
      {orgCapabilities.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>ALL CAPABILITIES</Text>
          <View style={s.chipRow}>
            {orgCapabilities.map((cap) => {
              const isMatched = matchedCapabilities
                .map((m) => m.toLowerCase())
                .includes(cap.toLowerCase());
              return (
                <View
                  key={cap}
                  style={[s.capChip, isMatched && s.capChipMatched]}
                >
                  <Text
                    style={[
                      s.capChipText,
                      isMatched && { color: Colors.SUCCESS },
                    ]}
                  >
                    {cap}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* AI Reasoning */}
      <View style={s.section}>
        <View style={s.reasoningHeader}>
          <Ionicons name="sparkles" size={12} color={Colors.ACCENT} />
          <Text style={s.sectionTitle}>AI ANALYSIS</Text>
        </View>
        <Text style={s.reasoningText}>{reasoning}</Text>
      </View>

      {/* Invite Button */}
      {onInvite && (
        <TouchableOpacity
          style={s.inviteBtn}
          onPress={() => onInvite(recommendation.orgId)}
          activeOpacity={0.85}
        >
          <Ionicons name="paper-plane-outline" size={15} color="#fff" />
          <Text style={s.inviteBtnText}>Send Invitation</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// Helpers
function getScoreStyle(score: number) {
  if (score >= 80)
    return {
      color: Colors.SUCCESS,
      bg: "rgba(16,185,129,0.12)",
      border: "rgba(16,185,129,0.3)",
      label: "Excellent",
    };
  if (score >= 50)
    return {
      color: Colors.WARNING,
      bg: "rgba(245,158,11,0.12)",
      border: "rgba(245,158,11,0.3)",
      label: "Good",
    };
  return {
    color: Colors.TEXT_MUTED,
    bg: "rgba(100,116,139,0.12)",
    border: "rgba(100,116,139,0.3)",
    label: "Partial",
  };
}

// Styles
const s = StyleSheet.create({
  card: {
    backgroundColor: Colors.BG_CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    padding: 16,
    marginBottom: 14,
  },
  cardHighlight: {
    borderColor: "rgba(59,130,246,0.2)",
  },

  // Header
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  rankBadge: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.BG_CARD,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  rankText: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.TEXT_MUTED,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  orgName: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.TEXT_PRIMARY,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  orgCategory: {
    fontSize: 12,
    color: Colors.TEXT_MUTED,
  },

  // Score badge
  scoreBadge: {
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 58,
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 24,
  },
  scoreLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginTop: 1,
  },

  // Sections
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.TEXT_MUTED,
    letterSpacing: 0.8,
    marginBottom: 8,
  },

  // Chips
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  matchChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: "rgba(16,185,129,0.08)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.2)",
  },
  matchChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.SUCCESS,
  },
  capChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: "rgba(100,116,139,0.08)",
    borderWidth: 1,
    borderColor: "rgba(100,116,139,0.15)",
  },
  capChipMatched: {
    backgroundColor: "rgba(16,185,129,0.06)",
    borderColor: "rgba(16,185,129,0.15)",
  },
  capChipText: {
    fontSize: 11,
    fontWeight: "500",
    color: Colors.TEXT_MUTED,
  },

  // Reasoning
  reasoningHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 8,
  },
  reasoningText: {
    fontSize: 13,
    color: Colors.TEXT_SECONDARY,
    lineHeight: 20,
  },

  // Invite button
  inviteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.PRIMARY,
    marginTop: 4,
  },
  inviteBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
});
