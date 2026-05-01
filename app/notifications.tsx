import React, { useMemo, useRef, useState } from "react";
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
import type { AppNotification, NotificationType } from "@/convex/notifications";

// Notification icon config 

function notifConfig(
  type: NotificationType,
  riskLevel?: string
): {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
} {
  switch (type) {
    case "AI_ALERT": {
      const color =
        riskLevel === "RED"
          ? Colors.ERROR
          : riskLevel === "YELLOW"
          ? Colors.WARNING
          : Colors.SUCCESS;
      return { icon: "warning-outline", iconColor: color, iconBg: `${color}1A` };
    }
    case "CHAT_MESSAGE":
      return {
        icon: "chatbubble-ellipses-outline",
        iconColor: Colors.PRIMARY,
        iconBg: "rgba(59,130,246,0.12)",
      };
    case "PARTNER_ACCEPTED":
      return {
        icon: "people-outline",
        iconColor: Colors.SUCCESS,
        iconBg: "rgba(16,185,129,0.12)",
      };
    case "PARTNER_DECLINED":
      return {
        icon: "person-remove-outline",
        iconColor: Colors.ERROR,
        iconBg: "rgba(239,68,68,0.12)",
      };
    case "PROGRESS_REPORT":
      return {
        icon: "bar-chart-outline",
        iconColor: "#C4B5FD",
        iconBg: "rgba(139,92,246,0.12)",
      };
    case "TASK_UPDATE":
      return {
        icon: "checkmark-circle-outline",
        iconColor: Colors.SUCCESS,
        iconBg: "rgba(16,185,129,0.12)",
      };
    default:
      return {
        icon: "notifications-outline",
        iconColor: Colors.TEXT_MUTED,
        iconBg: Colors.BG_CARD,
      };
  }
}

// Navigation resolver 

function resolveNavigation(
  item: AppNotification,
  router: ReturnType<typeof useRouter>
) {
  switch (item.type) {
    // AI risk alert → Analytics tab 
    case "AI_ALERT":
    if (item.eventId) {
        router.push({
        pathname: "/(tabs)/stats",
        params: { selectedEventId: item.eventId },
        });
    } else {
        router.push("/(tabs)/stats");
    }
    break;

    case "PROGRESS_REPORT":
    if (item.eventId) {
        router.push({
        pathname: "/(tabs)/report",
        params: { selectedEventId: item.eventId },
        });
    } else {
        router.push("/(tabs)/report");
    }
    break;

    // Chat message → exact chat room 
    case "CHAT_MESSAGE":
      if (item.eventId && item.roomId) {
        router.push({
          pathname: "/events/[id]/chat/[roomId]",
          params: { id: item.eventId, roomId: item.roomId },
        });
      } else if (item.eventId) {
        router.push({
          pathname: "/events/[id]",
          params: { id: item.eventId },
        });
      } else {
        router.push("/(tabs)/chat");
      }
      break;

    // Partner accepted / declined → Invitations inbox
    case "PARTNER_ACCEPTED":
    case "PARTNER_DECLINED":
      router.push("/invitations/inbox");
      break;

    // Task update → Kanban board, pre-select the event 
    case "TASK_UPDATE":
      if (item.eventId) {
        router.push({
          pathname: "/(tabs)/tasks",
          params: { selectedEventId: item.eventId },
        });
      } else {
        router.push("/(tabs)/tasks");
      }
      break;

    // Fallback: event detail if eventId is available
    default:
      if (item.eventId) {
        router.push({
          pathname: "/events/[id]",
          params: { id: item.eventId },
        });
      }
      break;
  }
}

// Destination hint (shown in item footer) 

function destinationHint(item: AppNotification): string {
  switch (item.type) {
    case "AI_ALERT":        return "→ Analytics";
    case "PROGRESS_REPORT": return "→ Event Report";
    case "CHAT_MESSAGE":    return item.roomId ? "→ Open Chat Room" : "→ Event Detail";
    case "PARTNER_ACCEPTED":
    case "PARTNER_DECLINED":return "→ Invitations Inbox";
    case "TASK_UPDATE":     return "→ Kanban Board";
    default:                return item.eventId ? "→ Event Detail" : "";
  }
}

// Helpers 

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d === 1) return "Yesterday";
  return `${d}d ago`;
}

function groupByDate(
  items: AppNotification[]
): { title: string; data: AppNotification[] }[] {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const groups: Record<string, AppNotification[]> = {};
  for (const item of items) {
    const d = new Date(item.timestamp);
    let key: string;
    if (d.toDateString() === today.toDateString()) key = "Today";
    else if (d.toDateString() === yesterday.toDateString()) key = "Yesterday";
    else {
      key = d.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
    }
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return Object.entries(groups).map(([title, data]) => ({ title, data }));
}

// Notification Item 

function NotifItem({
  item,
  onPress,
}: {
  item: AppNotification;
  onPress: () => void;
}) {
  const cfg = notifConfig(item.type, item.riskLevel);
  const hint = destinationHint(item);

  return (
    <TouchableOpacity style={n.wrap} onPress={onPress} activeOpacity={0.8}>
      {!item.read && <View style={n.unreadBar} />}

      <View style={[n.iconWrap, { backgroundColor: cfg.iconBg }]}>
        <Ionicons name={cfg.icon} size={20} color={cfg.iconColor} />
      </View>

      <View style={n.content}>
        <Text style={n.title} numberOfLines={2}>{item.title}</Text>
        <Text style={n.body} numberOfLines={2}>{item.body}</Text>

        <View style={n.footerRow}>
          <Text style={n.time}>{formatRelative(item.timestamp)}</Text>
          {hint ? <Text style={n.hint}>{hint}</Text> : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Filter tabs 

type FilterKey =
  | "ALL"
  | "AI_ALERT"
  | "CHAT_MESSAGE"
  | "PARTNER_ACCEPTED"
  | "PROGRESS_REPORT";

const FILTERS: {
  key: FilterKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: "ALL",              label: "All",       icon: "apps-outline"       },
  { key: "AI_ALERT",         label: "AI Alerts", icon: "warning-outline"    },
  { key: "CHAT_MESSAGE",     label: "Messages",  icon: "chatbubble-outline" },
  { key: "PARTNER_ACCEPTED", label: "Partners",  icon: "people-outline"     },
  { key: "PROGRESS_REPORT",  label: "Reports",   icon: "bar-chart-outline"  },
];

// Main Screen 

export default function NotificationsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>("ALL");
  const [refreshing, setRefreshing] = useState(false);

  const listRef = useRef<FlatList>(null);
  const notifications = useQuery(api.notifications.getNotifications);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 700);
  };

  const handleFilterPress = (key: FilterKey) => {
    setFilter(key);
    setTimeout(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    }, 50);
  };

  const filtered = useMemo(() => {
    if (!notifications) return [];
    if (filter === "ALL") return notifications;
    return notifications.filter((n) => {
      if (filter === "PARTNER_ACCEPTED")
        return n.type === "PARTNER_ACCEPTED" || n.type === "PARTNER_DECLINED";
      return n.type === filter;
    });
  }, [notifications, filter]);

  const groups = useMemo(() => groupByDate(filtered), [filtered]);

  const totalUnread = useMemo(
    () => (notifications ?? []).filter((n) => !n.read).length,
    [notifications]
  );

  const filterCounts = useMemo(() => {
    const all = notifications ?? [];
    return {
      ALL: all.length,
      AI_ALERT: all.filter((n) => n.type === "AI_ALERT").length,
      CHAT_MESSAGE: all.filter((n) => n.type === "CHAT_MESSAGE").length,
      PARTNER_ACCEPTED: all.filter(
        (n) => n.type === "PARTNER_ACCEPTED" || n.type === "PARTNER_DECLINED"
      ).length,
      PROGRESS_REPORT: all.filter((n) => n.type === "PROGRESS_REPORT").length,
    };
  }, [notifications]);

  // Loading 
  if (!notifications) {
    return (
      <SafeAreaView style={s.flex} edges={["top"]}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.BG_DARK} />
        <View style={s.loadWrap}>
          <ActivityIndicator size="large" color={Colors.PRIMARY} />
          <Text style={s.loadText}>Loading notifications…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render 
  return (
    <SafeAreaView style={s.flex} edges={["top"]}>
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

        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Notifications</Text>
          {totalUnread > 0 && (
            <Text style={s.headerSub}>
              {totalUnread} new notification{totalUnread !== 1 ? "s" : ""}
            </Text>
          )}
        </View>

        {totalUnread > 0 && (
          <View style={s.unreadBadge}>
            <Text style={s.unreadBadgeText}>{totalUnread}</Text>
          </View>
        )}
      </View>

      {/* Info banner  */}
      <View style={s.infoBanner}>
        <Ionicons name="information-circle-outline" size={14} color={Colors.PRIMARY} />
        <Text style={s.infoBannerText}>
          Activity from your events. Tap any notification to go directly to
          the relevant screen.
        </Text>
      </View>

      {/* Filter chips — View wrapper prevents vertical expansion  */}
      <View style={s.filterWrapper}>
        <FlatList
          data={FILTERS}
          keyExtractor={(f) => f.key}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterList}
          renderItem={({ item: f }) => {
            const isActive = filter === f.key;
            const count = filterCounts[f.key];
            return (
              <TouchableOpacity
                style={[s.filterChip, isActive && s.filterChipActive]}
                onPress={() => handleFilterPress(f.key)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={f.icon}
                  size={13}
                  color={isActive ? Colors.PRIMARY : Colors.TEXT_MUTED}
                />
                <Text style={[s.filterChipText, isActive && s.filterChipTextActive]}>
                  {f.label}
                </Text>
                {count > 0 && (
                  <View style={[s.filterBadge, isActive && s.filterBadgeActive]}>
                    <Text
                      style={[
                        s.filterBadgeText,
                        isActive && { color: Colors.PRIMARY },
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Content */}
      {filtered.length === 0 ? (
        <View style={s.emptyWrap}>
          <View style={s.emptyIcon}>
            <Ionicons
              name="notifications-off-outline"
              size={34}
              color={Colors.TEXT_MUTED}
            />
          </View>
          <Text style={s.emptyTitle}>
            {filter === "ALL"
              ? "No Notifications Yet"
              : `No ${FILTERS.find((f) => f.key === filter)?.label}`}
          </Text>
          <Text style={s.emptyBody}>
            {filter === "ALL"
              ? "When AI detects risks, partners send messages, or invitations change status, they will appear here."
              : "Try switching to a different filter to see other activity."}
          </Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={groups}
          keyExtractor={(g) => g.title}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.PRIMARY}
            />
          }
          renderItem={({ item: group }) => (
            <View>
              <View style={s.dateHeader}>
                <View style={s.dateLine} />
                <Text style={s.dateLabel}>{group.title}</Text>
                <View style={s.dateLine} />
              </View>

              {group.data.map((notif:AppNotification) => (
                <NotifItem
                  key={notif.id}
                  item={notif}
                  onPress={() => resolveNavigation(notif, router)}
                />
              ))}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

// Styles 

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.BG_DARK },
  loadWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadText: { fontSize: 13, color: Colors.TEXT_MUTED },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 12,
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
  headerSub: { fontSize: 11, color: Colors.TEXT_MUTED, marginTop: 2 },
  unreadBadge: {
    minWidth: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.ERROR,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 7,
  },
  unreadBadgeText: { fontSize: 12, fontWeight: "800", color: "#fff" },

  infoBanner: {
    flexDirection: "row", gap: 8, alignItems: "flex-start",
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: "rgba(59,130,246,0.06)",
    borderWidth: 1, borderColor: "rgba(59,130,246,0.15)",
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8,
  },
  infoBannerText: { fontSize: 11, color: Colors.TEXT_MUTED, flex: 1, lineHeight: 17 },

  filterWrapper: { height: 52, marginBottom: 4 },
  filterList: { paddingHorizontal: 20, gap: 8, alignItems: "center" },
  filterChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, height: 36, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.BORDER, backgroundColor: Colors.BG_CARD,
  },
  filterChipActive: {
    borderColor: Colors.PRIMARY, backgroundColor: "rgba(59,130,246,0.08)",
  },
  filterChipText: { fontSize: 12, fontWeight: "600", color: Colors.TEXT_MUTED },
  filterChipTextActive: { color: Colors.PRIMARY },
  filterBadge: {
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: Colors.BG_DARK ?? "#0f172a",
    alignItems: "center", justifyContent: "center", paddingHorizontal: 5,
  },
  filterBadgeActive: { backgroundColor: "rgba(59,130,246,0.15)" },
  filterBadgeText: { fontSize: 10, fontWeight: "800", color: Colors.TEXT_MUTED },

  list: { paddingBottom: 40 },

  dateHeader: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 20, paddingVertical: 12,
  },
  dateLine: { flex: 1, height: 1, backgroundColor: Colors.BORDER },
  dateLabel: { fontSize: 10, fontWeight: "700", color: Colors.TEXT_MUTED, letterSpacing: 0.6 },

  emptyWrap: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 40, paddingBottom: 80,
  },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: Colors.BG_CARD, borderWidth: 1, borderColor: Colors.BORDER,
    alignItems: "center", justifyContent: "center", marginBottom: 20,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: Colors.TEXT_PRIMARY, marginBottom: 10 },
  emptyBody: { fontSize: 13, color: Colors.TEXT_MUTED, textAlign: "center", lineHeight: 21 },
});

// Notification item styles 

const n = StyleSheet.create({
  wrap: {
    flexDirection: "row", alignItems: "flex-start",
    paddingHorizontal: 20, paddingVertical: 14, gap: 14,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)",
    position: "relative",
  },
  unreadBar: {
    position: "absolute", left: 0, top: 0, bottom: 0,
    width: 3, borderRadius: 1.5, backgroundColor: Colors.PRIMARY,
  },
  iconWrap: {
    width: 42, height: 42, borderRadius: 13,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  content: { flex: 1, gap: 3 },
  title: { fontSize: 13, fontWeight: "700", color: Colors.TEXT_PRIMARY, lineHeight: 18 },
  body: { fontSize: 12, color: Colors.TEXT_SECONDARY, lineHeight: 17 },
  footerRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginTop: 4,
  },
  time: { fontSize: 11, color: Colors.TEXT_MUTED },
  hint: { fontSize: 10, color: Colors.PRIMARY, fontWeight: "600", opacity: 0.8 },
});
