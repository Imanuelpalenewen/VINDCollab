import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";

// Types
type EventStatus = "DRAFT" | "OPEN" | "PLANNING" | "EXECUTING" | "COMPLETED";

interface EventCardData {
  _id: string;
  title: string;
  eventType: string;
  status: EventStatus;
  startDate: number;
  endDate: number;
  requirements: string[];
  hostOrgName?: string;      // only in Discover section
  acceptedPartners?: number;
}

interface EventCardProps {
  event: EventCardData;
  onPress: () => void;
  /** Show host org name — used in Discover section */
  showOrg?: boolean;
}

// Config
const STATUS_CONFIG: Record<EventStatus, { label: string; color: string; bg: string; border: string }> = {
  DRAFT:     { label: "Draft",     color: "#94A3B8",  bg: "rgba(148,163,184,0.1)",  border: "rgba(148,163,184,0.25)" },
  OPEN:      { label: "Open",      color: "#3B82F6",  bg: "rgba(59,130,246,0.1)",   border: "rgba(59,130,246,0.3)"   },
  PLANNING:  { label: "Planning",  color: "#F59E0B",  bg: "rgba(245,158,11,0.1)",   border: "rgba(245,158,11,0.3)"   },
  EXECUTING: { label: "Live 🔴",   color: "#10B981",  bg: "rgba(16,185,129,0.1)",   border: "rgba(16,185,129,0.3)"   },
  COMPLETED: { label: "Completed", color: "#8B5CF6",  bg: "rgba(139,92,246,0.1)",   border: "rgba(139,92,246,0.3)"   },
};

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Helpers
function formatDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

function isSameDay(a: number, b: number): boolean {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear() &&
         da.getMonth() === db.getMonth() &&
         da.getDate() === db.getDate();
}

// Component
export function EventCard({ event, onPress, showOrg = false }: EventCardProps) {
  const cfg = STATUS_CONFIG[event.status];

  const dateRange = isSameDay(event.startDate, event.endDate)
    ? formatDate(event.startDate)
    : `${formatDate(event.startDate)} – ${formatDate(event.endDate)}`;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      {/* Top row: status badge + event type */}
      <View style={styles.topRow}>
        <View style={[styles.badge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
          <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        <View style={styles.typePill}>
          <Text style={styles.typePillText}>{event.eventType}</Text>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title} numberOfLines={2}>{event.title}</Text>

      {/* Date + org row */}
      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={13} color={Colors.TEXT_MUTED} />
        <Text style={styles.metaText}>{dateRange}</Text>
      </View>

      {/* Bottom info row */}
      <View style={styles.bottomRow}>
        {showOrg && event.hostOrgName ? (
          <View style={styles.orgPill}>
            <Ionicons name="business-outline" size={11} color={Colors.TEXT_MUTED} />
            <Text style={styles.orgPillText} numberOfLines={1}>{event.hostOrgName}</Text>
          </View>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        <View style={styles.statsRow}>
          {(event.acceptedPartners ?? 0) > 0 && (
            <View style={styles.statPill}>
              <Ionicons name="people-outline" size={11} color={Colors.SUCCESS} />
              <Text style={[styles.statText, { color: Colors.SUCCESS }]}>
                {event.acceptedPartners}
              </Text>
            </View>
          )}
          {event.requirements.length > 0 && (
            <View style={styles.statPill}>
              <Ionicons name="list-outline" size={11} color={Colors.TEXT_MUTED} />
              <Text style={styles.statText}>{event.requirements.length} needs</Text>
            </View>
          )}
        </View>
      </View>

      {/* Right arrow */}
      <View style={styles.chevron}>
        <Ionicons name="chevron-forward" size={16} color={Colors.TEXT_MUTED} />
      </View>
    </TouchableOpacity>
  );
}

// Styles
const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.BG_CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    padding: 16,
    marginBottom: 10,
    position: "relative",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: "rgba(139,92,246,0.1)",
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.25)",
  },
  typePillText: { fontSize: 11, color: "#C4B5FD", fontWeight: "600" },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.TEXT_PRIMARY,
    letterSpacing: -0.2,
    marginBottom: 8,
    paddingRight: 20,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 12,
  },
  metaText: { fontSize: 12, color: Colors.TEXT_MUTED },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  orgPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  orgPillText: { fontSize: 12, color: Colors.TEXT_MUTED, flex: 1 },
  statsRow: { flexDirection: "row", gap: 8 },
  statPill: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontSize: 11, color: Colors.TEXT_MUTED, fontWeight: "600" },
  chevron: { position: "absolute", top: 16, right: 12 },
});
