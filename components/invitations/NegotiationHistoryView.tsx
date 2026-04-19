import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/convex/_generated/api";
import { Colors } from "@/constants/Colors";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Id } from "@/convex/_generated/dataModel";

interface Props {
  invitationId: Id<"invitations">;
}

export default function NegotiationHistoryView({ invitationId }: Props) {
  const history = useQuery(api.invitations.getNegotiationHistory, {
    invitationId,
  });

  if (!history) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="small" color={Colors.PRIMARY} />
      </View>
    );
  }

  if (history.length === 0) {
    return null;
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getResponseBadgeVariant = (response?: string) => {
    switch (response) {
      case "ACCEPTED":
        return "green";
      case "DECLINED":
        return "red";
      case "COUNTER_PROPOSED":
        return "purple";
      default:
        return "default";
    }
  };

  const getResponseLabel = (response?: string) => {
    switch (response) {
      case "ACCEPTED":
        return "✓ Accepted";
      case "DECLINED":
        return "✗ Declined";
      case "COUNTER_PROPOSED":
        return "↔ Counter";
      default:
        return "Proposed";
    }
  };

  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Negotiation History</Text>

      {history.map((entry, index) => (
        <View key={entry._id} style={s.timelineItem}>
          {/* Timeline connector */}
          {index < history.length - 1 && <View style={s.timelineConnector} />}

          <View style={s.timelineDot} />

          <Card style={s.historyCard}>
            <View style={s.historyHeader}>
              <Text style={s.roundBadge}>Round {entry.round}</Text>
              <Text style={s.timestamp}>{formatDate(entry._creationTime)}</Text>
            </View>

            <View style={s.historyContent}>
              <View style={s.proposedBySection}>
                <Text style={s.proposedByLabel}>Proposed by</Text>
                <Text style={s.proposerId}>{entry.proposedBy}</Text>
              </View>

              <View style={s.termsGrid}>
                <View style={s.termItem}>
                  <Text style={s.termLabel}>Role</Text>
                  <Badge label={entry.proposedRole} />
                </View>

                {entry.resourceContribution && (
                  <View style={s.termItem}>
                    <Text style={s.termLabel}>Resources</Text>
                    <Text style={s.termValue}>
                      {entry.resourceContribution}
                    </Text>
                  </View>
                )}

                {entry.revenueSharing && (
                  <View style={s.termItem}>
                    <Text style={s.termLabel}>Revenue</Text>
                    <Text style={s.termValue}>
                      {entry.revenueSharing.percentage}%
                    </Text>
                  </View>
                )}
              </View>

              {entry.notes && (
                <View style={s.notesSection}>
                  <Text style={s.notesLabel}>Notes</Text>
                  <Text style={s.notesText}>{entry.notes}</Text>
                </View>
              )}

              {entry.response && (
                <View style={s.responseSection}>
                  <Badge
                    label={getResponseLabel(entry.response)}
                    variant={getResponseBadgeVariant(entry.response)}
                  />
                  {entry.respondedBy && (
                    <Text style={s.respondedByText}>
                      by {entry.respondedBy}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </Card>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.TEXT_PRIMARY,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  timelineItem: {
    marginBottom: 12,
    position: "relative",
  },
  timelineConnector: {
    position: "absolute",
    left: 15,
    top: 40,
    width: 2,
    height: 80,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  timelineDot: {
    position: "absolute",
    left: 8,
    top: 12,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.ACCENT,
    borderWidth: 2,
    borderColor: Colors.BG_DARK,
    zIndex: 10,
  },
  historyCard: {
    marginLeft: 32,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  roundBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.ACCENT,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  timestamp: {
    fontSize: 11,
    color: Colors.TEXT_MUTED,
  },
  historyContent: {
    gap: 8,
  },
  proposedBySection: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
    paddingBottom: 8,
  },
  proposedByLabel: {
    fontSize: 10,
    color: Colors.TEXT_MUTED,
    marginBottom: 2,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  proposerId: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.TEXT_SECONDARY,
  },
  termsGrid: {
    gap: 6,
  },
  termItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  termLabel: {
    fontSize: 11,
    color: Colors.TEXT_MUTED,
    fontWeight: "600",
  },
  termValue: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.TEXT_SECONDARY,
  },
  notesSection: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
    paddingTop: 8,
  },
  notesLabel: {
    fontSize: 10,
    color: Colors.TEXT_MUTED,
    marginBottom: 4,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  notesText: {
    fontSize: 12,
    color: Colors.TEXT_SECONDARY,
    lineHeight: 18,
  },
  responseSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
    paddingTop: 8,
  },
  respondedByText: {
    fontSize: 11,
    color: Colors.TEXT_MUTED,
  },
});
