import React from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Image, StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import { EventCard } from "@/components/events/EventCard";
import { Colors } from "@/constants/Colors";

const AVATAR_PALETTE = ["#3B82F6","#8B5CF6","#EF4444","#10B981","#F59E0B","#06B6D4"];
function getInitials(name: string) {
  const p = name.trim().split(/\s+/);
  return p.length >= 2 ? (p[0][0]+p[p.length-1][0]).toUpperCase() : name.slice(0,2).toUpperCase();
}
function getAvatarColor(name: string) {
  let h = 0; for (let i = 0; i < name.length; i++) h += name.charCodeAt(i);
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const org = useQuery(api.organizations.getMyOrg);
  const stats = useQuery(api.organizations.getOrgStats);
  const myEvents = useQuery(api.events.listMyEvents) ?? [];
  const openEvents = useQuery(api.events.listOpenEvents) ?? [];

  const avatarColor = getAvatarColor(org?.name ?? user?.name ?? "?");
  const initials = getInitials(org?.name ?? user?.name ?? "?");

  const activeEventCount = myEvents.filter(
    (e) => e.status === "OPEN" || e.status === "PLANNING" || e.status === "EXECUTING"
  ).length;

  return (
    <SafeAreaView style={styles.flex} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.BG_DARK} />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ─────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Good day 👋</Text>
            <Text style={styles.orgName} numberOfLines={1}>
              {org?.name ?? user?.name ?? "—"}
            </Text>
          </View>

          <View style={styles.headerActions}>
            {/* Notification bell (placeholder for future) */}
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => {}}
              activeOpacity={0.8}
            >
              <Ionicons name="notifications-outline" size={20} color={Colors.TEXT_SECONDARY} />
            </TouchableOpacity>

            {/* Avatar → org profile */}
            <TouchableOpacity
              style={[styles.avatarBtn, { borderColor: avatarColor + "55" }]}
              onPress={() => router.push("/org-profile")}
              activeOpacity={0.8}
            >
              {org?.logoUrl ? (
                <Image source={{ uri: org.logoUrl }} style={styles.avatarImage} resizeMode="cover" />
              ) : (
                <View style={[styles.avatarInner, { backgroundColor: avatarColor + "22" }]}>
                  <Text style={[styles.avatarText, { color: avatarColor }]}>{initials}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Quick Stats ─────────────────────────────────── */}
        <View style={styles.statsRow}>
          {[
            { label: "Active\nEvents", value: activeEventCount, color: "#93C5FD", bg: "rgba(59,130,246,0.10)" },
            { label: "Partners", value: stats?.partnerCount ?? 0, color: "#C4B5FD", bg: "rgba(139,92,246,0.10)" },
            { label: "Total\nEvents", value: myEvents.length, color: "#6EE7B7", bg: "rgba(16,185,129,0.10)" },
          ].map((s) => (
            <View key={s.label} style={[styles.statCard, { backgroundColor: s.bg }]}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── My Events ───────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Events</Text>
          <TouchableOpacity
            style={styles.newEventBtn}
            onPress={() => router.push("/events/create")}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={15} color={Colors.PRIMARY} />
            <Text style={styles.newEventBtnText}>New Event</Text>
          </TouchableOpacity>
        </View>

        {myEvents.length === 0 ? (
          <TouchableOpacity
            style={styles.emptyCard}
            onPress={() => router.push("/events/create")}
            activeOpacity={0.8}
          >
            <View style={styles.emptyIconWrap}>
              <Ionicons name="calendar-outline" size={30} color={Colors.PRIMARY} />
            </View>
            <Text style={styles.emptyTitle}>No events yet</Text>
            <Text style={styles.emptyText}>
              Create your first event and start collaborating with other organizations.
            </Text>
            <View style={styles.emptyBtn}>
              <Ionicons name="add" size={14} color={Colors.PRIMARY} />
              <Text style={styles.emptyBtnText}>Create Event</Text>
            </View>
          </TouchableOpacity>
        ) : (
          myEvents.map((event) => (
            <EventCard
              key={event._id}
              event={event as any}
              onPress={() => router.push(`/events/${event._id}`)}
            />
          ))
        )}

        {/* ── Discover ────────────────────────────────────── */}
        {openEvents.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 12 }]}>
              Discover
            </Text>
            {openEvents.map((event) => (
              <EventCard
                key={event._id}
                event={event as any}
                onPress={() => router.push(`/events/${event._id}`)}
                showOrg
              />
            ))}
          </>
        )}

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* ── FAB ─────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/events/create")}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.BG_DARK },
  container: { paddingHorizontal: 20, paddingTop: 8 },

  // Header
  header: { flexDirection: "row", alignItems: "center", marginBottom: 24, gap: 12 },
  greeting: { fontSize: 13, color: Colors.TEXT_MUTED, marginBottom: 2 },
  orgName: { fontSize: 20, fontWeight: "800", color: Colors.TEXT_PRIMARY, letterSpacing: -0.3 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.BG_CARD, borderWidth: 1, borderColor: Colors.BORDER,
    alignItems: "center", justifyContent: "center",
  },
  avatarBtn: {
    width: 44, height: 44, borderRadius: 14, borderWidth: 2, overflow: "hidden",
  },
  avatarInner: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  avatarImage: { width: "100%", height: "100%" },
  avatarText: { fontSize: 16, fontWeight: "800" },

  // Stats
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 28 },
  statCard: {
    flex: 1, borderRadius: 14, borderWidth: 1, borderColor: Colors.BORDER,
    padding: 14, alignItems: "center", gap: 3,
  },
  statValue: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 10, color: Colors.TEXT_MUTED, fontWeight: "600", textAlign: "center" },

  // Section headers
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: Colors.TEXT_SECONDARY, letterSpacing: 0.3 },
  newEventBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
    backgroundColor: "rgba(59,130,246,0.12)", borderWidth: 1, borderColor: "rgba(59,130,246,0.3)",
  },
  newEventBtnText: { color: Colors.PRIMARY, fontSize: 12, fontWeight: "700" },

  // Empty state
  emptyCard: {
    backgroundColor: Colors.BG_CARD, borderRadius: 18, borderWidth: 1,
    borderColor: Colors.BORDER, padding: 28, alignItems: "center", gap: 10, marginBottom: 10,
  },
  emptyIconWrap: {
    width: 60, height: 60, borderRadius: 18, backgroundColor: "rgba(59,130,246,0.1)",
    borderWidth: 1, borderColor: "rgba(59,130,246,0.2)", alignItems: "center", justifyContent: "center",
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: Colors.TEXT_PRIMARY },
  emptyText: { fontSize: 13, color: Colors.TEXT_MUTED, textAlign: "center", lineHeight: 20 },
  emptyBtn: {
    flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4,
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10,
    backgroundColor: "rgba(59,130,246,0.12)", borderWidth: 1, borderColor: "rgba(59,130,246,0.3)",
  },
  emptyBtnText: { color: Colors.PRIMARY, fontSize: 13, fontWeight: "700" },

  // FAB
  fab: {
    position: "absolute", bottom: 24, right: 24,
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: Colors.PRIMARY,
    alignItems: "center", justifyContent: "center",
    shadowColor: Colors.PRIMARY, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
});
