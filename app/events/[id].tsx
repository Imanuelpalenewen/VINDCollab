import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import { Colors } from "@/constants/Colors";
import { Id } from "@/convex/_generated/dataModel";

// Constants
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

type EventStatus = "DRAFT" | "OPEN" | "PLANNING" | "EXECUTING" | "COMPLETED";
type TabKey = "overview" | "partners" | "tasks";

const STATUS_CONFIG: Record<EventStatus, { label: string; color: string; bg: string; border: string }> = {
  DRAFT:     { label: "Draft",     color: "#94A3B8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.3)" },
  OPEN:      { label: "Open",      color: "#3B82F6", bg: "rgba(59,130,246,0.1)",  border: "rgba(59,130,246,0.3)"  },
  PLANNING:  { label: "Planning",  color: "#F59E0B", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.3)"  },
  EXECUTING: { label: "Live",      color: "#10B981", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.3)"  },
  COMPLETED: { label: "Completed", color: "#8B5CF6", bg: "rgba(139,92,246,0.1)",  border: "rgba(139,92,246,0.3)"  },
};

// Helpers
function formatDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

// Screen
export default function EventDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const myOrg = useQuery(api.organizations.getMyOrg);
  const event = useQuery(api.events.getById, { id: id as Id<"events"> });
  const publishMutation = useMutation(api.events.publishEvent);

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [publishing, setPublishing] = useState(false);

  // Loading
  if (event === undefined) {
    return (
      <View style={s.centered}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.BG_DARK} />
        <ActivityIndicator size="large" color={Colors.PRIMARY} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={s.centered}>
        <Ionicons name="alert-circle-outline" size={40} color={Colors.ERROR} />
        <Text style={s.centeredText}>Event not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={s.backFallback}>
          <Text style={{ color: Colors.PRIMARY }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const cfg = STATUS_CONFIG[event.status as EventStatus];
  const isMyEvent = event.hostOrg?._id === myOrg?._id;
  const canPublish = isMyEvent && event.status === "DRAFT";
  const canFindPartners = isMyEvent && (event.status === "OPEN" || event.status === "PLANNING");

  const handlePublish = () => {
    Alert.alert(
      "Publish Event?",
      "Your event will be visible to other organizations for collaboration.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Publish",
          onPress: async () => {
            setPublishing(true);
            try {
              await publishMutation({ id: id as Id<"events"> });
            } catch (err: any) {
              Alert.alert("Error", err.message ?? "Failed to publish event.");
            } finally {
              setPublishing(false);
            }
          },
        },
      ]
    );
  };

  // Tab content
  const renderTab = () => {
    if (activeTab === "overview") {
      return (
        <>
          {/* Description */}
          <Text style={s.fieldLabel}>ABOUT</Text>
          <Text style={s.description}>{event.description}</Text>

          {/* Requirements */}
          {event.requirements.length > 0 && (
            <>
              <Text style={s.fieldLabel}>REQUIREMENTS</Text>
              <View style={s.chipGrid}>
                {event.requirements.map((r) => (
                  <View key={r} style={s.reqChip}>
                    <Ionicons name="checkmark-circle" size={12} color={Colors.INFO} />
                    <Text style={s.reqChipText}>{r}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Partner Criteria */}
          {event.partnerCriteria.length > 0 && (
            <>
              <Text style={[s.fieldLabel, { marginTop: 20 }]}>PARTNER CRITERIA</Text>
              <View style={s.chipGrid}>
                {event.partnerCriteria.map((c) => (
                  <View key={c} style={s.criteriaChip}>
                    <Text style={s.criteriaChipText}>{c}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Host org */}
          <Text style={[s.fieldLabel, { marginTop: 20 }]}>HOST ORGANIZATION</Text>
          <View style={s.hostCard}>
            <View style={s.hostIcon}>
              <Ionicons name="business-outline" size={18} color={Colors.PRIMARY} />
            </View>
            <View>
              <Text style={s.hostName}>{event.hostOrg?.name}</Text>
              <Text style={s.hostCategory}>{event.hostOrg?.category}</Text>
            </View>
            {isMyEvent && (
              <View style={s.youBadge}>
                <Text style={s.youBadgeText}>You</Text>
              </View>
            )}
          </View>
        </>
      );
    }

    if (activeTab === "partners") {
      return (
        <View style={s.tabPlaceholder}>
          <View style={s.tabPlaceholderIcon}>
            <Ionicons name="people-outline" size={32} color={Colors.PRIMARY} />
          </View>
          <Text style={s.tabPlaceholderTitle}>
            {(event.acceptedPartners ?? 0) > 0
              ? `${event.acceptedPartners} Partner${event.acceptedPartners! > 1 ? "s" : ""}`
              : "No partners yet"}
          </Text>
          <Text style={s.tabPlaceholderText}>
            {(event.pendingInvites ?? 0) > 0
              ? `${event.pendingInvites} pending invite${event.pendingInvites! > 1 ? "s" : ""} awaiting response.`
              : canFindPartners
              ? "Use AI Partner Recommender to find the best collaborators."
              : "Publish this event to start inviting partner organizations."}
          </Text>
          {canFindPartners && (
            <TouchableOpacity
              style={s.aiBtn}
              onPress={() => router.push(`/events/partners?eventId=${id}`)}
              activeOpacity={0.85}
            >
              <Ionicons name="sparkles" size={16} color="#fff" />
              <Text style={s.aiBtnText}>Find Partners with AI</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    if (activeTab === "tasks") {
      return (
        <View style={s.tabPlaceholder}>
          <View style={s.tabPlaceholderIcon}>
            <Ionicons name="checkmark-circle-outline" size={32} color="#C4B5FD" />
          </View>
          <Text style={s.tabPlaceholderTitle}>Tasks</Text>
          <Text style={s.tabPlaceholderText}>
            {canFindPartners
              ? "Generate AI Task Breakdown using your accepted partners as a starting point."
              : "Accept partners first to generate AI tasks."}
          </Text>
          {canFindPartners && (
            <TouchableOpacity
              style={s.aiBtn}
              onPress={() => router.push(`/events/task-review?eventId=${id}`)}
              activeOpacity={0.85}
            >
              <Ionicons name="sparkles" size={16} color="#fff" />
              <Text style={s.aiBtnText}>Generate AI Tasks</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }
  };

  // Render
  return (
    <SafeAreaView style={s.flex} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.BG_DARK} />

      <ScrollView style={s.flex} contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={20} color={Colors.TEXT_SECONDARY} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          {/* Chat Button */}
          {((event.acceptedPartners ?? 0) > 0 || isMyEvent) && (
            <TouchableOpacity 
              style={[s.backBtn, { marginRight: 10 }]} 
              onPress={() => router.push("/chat")}
            >
              <Ionicons name="chatbubbles-outline" size={20} color={Colors.PRIMARY} />
            </TouchableOpacity>
          )}
          {/* Status badge */}
          <View style={[s.statusBadge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
            <Text style={[s.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        {/* Event title */}
        <Text style={s.eventTitle}>{event.title}</Text>

        {/* Meta row */}
        <View style={s.metaRow}>
          <View style={s.metaItem}>
            <Ionicons name="calendar-outline" size={14} color={Colors.TEXT_MUTED} />
            <Text style={s.metaText}>
              {formatDate(event.startDate)}
              {!isSameDayMs(event.startDate, event.endDate) && ` – ${formatDate(event.endDate)}`}
            </Text>
          </View>
          <View style={s.metaDot} />
          <View style={s.metaItem}>
            <Ionicons name="pricetag-outline" size={14} color={Colors.TEXT_MUTED} />
            <Text style={s.metaText}>{event.eventType}</Text>
          </View>
        </View>

        {/* Stats strip */}
        <View style={s.statsStrip}>
          <View style={s.stripItem}>
            <Text style={[s.stripVal, { color: "#93C5FD" }]}>{event.acceptedPartners ?? 0}</Text>
            <Text style={s.stripLabel}>Partners</Text>
          </View>
          <View style={s.stripDivider} />
          <View style={s.stripItem}>
            <Text style={[s.stripVal, { color: "#FCD34D" }]}>{event.pendingInvites ?? 0}</Text>
            <Text style={s.stripLabel}>Pending</Text>
          </View>
          <View style={s.stripDivider} />
          <View style={s.stripItem}>
            <Text style={[s.stripVal, { color: "#6EE7B7" }]}>{event.requirements.length}</Text>
            <Text style={s.stripLabel}>Requirements</Text>
          </View>
        </View>

        {/* Tab bar */}
        <View style={s.tabBar}>
          {(["overview", "partners", "tasks"] as TabKey[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[s.tabItem, activeTab === tab && s.tabItemActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab content */}
        <View style={s.tabContent}>
          {renderTab()}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom action bar */}
      {(canPublish || canFindPartners) && (
        <View style={s.actionBar}>
          {canPublish && (
            <TouchableOpacity
              style={s.publishBtn}
              onPress={handlePublish}
              disabled={publishing}
              activeOpacity={0.85}
            >
              {publishing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="rocket-outline" size={18} color="#fff" />
                  <Text style={s.publishBtnText}>Publish Event</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          {canFindPartners && (
            <TouchableOpacity
              style={s.aiActionBtn}
              onPress={() => router.push(`/events/partners?eventId=${id}`)}
              activeOpacity={0.85}
            >
              <Ionicons name="sparkles" size={18} color="#fff" />
              <Text style={s.aiActionBtnText}>Find Partners</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

function isSameDayMs(a: number, b: number) {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear() &&
         da.getMonth() === db.getMonth() &&
         da.getDate() === db.getDate();
}

// Styles
const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.BG_DARK },
  centered: { flex: 1, backgroundColor: Colors.BG_DARK, alignItems: "center", justifyContent: "center", gap: 12 },
  centeredText: { color: Colors.TEXT_SECONDARY, fontSize: 15 },
  backFallback: { paddingHorizontal: 20, paddingVertical: 10 },
  container: { paddingHorizontal: 20, paddingTop: 8 },

  // Header
  header: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: Colors.BG_CARD, borderWidth: 1, borderColor: Colors.BORDER,
    alignItems: "center", justifyContent: "center",
  },
  statusBadge: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1,
  },
  statusText: { fontSize: 12, fontWeight: "700" },

  // Title
  eventTitle: {
    fontSize: 24, fontWeight: "800", color: Colors.TEXT_PRIMARY,
    letterSpacing: -0.4, marginBottom: 12, lineHeight: 32,
  },

  // Meta
  metaRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: 13, color: Colors.TEXT_MUTED },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: Colors.TEXT_MUTED },

  // Stats strip
  statsStrip: {
    flexDirection: "row", backgroundColor: Colors.BG_CARD, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.BORDER, marginBottom: 20, overflow: "hidden",
  },
  stripItem: { flex: 1, alignItems: "center", paddingVertical: 14, gap: 3 },
  stripVal: { fontSize: 20, fontWeight: "800" },
  stripLabel: { fontSize: 10, color: Colors.TEXT_MUTED, fontWeight: "600" },
  stripDivider: { width: 1, backgroundColor: Colors.BORDER, marginVertical: 10 },

  // Tabs
  tabBar: {
    flexDirection: "row", backgroundColor: Colors.BG_CARD,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.BORDER,
    padding: 4, marginBottom: 20,
  },
  tabItem: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: "center" },
  tabItemActive: { backgroundColor: "rgba(59,130,246,0.15)" },
  tabText: { fontSize: 13, color: Colors.TEXT_MUTED, fontWeight: "600" },
  tabTextActive: { color: Colors.PRIMARY, fontWeight: "700" },
  tabContent: {},

  // Overview tab
  fieldLabel: {
    fontSize: 10, fontWeight: "700", color: Colors.TEXT_MUTED,
    letterSpacing: 0.8, marginBottom: 10,
  },
  description: { fontSize: 14, color: Colors.TEXT_SECONDARY, lineHeight: 22, marginBottom: 20 },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  reqChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: "rgba(6,182,212,0.08)", borderWidth: 1, borderColor: "rgba(6,182,212,0.25)",
  },
  reqChipText: { color: Colors.INFO, fontSize: 12, fontWeight: "500" },
  criteriaChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: "rgba(139,92,246,0.08)", borderWidth: 1, borderColor: "rgba(139,92,246,0.25)",
  },
  criteriaChipText: { color: "#C4B5FD", fontSize: 12, fontWeight: "500" },
  hostCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.BG_CARD, borderRadius: 14, borderWidth: 1,
    borderColor: Colors.BORDER, padding: 14,
  },
  hostIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "rgba(59,130,246,0.12)", alignItems: "center", justifyContent: "center",
  },
  hostName: { fontSize: 14, fontWeight: "700", color: Colors.TEXT_PRIMARY },
  hostCategory: { fontSize: 12, color: Colors.TEXT_MUTED, marginTop: 2 },
  youBadge: {
    marginLeft: "auto", backgroundColor: "rgba(59,130,246,0.15)",
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: "rgba(59,130,246,0.3)",
  },
  youBadgeText: { color: "#93C5FD", fontSize: 11, fontWeight: "700" },

  // Placeholder tabs
  tabPlaceholder: { alignItems: "center", paddingVertical: 32, gap: 10 },
  tabPlaceholderIcon: {
    width: 68, height: 68, borderRadius: 20,
    backgroundColor: Colors.BG_CARD, borderWidth: 1, borderColor: Colors.BORDER,
    alignItems: "center", justifyContent: "center",
  },
  tabPlaceholderTitle: { fontSize: 16, fontWeight: "700", color: Colors.TEXT_PRIMARY },
  tabPlaceholderText: {
    fontSize: 13, color: Colors.TEXT_MUTED, textAlign: "center",
    lineHeight: 20, paddingHorizontal: 20,
  },
  aiBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12,
    backgroundColor: Colors.PRIMARY, marginTop: 8,
  },
  aiBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  // Bottom action bar
  actionBar: {
    paddingHorizontal: 20, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: Colors.BORDER,
    backgroundColor: Colors.BG_DARK,
  },
  publishBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 16, borderRadius: 14, backgroundColor: Colors.PRIMARY,
  },
  publishBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  aiActionBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 16, borderRadius: 14,
    backgroundColor: Colors.ACCENT,
  },
  aiActionBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
