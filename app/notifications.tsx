import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/convex/_generated/api";
import { Colors } from "@/constants/Colors";

// Notification types derived from invitations + partnership events
type NotifItem = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  title: string;
  body: string;
  timestamp: number;
  onPress?: () => void;
};

export default function NotificationsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const invitations = useQuery(api.invitations.getMyInvitations, {
    paginationOpts: { numItems: 50, cursor: null },
  });

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  };

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Build notification list from invitations data
  const notifications: NotifItem[] = (invitations?.page ?? []).map((inv) => {
    const statusConfig: Record<string, {
      icon: keyof typeof Ionicons.glyphMap;
      iconColor: string;
      iconBg: string;
      title: string;
      body: string;
    }> = {
      PENDING: {
        icon: "mail-outline",
        iconColor: "#93C5FD",
        iconBg: "rgba(59,130,246,0.18)",
        title: "New Partnership Invitation",
        body: `Invitation received for an event — tap to review the proposal.`,
      },
      NEGOTIATING: {
        icon: "swap-horizontal-outline",
        iconColor: "#67E8F9",
        iconBg: "rgba(6,182,212,0.18)",
        title: "Counter-Proposal Received",
        body: `Negotiation is in progress (Round ${inv.negotiationRounds}/5). Review the new terms.`,
      },
      ACCEPTED: {
        icon: "checkmark-circle-outline",
        iconColor: "#6EE7B7",
        iconBg: "rgba(16,185,129,0.18)",
        title: "Partnership Accepted 🎉",
        body: `An invitation was accepted. A shared chat room has been created.`,
      },
      DECLINED: {
        icon: "close-circle-outline",
        iconColor: "#FCA5A5",
        iconBg: "rgba(239,68,68,0.18)",
        title: "Partnership Declined",
        body: inv.declineReason
          ? `Reason: ${inv.declineReason}`
          : "An invitation was declined.",
      },
      EXPIRED: {
        icon: "time-outline",
        iconColor: "#FCD34D",
        iconBg: "rgba(245,158,11,0.18)",
        title: "Negotiation Expired",
        body: "Maximum negotiation rounds reached. The invitation has expired.",
      },
    };

    const cfg = statusConfig[inv.status] ?? {
      icon: "notifications-outline" as keyof typeof Ionicons.glyphMap,
      iconColor: Colors.TEXT_MUTED,
      iconBg: Colors.BG_CARD,
      title: "Invitation Update",
      body: "An invitation status has changed.",
    };

    return {
      id: inv._id,
      ...cfg,
      timestamp: inv._creationTime,
      onPress: () =>
        router.push({ pathname: "/invitations/[id]", params: { id: inv._id } }),
    };
  });

  const renderItem = ({ item }: { item: NotifItem }) => (
    <TouchableOpacity
      style={s.card}
      onPress={item.onPress}
      activeOpacity={0.78}
    >
      <View style={[s.iconWrap, { backgroundColor: item.iconBg }]}>
        <Ionicons name={item.icon} size={20} color={item.iconColor} />
      </View>
      <View style={s.cardBody}>
        <Text style={s.cardTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={s.cardBody2} numberOfLines={2}>
          {item.body}
        </Text>
        <Text style={s.cardTime}>{formatTime(item.timestamp)}</Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={14}
        color={Colors.TEXT_MUTED}
        style={{ opacity: 0.45, alignSelf: "center" }}
      />
    </TouchableOpacity>
  );

  const isEmpty = notifications.length === 0;

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.BG_DARK} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.TEXT_SECONDARY} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Notifications</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Subtitle */}
      <Text style={s.subtitle}>
        Activity from your partnership invitations
      </Text>

      {/* Content */}
      {invitations === undefined ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={Colors.PRIMARY} />
        </View>
      ) : isEmpty ? (
        <View style={s.center}>
          <View style={s.emptyIconWrap}>
            <Ionicons name="notifications-off-outline" size={36} color={Colors.TEXT_MUTED} />
          </View>
          <Text style={s.emptyTitle}>No Notifications</Text>
          <Text style={s.emptyText}>
            You'll see updates here when organizations send, accept, or counter-propose invitations.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
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

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.BG_DARK },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.BG_CARD,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.TEXT_PRIMARY,
    letterSpacing: -0.3,
    flex: 1,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 12,
    color: Colors.TEXT_MUTED,
    textAlign: "center",
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.BG_CARD,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.TEXT_PRIMARY,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.TEXT_MUTED,
    textAlign: "center",
    lineHeight: 20,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    backgroundColor: Colors.BG_CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    padding: 14,
    marginBottom: 10,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardBody: { flex: 1, gap: 3 },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.TEXT_PRIMARY,
  },
  cardBody2: {
    fontSize: 12,
    color: Colors.TEXT_SECONDARY,
    lineHeight: 17,
  },
  cardTime: {
    fontSize: 10,
    color: Colors.TEXT_MUTED,
    marginTop: 2,
  },
});
