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
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { paginationOptsValidator } from "convex/server";

type InvitationType = Doc<"invitations"> & {
  event?: Doc<"events">;
  senderOrg?: Doc<"organizations">;
  recipientOrg?: Doc<"organizations">;
};

export default function InvitationInboxScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<"received" | "sent">("received");
  const [refreshing, setRefreshing] = useState(false);

  const invitations = useQuery(api.invitations.getMyInvitations, {
    paginationOpts: { numItems: 50, cursor: null },
  });

  const handleRefresh = () => {
    setRefreshing(true);
    // Query will re-fetch automatically
    setTimeout(() => setRefreshing(false), 500);
  };

  if (!invitations) {
    return (
      <SafeAreaView style={s.container} edges={["top"]}>
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  // Filter invitations by tab
  const filteredInvitations = invitations.page.filter((inv) => {
    // This is a simplified filter - in real app, would need actual org ID
    return tab === "received"
      ? true // All invitations
      : false;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return { bg: "rgba(245, 158, 11, 0.08)", text: Colors.WARNING };
      case "NEGOTIATING":
        return { bg: "rgba(6, 182, 212, 0.08)", text: Colors.INFO };
      case "ACCEPTED":
        return { bg: "rgba(16, 185, 129, 0.08)", text: Colors.SUCCESS };
      case "DECLINED":
        return { bg: "rgba(239, 68, 68, 0.08)", text: Colors.ERROR };
      case "EXPIRED":
        return { bg: "rgba(239, 68, 68, 0.08)", text: Colors.ERROR };
      default:
        return { bg: Colors.BG_CARD, text: Colors.TEXT_MUTED };
    }
  };

  const renderInvitationItem = ({ item }: { item: InvitationType }) => {
    const statusStyle = getStatusColor(item.status);
    const formatDate = (timestamp: number) => {
      const date = new Date(timestamp);
      const today = new Date();
      const isToday =
        date.toDateString() === today.toDateString();
      if (isToday) {
        return date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        });
      }
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    };

    return (
      <TouchableOpacity
        style={s.itemContainer}
        onPress={() =>
          router.push({
            pathname: "/invitations/[id]",
            params: { id: item._id },
          })
        }
      >
        <Card style={s.itemCard}>
          <View style={s.itemHeader}>
            <View style={s.itemHeaderLeft}>
              <View style={[s.statusDot, { backgroundColor: statusStyle.text }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.eventTitle} numberOfLines={1}>
                  {item.event?.title ?? "Event"}
                </Text>
                <Text style={s.orgName} numberOfLines={1}>
                  {tab === "received"
                    ? item.senderOrg?.name ?? "Organization"
                    : item.recipientOrg?.name ?? "Organization"}
                </Text>
              </View>
            </View>
            <Text style={s.dateText}>{formatDate(item._creationTime)}</Text>
          </View>

          <View style={s.itemBody}>
            <View style={s.roleSection}>
              <Badge label={item.proposedRole} />
            </View>
            {item.resourceContribution && (
              <Text style={s.contributionText} numberOfLines={2}>
                📦 {item.resourceContribution}
              </Text>
            )}
          </View>

          <View style={s.itemFooter}>
            <View style={[s.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[s.statusText, { color: statusStyle.text }]}>
                {item.status}
              </Text>
            </View>
            {item.negotiationRounds > 1 && (
              <Text style={s.roundsText}>
                Round {item.negotiationRounds}/5
              </Text>
            )}
            <Ionicons
              name="chevron-forward"
              size={16}
              color={Colors.TEXT_MUTED}
              style={{ marginLeft: "auto" }}
            />
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={s.emptyContainer}>
      <View style={s.emptyIcon}>
        <Ionicons name="mail-outline" size={36} color={Colors.TEXT_MUTED} />
      </View>
      <Text style={s.emptyTitle}>No Invitations</Text>
      <Text style={s.emptyText}>
        {tab === "received"
          ? "You haven't received any invitations yet"
          : "You haven't sent any invitations yet"}
      </Text>
    </View>
  );

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
        <Text style={s.headerTitle}>Invitations</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Tab Switcher */}
      <View style={s.tabContainer}>
        <TouchableOpacity
          style={[s.tab, tab === "received" && s.tabActive]}
          onPress={() => setTab("received")}
        >
          <Ionicons
            name="mail-outline"
            size={16}
            color={
              tab === "received" ? Colors.PRIMARY : Colors.TEXT_SECONDARY
            }
          />
          <Text
            style={[
              s.tabText,
              tab === "received" && s.tabTextActive,
            ]}
          >
            Received
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, tab === "sent" && s.tabActive]}
          onPress={() => setTab("sent")}
        >
          <Ionicons
            name="send-outline"
            size={16}
            color={
              tab === "sent" ? Colors.PRIMARY : Colors.TEXT_SECONDARY
            }
          />
          <Text
            style={[
              s.tabText,
              tab === "sent" && s.tabTextActive,
            ]}
          >
            Sent
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {filteredInvitations.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={filteredInvitations}
          renderItem={renderInvitationItem}
          keyExtractor={(item) => item._id}
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
  container: {
    flex: 1,
    backgroundColor: Colors.BG_DARK,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
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
  tabContainer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  tabActive: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderColor: Colors.PRIMARY,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.TEXT_SECONDARY,
  },
  tabTextActive: {
    color: Colors.PRIMARY,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  itemContainer: {
    marginBottom: 10,
  },
  itemCard: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  itemHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  eventTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.TEXT_PRIMARY,
  },
  orgName: {
    fontSize: 11,
    color: Colors.TEXT_MUTED,
    marginTop: 2,
  },
  dateText: {
    fontSize: 11,
    color: Colors.TEXT_MUTED,
    marginLeft: 10,
  },
  itemBody: {
    gap: 8,
    marginBottom: 10,
  },
  roleSection: {
    flexDirection: "row",
  },
  contributionText: {
    fontSize: 12,
    color: Colors.TEXT_SECONDARY,
    lineHeight: 18,
  },
  itemFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
    paddingTop: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  roundsText: {
    fontSize: 10,
    color: Colors.TEXT_MUTED,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyIcon: {
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
});
