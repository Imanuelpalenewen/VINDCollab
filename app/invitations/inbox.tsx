/**
 * app/invitations/inbox.tsx
 *
 * Shows all partnership invitations for the current organization.
 * - "Received" tab: invitations sent TO your org (you need to respond)
 * - "Sent" tab: invitations YOUR org sent to others
 *
 * Accepts optional route param: initialTab = "received" | "sent"
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
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/convex/_generated/api";
import { Colors } from "@/constants/Colors";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Doc } from "@/convex/_generated/dataModel";

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = "received" | "sent";

type InvitationType = Doc<"invitations"> & {
  event?: Doc<"events">;
  senderOrg?: Doc<"organizations">;
  recipientOrg?: Doc<"organizations">;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStatusStyle(status: string): { color: string; bg: string; border: string; icon: string } {
  switch (status) {
    case "PENDING":
      return { color: Colors.WARNING, bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)", icon: "time-outline" };
    case "NEGOTIATING":
      return { color: Colors.INFO ?? "#06B6D4", bg: "rgba(6,182,212,0.08)", border: "rgba(6,182,212,0.2)", icon: "swap-horizontal-outline" };
    case "ACCEPTED":
      return { color: Colors.SUCCESS, bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)", icon: "checkmark-circle-outline" };
    case "DECLINED":
      return { color: Colors.ERROR, bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)", icon: "close-circle-outline" };
    case "EXPIRED":
      return { color: Colors.TEXT_MUTED, bg: "rgba(100,116,139,0.08)", border: "rgba(100,116,139,0.2)", icon: "ban-outline" };
    default:
      return { color: Colors.TEXT_MUTED, bg: Colors.BG_CARD, border: Colors.BORDER, icon: "ellipse-outline" };
  }
}

function formatRelativeDate(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isActionRequired(status: string, tab: Tab): boolean {
  if (tab === "received") return status === "PENDING" || status === "NEGOTIATING";
  return false;
}

// ── Invitation Card ───────────────────────────────────────────────────────────

function InvitationCard({
  item,
  tab,
  onPress,
}: {
  item: InvitationType;
  tab: Tab;
  onPress: () => void;
}) {
  const ss = getStatusStyle(item.status);
  const actionNeeded = isActionRequired(item.status, tab);

  const counterpartName =
    tab === "received"
      ? item.senderOrg?.name ?? "Unknown Organization"
      : item.recipientOrg?.name ?? "Unknown Organization";

  const counterpartCategory =
    tab === "received"
      ? item.senderOrg?.category
      : item.recipientOrg?.category;

  const deadlineMs = item.responseDeadline - Date.now();
  const deadlineHours = Math.floor(deadlineMs / 3_600_000);
  const deadlineSoon = deadlineMs > 0 && deadlineHours < 24;
  const deadlineExpired = deadlineMs <= 0 && item.status === "PENDING";

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.82} style={c.cardWrap}>
      {/* Action-required pulse border */}
      {actionNeeded && <View style={c.actionBorder} />}

      <Card style={actionNeeded ? { ...c.card, ...c.cardActive } : c.card}>

        {/* ── Top row ── */}
        <View style={c.topRow}>
          {/* Org avatar */}
          <View style={[c.orgAvatar, { backgroundColor: ss.bg, borderColor: ss.border }]}>
            <Text style={[c.orgAvatarText, { color: ss.color }]}>
              {counterpartName.slice(0, 2).toUpperCase()}
            </Text>
          </View>

          <View style={c.topMid}>
            <Text style={c.counterpartName} numberOfLines={1}>{counterpartName}</Text>
            {counterpartCategory && (
              <Text style={c.counterpartCategory}>{counterpartCategory}</Text>
            )}
          </View>

          {/* Date + action badge */}
          <View style={c.topRight}>
            <Text style={c.dateText}>{formatRelativeDate(item._creationTime)}</Text>
            {actionNeeded && (
              <View style={c.actionBadge}>
                <Text style={c.actionBadgeText}>Needs reply</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Event info ── */}
        {item.event && (
          <View style={c.eventRow}>
            <Ionicons name="calendar-outline" size={12} color={Colors.TEXT_MUTED} />
            <Text style={c.eventTitle} numberOfLines={1}>{item.event.title}</Text>
          </View>
        )}

        {/* ── Role + revenue ── */}
        <View style={c.detailsRow}>
          <View style={c.roleWrap}>
            <Ionicons name="briefcase-outline" size={11} color={Colors.TEXT_MUTED} />
            <Text style={c.roleText}>{item.proposedRole}</Text>
          </View>
          {item.revenueSharing && (
            <View style={c.revWrap}>
              <Ionicons name="pie-chart-outline" size={11} color={Colors.SUCCESS} />
              <Text style={c.revText}>{item.revenueSharing.percentage}% revenue share</Text>
            </View>
          )}
        </View>

        {/* ── Resource contribution ── */}
        {item.resourceContribution && (
          <View style={c.resourceRow}>
            <Ionicons name="cube-outline" size={11} color={Colors.TEXT_MUTED} />
            <Text style={c.resourceText} numberOfLines={2}>{item.resourceContribution}</Text>
          </View>
        )}

        {/* ── Personal message preview ── */}
        {item.personalMessage && (
          <View style={c.messagePreview}>
            <Ionicons name="chatbubble-ellipses-outline" size={11} color={Colors.PRIMARY} />
            <Text style={c.messageText} numberOfLines={1}>{item.personalMessage}</Text>
          </View>
        )}

        {/* ── Footer ── */}
        <View style={c.footer}>
          {/* Status pill */}
          <View style={[c.statusPill, { backgroundColor: ss.bg, borderColor: ss.border }]}>
            <Ionicons name={ss.icon as any} size={11} color={ss.color} />
            <Text style={[c.statusText, { color: ss.color }]}>{item.status}</Text>
          </View>

          {/* Negotiation rounds */}
          {item.negotiationRounds > 1 && (
            <View style={c.roundsWrap}>
              <Ionicons name="repeat-outline" size={11} color={Colors.TEXT_MUTED} />
              <Text style={c.roundsText}>
                Round {item.negotiationRounds}/5
              </Text>
            </View>
          )}

          {/* Deadline warning */}
          {deadlineSoon && (
            <View style={c.deadlineWrap}>
              <Ionicons name="hourglass-outline" size={11} color={Colors.WARNING} />
              <Text style={c.deadlineText}>{deadlineHours}h left</Text>
            </View>
          )}
          {deadlineExpired && (
            <View style={c.deadlineWrap}>
              <Ionicons name="hourglass-outline" size={11} color={Colors.ERROR} />
              <Text style={[c.deadlineText, { color: Colors.ERROR }]}>Deadline passed</Text>
            </View>
          )}

          <Ionicons
            name="chevron-forward"
            size={15}
            color={Colors.TEXT_MUTED}
            style={{ marginLeft: "auto" }}
          />
        </View>
      </Card>
    </TouchableOpacity>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ tab }: { tab: Tab }) {
  return (
    <View style={e.container}>
      <View style={e.iconWrap}>
        <Ionicons
          name={tab === "received" ? "mail-outline" : "send-outline"}
          size={36}
          color={Colors.TEXT_MUTED}
        />
      </View>
      <Text style={e.title}>
        {tab === "received" ? "No Received Invitations" : "No Sent Invitations"}
      </Text>
      <Text style={e.body}>
        {tab === "received"
          ? "When other organizations invite yours to collaborate on their events, those invitations will appear here for you to review and respond to."
          : "When you send partnership invitations from an event's Partner Recommendations screen, they will appear here so you can track their status."}
      </Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function InvitationInboxScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ initialTab?: string }>();

  const [tab, setTab] = useState<Tab>(
    params.initialTab === "sent" ? "sent" : "received"
  );
  const [refreshing, setRefreshing] = useState(false);

  // Fetch data
  const invitations = useQuery(api.invitations.getMyInvitations, {
    paginationOpts: { numItems: 50, cursor: null },
  });
  const myOrg = useQuery(api.organizations.getMyOrg);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  // ── Filter received vs sent using current org ID ──────────────────────────
  const allItems: InvitationType[] = (invitations?.page ?? []) as InvitationType[];

  const receivedItems = useMemo(
    () => allItems.filter((inv) => inv.recipientOrgId === myOrg?._id),
    [allItems, myOrg?._id]
  );

  const sentItems = useMemo(
    () => allItems.filter((inv) => inv.senderOrgId === myOrg?._id),
    [allItems, myOrg?._id]
  );

  // Unread / action-needed count for received tab badge
  const pendingReceivedCount = receivedItems.filter(
    (inv) => inv.status === "PENDING" || inv.status === "NEGOTIATING"
  ).length;

  const displayedItems = tab === "received" ? receivedItems : sentItems;

  // ── Loading state ─────────────────────────────────────────────────────────
  if (!invitations || !myOrg) {
    return (
      <SafeAreaView style={s.container} edges={["top"]}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.BG_DARK} />
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.PRIMARY} />
          <Text style={s.loadingText}>Loading invitations…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container} edges={["top"]}>
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
          <Text style={s.headerTitle}>Invitations</Text>
          <Text style={s.headerSub}>{myOrg.name}</Text>
        </View>

        {/* Total count pill */}
        <View style={s.totalPill}>
          <Text style={s.totalPillText}>{allItems.length}</Text>
        </View>
      </View>

      {/* ── Legend banner ── */}
      <View style={s.legendBanner}>
        <Ionicons name="information-circle-outline" size={14} color={Colors.PRIMARY} />
        <Text style={s.legendText}>
          <Text style={{ color: Colors.TEXT_PRIMARY, fontWeight: "700" }}>Received</Text>
          {" "}= invitations from others to you.{"  "}
          <Text style={{ color: Colors.TEXT_PRIMARY, fontWeight: "700" }}>Sent</Text>
          {" "}= invitations you sent to others.
        </Text>
      </View>

      {/* ── Tab switcher ── */}
      <View style={s.tabRow}>
        {(["received", "sent"] as Tab[]).map((t) => {
          const isActive = tab === t;
          const count = t === "received" ? receivedItems.length : sentItems.length;
          const badge = t === "received" && pendingReceivedCount > 0 ? pendingReceivedCount : null;

          return (
            <TouchableOpacity
              key={t}
              style={[s.tab, isActive && s.tabActive]}
              onPress={() => setTab(t)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={t === "received" ? "mail-outline" : "send-outline"}
                size={15}
                color={isActive ? Colors.PRIMARY : Colors.TEXT_SECONDARY}
              />
              <Text style={[s.tabLabel, isActive && s.tabLabelActive]}>
                {t === "received" ? "Received" : "Sent"}
              </Text>
              {/* Count chip */}
              <View
                style={[
                  s.countChip,
                  isActive
                    ? { backgroundColor: "rgba(59,130,246,0.15)" }
                    : { backgroundColor: Colors.BG_SURFACE ?? Colors.BG_CARD },
                ]}
              >
                <Text style={[s.countChipText, isActive && { color: Colors.PRIMARY }]}>
                  {count}
                </Text>
              </View>
              {/* Pending badge */}
              {badge != null && (
                <View style={s.pendingBadge}>
                  <Text style={s.pendingBadgeText}>{badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Context tip ── */}
      {tab === "received" && pendingReceivedCount > 0 && (
        <View style={s.tipBanner}>
          <Ionicons name="alert-circle" size={14} color={Colors.WARNING} />
          <Text style={s.tipText}>
            You have{" "}
            <Text style={{ color: Colors.WARNING, fontWeight: "700" }}>
              {pendingReceivedCount} invitation{pendingReceivedCount !== 1 ? "s" : ""}
            </Text>{" "}
            waiting for your response.
          </Text>
        </View>
      )}

      {tab === "sent" && sentItems.length > 0 && (
        <View style={[s.tipBanner, s.tipBannerBlue]}>
          <Ionicons name="information-circle-outline" size={14} color={Colors.PRIMARY} />
          <Text style={[s.tipText, { color: Colors.PRIMARY }]}>
            Tap any invitation to view its status or negotiate terms.
          </Text>
        </View>
      )}

      {/* ── List / empty ── */}
      {displayedItems.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <FlatList
          data={displayedItems}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <InvitationCard
              item={item}
              tab={tab}
              onPress={() =>
                router.push({
                  pathname: "/invitations/[id]",
                  params: { id: item._id },
                })
              }
            />
          )}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.PRIMARY}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.BG_DARK },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 13, color: Colors.TEXT_MUTED },

  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 12, gap: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: Colors.BG_CARD, borderWidth: 1, borderColor: Colors.BORDER,
    alignItems: "center", justifyContent: "center",
  },
  headerCenter: { flex: 1 },
  headerTitle: {
    fontSize: 20, fontWeight: "800", color: Colors.TEXT_PRIMARY, letterSpacing: -0.4,
  },
  headerSub: { fontSize: 11, color: Colors.TEXT_MUTED, marginTop: 1 },
  totalPill: {
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: Colors.BG_CARD, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.BORDER,
  },
  totalPillText: { fontSize: 12, fontWeight: "700", color: Colors.TEXT_SECONDARY },

  legendBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: "rgba(59,130,246,0.06)",
    borderWidth: 1, borderColor: "rgba(59,130,246,0.15)",
    borderRadius: 10, padding: 10,
  },
  legendText: { fontSize: 11, color: Colors.TEXT_MUTED, lineHeight: 17, flex: 1 },

  tabRow: { flexDirection: "row", gap: 10, paddingHorizontal: 20, marginBottom: 10 },
  tab: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 11, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.BORDER,
    backgroundColor: Colors.BG_CARD,
  },
  tabActive: {
    borderColor: Colors.PRIMARY,
    backgroundColor: "rgba(59,130,246,0.08)",
  },
  tabLabel: { fontSize: 13, fontWeight: "600", color: Colors.TEXT_SECONDARY },
  tabLabelActive: { color: Colors.PRIMARY },
  countChip: {
    minWidth: 22, height: 18, borderRadius: 9,
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 6,
  },
  countChipText: { fontSize: 10, fontWeight: "800", color: Colors.TEXT_MUTED },
  pendingBadge: {
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: Colors.ERROR,
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 5,
  },
  pendingBadgeText: { fontSize: 10, fontWeight: "800", color: "#fff" },

  tipBanner: {
    flexDirection: "row", gap: 8, alignItems: "center",
    marginHorizontal: 20, marginBottom: 10,
    backgroundColor: "rgba(245,158,11,0.07)",
    borderWidth: 1, borderColor: "rgba(245,158,11,0.2)",
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
  },
  tipBannerBlue: {
    backgroundColor: "rgba(59,130,246,0.07)",
    borderColor: "rgba(59,130,246,0.2)",
  },
  tipText: { fontSize: 12, color: Colors.WARNING, flex: 1, lineHeight: 17 },

  listContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 4 },
});

// ── Card styles ───────────────────────────────────────────────────────────────

const c = StyleSheet.create({
  cardWrap: { marginBottom: 12, position: "relative" },
  actionBorder: {
    position: "absolute", inset: -1, borderRadius: 17,
    borderWidth: 1.5, borderColor: Colors.WARNING,
    zIndex: 0,
  },
  card: { padding: 14, borderRadius: 16, gap: 10, zIndex: 1 },
  cardActive: { backgroundColor: "rgba(245,158,11,0.03)" },

  topRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  orgAvatar: {
    width: 42, height: 42, borderRadius: 13,
    borderWidth: 1, alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  orgAvatarText: { fontSize: 14, fontWeight: "800" },
  topMid: { flex: 1 },
  counterpartName: { fontSize: 14, fontWeight: "700", color: Colors.TEXT_PRIMARY },
  counterpartCategory: { fontSize: 11, color: Colors.TEXT_MUTED, marginTop: 2 },
  topRight: { alignItems: "flex-end", gap: 4 },
  dateText: { fontSize: 10, color: Colors.TEXT_MUTED },
  actionBadge: {
    backgroundColor: "rgba(245,158,11,0.15)",
    borderWidth: 1, borderColor: "rgba(245,158,11,0.3)",
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  actionBadgeText: { fontSize: 9, fontWeight: "700", color: Colors.WARNING },

  eventRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Colors.BG_DARK ?? "#0f172a",
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6,
  },
  eventTitle: { fontSize: 12, color: Colors.TEXT_SECONDARY, flex: 1, fontWeight: "500" },

  detailsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  roleWrap: { flexDirection: "row", alignItems: "center", gap: 5 },
  roleText: { fontSize: 12, color: Colors.TEXT_SECONDARY, fontWeight: "600" },
  revWrap: { flexDirection: "row", alignItems: "center", gap: 5 },
  revText: { fontSize: 12, color: Colors.SUCCESS, fontWeight: "600" },

  resourceRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 6,
    paddingTop: 2,
  },
  resourceText: { fontSize: 12, color: Colors.TEXT_MUTED, flex: 1, lineHeight: 17 },

  messagePreview: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(59,130,246,0.06)",
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6,
  },
  messageText: { fontSize: 11, color: Colors.TEXT_SECONDARY, flex: 1, fontStyle: "italic" },

  footer: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)",
    paddingTop: 10, marginTop: 2,
  },
  statusPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
  },
  statusText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4 },
  roundsWrap: { flexDirection: "row", alignItems: "center", gap: 4 },
  roundsText: { fontSize: 10, color: Colors.TEXT_MUTED, fontWeight: "600" },
  deadlineWrap: { flexDirection: "row", alignItems: "center", gap: 4 },
  deadlineText: { fontSize: 10, color: Colors.WARNING, fontWeight: "600" },
});

// ── Empty state styles ────────────────────────────────────────────────────────

const e = StyleSheet.create({
  container: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 40, paddingBottom: 80,
  },
  iconWrap: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: Colors.BG_CARD, borderWidth: 1, borderColor: Colors.BORDER,
    alignItems: "center", justifyContent: "center", marginBottom: 20,
  },
  title: {
    fontSize: 18, fontWeight: "700", color: Colors.TEXT_PRIMARY,
    marginBottom: 10, textAlign: "center",
  },
  body: {
    fontSize: 13, color: Colors.TEXT_MUTED, textAlign: "center",
    lineHeight: 21,
  },
});