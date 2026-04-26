/**
 * app/partners.tsx
 *
 * Partner Management screen.
 * Shows all organizations the current org is partnered with (or has invited),
 * grouped by event, with task completion stats and a performance score.
 *
 * Wire in more.tsx:
 *   onPress={() => router.push("/partners")}
 */

import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/convex/_generated/api";
import { Colors } from "@/constants/Colors";

// ── Types ─────────────────────────────────────────────────────────────────────

type PartnerStatus = "PENDING" | "ACCEPTED" | "DECLINED";

type PartnershipItem = {
  _id: string;
  status: PartnerStatus;
  role: string;
  isHost: boolean;
  event?: { _id: string; title: string; status: string; startDate: number } | null;
  partnerOrg?: { _id: string; name: string; category?: string; capabilities?: string[] } | null;
  hostOrg?: { _id: string; name: string } | null;
  taskStats: { total: number; done: number; avgHours: number; score: number };
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const PALETTE = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#06B6D4"];

function orgColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h += name.charCodeAt(i);
  return PALETTE[h % PALETTE.length];
}

function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  return p.length >= 2
    ? (p[0][0] + p[p.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

function scoreColor(score: number): string {
  if (score >= 75) return Colors.SUCCESS;
  if (score >= 50) return Colors.WARNING;
  return Colors.ERROR;
}

function statusConfig(status: PartnerStatus) {
  switch (status) {
    case "ACCEPTED":
      return { label: "Active", color: Colors.SUCCESS, bg: "rgba(16,185,129,0.10)", border: "rgba(16,185,129,0.25)" };
    case "PENDING":
      return { label: "Invited", color: Colors.WARNING, bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.25)" };
    case "DECLINED":
      return { label: "Declined", color: Colors.ERROR, bg: "rgba(239,68,68,0.10)", border: "rgba(239,68,68,0.25)" };
  }
}

// ── Partner Card ──────────────────────────────────────────────────────────────

function PartnerCard({
  item,
  onPress,
}: {
  item: PartnershipItem;
  onPress: () => void;
}) {
  const org = item.isHost ? item.partnerOrg : item.hostOrg;
  const orgName = org?.name ?? "Unknown Org";
  const sc = statusConfig(item.status);
  const color = orgColor(orgName);
  const isActive = item.status === "ACCEPTED";

  return (
    <TouchableOpacity style={card.wrap} onPress={onPress} activeOpacity={0.82}>
      {/* ── Main row ── */}
      <View style={card.row}>
        {/* Avatar */}
        <View style={[card.avatar, { backgroundColor: color + "22", borderColor: color + "55" }]}>
          <Text style={[card.avatarText, { color }]}>{initials(orgName)}</Text>
        </View>

        {/* Name + status */}
        <View style={card.info}>
          <Text style={card.orgName} numberOfLines={1}>{orgName}</Text>
          <View style={[card.statusPill, { backgroundColor: sc.bg, borderColor: sc.border }]}>
            <View style={[card.statusDot, { backgroundColor: sc.color }]} />
            <Text style={[card.statusLabel, { color: sc.color }]}>{sc.label}</Text>
          </View>
        </View>

        {/* Score */}
        {isActive && (
          <View style={card.scoreBox}>
            <Text style={[card.scoreVal, { color: scoreColor(item.taskStats.score) }]}>
              {item.taskStats.score}
            </Text>
            <Text style={card.scoreLabel}>Score</Text>
          </View>
        )}

        <Ionicons name="chevron-forward" size={16} color={Colors.TEXT_MUTED} style={{ opacity: 0.5 }} />
      </View>

      {/* ── Stats row (only when active and tasks exist) ── */}
      {isActive && item.taskStats.total > 0 && (
        <View style={card.stats}>
          <View style={card.statItem}>
            <Ionicons name="checkmark-circle-outline" size={13} color={Colors.TEXT_MUTED} />
            <Text style={card.statText}>
              Tasks:{" "}
              <Text style={{ color: Colors.PRIMARY, fontWeight: "700" }}>
                {item.taskStats.done}/{item.taskStats.total}
              </Text>
            </Text>
          </View>

          {item.taskStats.avgHours > 0 && (
            <View style={card.statItem}>
              <Ionicons name="time-outline" size={13} color={Colors.TEXT_MUTED} />
              <Text style={card.statText}>
                avg{" "}
                <Text style={{ color: Colors.TEXT_SECONDARY, fontWeight: "600" }}>
                  {item.taskStats.avgHours}h
                </Text>
              </Text>
            </View>
          )}

          {/* Progress bar */}
          <View style={card.progressOuter}>
            <View
              style={[
                card.progressInner,
                {
                  width: `${item.taskStats.total > 0
                    ? (item.taskStats.done / item.taskStats.total) * 100
                    : 0}%`,
                  backgroundColor: scoreColor(item.taskStats.score),
                },
              ]}
            />
          </View>
        </View>
      )}

      {/* ── Role pill ── */}
      <View style={card.roleRow}>
        <Ionicons name="briefcase-outline" size={11} color={Colors.TEXT_MUTED} />
        <Text style={card.roleText}>{item.role}</Text>
        {item.event && (
          <>
            <View style={card.dot} />
            <Ionicons name="calendar-outline" size={11} color={Colors.TEXT_MUTED} />
            <Text style={card.roleText} numberOfLines={1}>{item.event.title}</Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState() {
  const router = useRouter();
  return (
    <View style={e.wrap}>
      <View style={e.iconWrap}>
        <Ionicons name="people-outline" size={36} color={Colors.TEXT_MUTED} />
      </View>
      <Text style={e.title}>No Partners Yet</Text>
      <Text style={e.body}>
        Create or publish an event, then use{" "}
        <Text style={{ color: Colors.PRIMARY, fontWeight: "600" }}>AI Partner Recommender</Text>
        {" "}to find and invite organizations to collaborate.
      </Text>
      <TouchableOpacity
        style={e.btn}
        onPress={() => router.push("/(tabs)")}
        activeOpacity={0.85}
      >
        <Ionicons name="home-outline" size={16} color="#fff" />
        <Text style={e.btnText}>Go to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function PartnerManagementScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<"ALL" | "ACCEPTED" | "PENDING">("ALL");
  const [refreshing, setRefreshing] = useState(false);

  const partnerships = useQuery(api.partnerships.getMyPartnerships);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 700);
  };

  // ── Counts ──────────────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    if (!partnerships) return { ALL: 0, ACCEPTED: 0, PENDING: 0 };
    return {
      ALL: partnerships.length,
      ACCEPTED: partnerships.filter((p) => p.status === "ACCEPTED").length,
      PENDING: partnerships.filter((p) => p.status === "PENDING").length,
    };
  }, [partnerships]);

  const displayed = useMemo(() => {
    if (!partnerships) return [];
    if (filter === "ALL") return partnerships;
    return partnerships.filter((p) => p.status === filter);
  }, [partnerships, filter]);

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (!partnerships) {
    return (
      <SafeAreaView style={s.flex} edges={["top"]}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.BG_DARK} />
        <View style={s.loadWrap}>
          <ActivityIndicator size="large" color={Colors.PRIMARY} />
          <Text style={s.loadText}>Loading partners…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.flex} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.BG_DARK} />

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.TEXT_SECONDARY} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Partner Management</Text>
          <Text style={s.headerSub}>
            {counts.ALL} organization{counts.ALL !== 1 ? "s" : ""} total
          </Text>
        </View>
      </View>

      {/* ── Summary strip ── */}
      <View style={s.summaryStrip}>
        {[
          { label: "Active", count: counts.ACCEPTED, color: Colors.SUCCESS, bg: "rgba(16,185,129,0.1)" },
          { label: "Invited", count: counts.PENDING, color: Colors.WARNING, bg: "rgba(245,158,11,0.1)" },
          { label: "Total", count: counts.ALL, color: Colors.PRIMARY, bg: "rgba(59,130,246,0.1)" },
        ].map((s2) => (
          <View key={s2.label} style={[s.summaryItem, { backgroundColor: s2.bg }]}>
            <Text style={[s.summaryCount, { color: s2.color }]}>{s2.count}</Text>
            <Text style={s.summaryLabel}>{s2.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Filter tabs ── */}
      <View style={s.filterRow}>
        {(["ALL", "ACCEPTED", "PENDING"] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[s.filterTab, filter === f && s.filterTabActive]}
            onPress={() => setFilter(f)}
            activeOpacity={0.8}
          >
            <Text style={[s.filterText, filter === f && s.filterTextActive]}>
              {f === "ALL" ? "All" : f === "ACCEPTED" ? "Active" : "Invited"}
            </Text>
            <View style={[s.filterCount, filter === f && s.filterCountActive]}>
              <Text style={[s.filterCountText, filter === f && { color: Colors.PRIMARY }]}>
                {counts[f]}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── What this screen shows ── */}
      <View style={s.infoBanner}>
        <Ionicons name="information-circle-outline" size={14} color={Colors.PRIMARY} />
        <Text style={s.infoBannerText}>
          Shows all organizations your org is partnered with or has invited, across all events.
        </Text>
      </View>

      {/* ── List ── */}
      {displayed.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={displayed as PartnershipItem[]}
          keyExtractor={(item) => item._id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.PRIMARY}
            />
          }
          renderItem={({ item }) => (
            <PartnerCard
                item={item as PartnershipItem}
                onPress={() => {
                if (item.event?._id) {
                    router.push({
                    pathname: "/events/[id]",
                    params: { id: item.event._id },
                    });
                } else {
                    router.push("/invitations/inbox");
                }
                }}
            />
            )}
        />
      )}
    </SafeAreaView>
  );
}

// ── Main Styles ───────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.BG_DARK },
  loadWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadText: { fontSize: 13, color: Colors.TEXT_MUTED },

  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12, gap: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: Colors.BG_CARD, borderWidth: 1, borderColor: Colors.BORDER,
    alignItems: "center", justifyContent: "center",
  },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: Colors.TEXT_PRIMARY, letterSpacing: -0.4 },
  headerSub: { fontSize: 11, color: Colors.TEXT_MUTED, marginTop: 2 },

  summaryStrip: {
    flexDirection: "row", gap: 8,
    paddingHorizontal: 20, marginBottom: 14,
  },
  summaryItem: {
    flex: 1, borderRadius: 12, borderWidth: 1, borderColor: Colors.BORDER,
    paddingVertical: 10, alignItems: "center", gap: 2,
  },
  summaryCount: { fontSize: 22, fontWeight: "800" },
  summaryLabel: { fontSize: 10, color: Colors.TEXT_MUTED, fontWeight: "600" },

  filterRow: {
    flexDirection: "row", gap: 8,
    paddingHorizontal: 20, marginBottom: 10,
  },
  filterTab: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 9, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.BORDER,
    backgroundColor: Colors.BG_CARD,
  },
  filterTabActive: {
    borderColor: Colors.PRIMARY,
    backgroundColor: "rgba(59,130,246,0.08)",
  },
  filterText: { fontSize: 12, fontWeight: "600", color: Colors.TEXT_SECONDARY },
  filterTextActive: { color: Colors.PRIMARY },
  filterCount: {
    minWidth: 20, height: 18, borderRadius: 9,
    backgroundColor: Colors.BG_DARK ?? "#0f172a",
    alignItems: "center", justifyContent: "center", paddingHorizontal: 5,
  },
  filterCountActive: { backgroundColor: "rgba(59,130,246,0.15)" },
  filterCountText: { fontSize: 10, fontWeight: "800", color: Colors.TEXT_MUTED },

  infoBanner: {
    flexDirection: "row", gap: 8, alignItems: "center",
    marginHorizontal: 20, marginBottom: 14,
    backgroundColor: "rgba(59,130,246,0.06)",
    borderWidth: 1, borderColor: "rgba(59,130,246,0.15)",
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8,
  },
  infoBannerText: { fontSize: 11, color: Colors.TEXT_MUTED, flex: 1, lineHeight: 16 },

  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 10 },
});

// ── Card Styles ───────────────────────────────────────────────────────────────

const card = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.BG_CARD,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.BORDER,
    padding: 14, gap: 10,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 44, height: 44, borderRadius: 14,
    borderWidth: 1.5, alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { fontSize: 15, fontWeight: "800" },
  info: { flex: 1, gap: 5 },
  orgName: { fontSize: 15, fontWeight: "700", color: Colors.TEXT_PRIMARY },
  statusPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 20, borderWidth: 1,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: 11, fontWeight: "700" },
  scoreBox: { alignItems: "center", gap: 1, marginRight: 6 },
  scoreVal: { fontSize: 20, fontWeight: "800" },
  scoreLabel: { fontSize: 9, color: Colors.TEXT_MUTED, fontWeight: "600" },

  stats: { gap: 6 },
  statItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  statText: { fontSize: 12, color: Colors.TEXT_MUTED },
  progressOuter: {
    height: 4, borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.06)", overflow: "hidden",
  },
  progressInner: { height: 4, borderRadius: 2 },

  roleRow: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)",
    paddingTop: 8,
  },
  roleText: { fontSize: 11, color: Colors.TEXT_MUTED, flex: 1 },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: Colors.TEXT_MUTED, flexShrink: 0 },
});

// ── Empty State Styles ────────────────────────────────────────────────────────

const e = StyleSheet.create({
  wrap: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 40, paddingBottom: 80,
  },
  iconWrap: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: Colors.BG_CARD, borderWidth: 1, borderColor: Colors.BORDER,
    alignItems: "center", justifyContent: "center", marginBottom: 20,
  },
  title: { fontSize: 18, fontWeight: "700", color: Colors.TEXT_PRIMARY, marginBottom: 10 },
  body: { fontSize: 13, color: Colors.TEXT_MUTED, textAlign: "center", lineHeight: 21, marginBottom: 20 },
  btn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12,
    backgroundColor: Colors.PRIMARY,
  },
  btnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});