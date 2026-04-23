import { Colors } from "@/constants/Colors";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ChatTabScreen() {
  const router = useRouter();
  const events = useQuery(api.chat.getMyEventsWithRooms);

  if (events === undefined) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <ActivityIndicator size="large" color={Colors.PRIMARY} />
      </SafeAreaView>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "EXECUTING": return "#10B981";
      case "PLANNING": return "#F59E0B";
      case "OPEN": return "#3B82F6";
      case "COMPLETED": return "#6B7280";
      default: return Colors.TEXT_MUTED;
    }
  };

  const renderEvent = ({ item }: { item: typeof events[0] }) => (
    <TouchableOpacity
      style={styles.eventItem}
      onPress={() => router.push(`/chat/${item._id}`)}
      activeOpacity={0.75}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="chatbubbles" size={24} color={Colors.PRIMARY} />
      </View>
      <View style={styles.eventInfo}>
        <Text style={styles.eventTitle} numberOfLines={1}>{item.title}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.eventType}>{item.eventType}</Text>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.TEXT_MUTED} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
        <Text style={styles.headerSub}>Your event conversations</Text>
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) => item._id}
        renderItem={renderEvent}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={56} color={Colors.TEXT_MUTED} />
            <Text style={styles.emptyTitle}>No event chats yet</Text>
            <Text style={styles.emptyText}>
              Join or host an event to start chatting with partners.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.BG_DARK },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.BG_DARK },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  headerTitle: { fontSize: 26, fontWeight: "bold", color: Colors.TEXT_PRIMARY },
  headerSub: { fontSize: 13, color: Colors.TEXT_MUTED, marginTop: 2 },
  listContent: { padding: 16, gap: 10 },
  eventItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.BG_CARD,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(59,130,246,0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  eventInfo: { flex: 1, marginRight: 8 },
  eventTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.TEXT_PRIMARY,
    marginBottom: 5,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  eventType: { fontSize: 12, color: Colors.TEXT_MUTED },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: "500" },
  emptyContainer: { paddingTop: 100, alignItems: "center", paddingHorizontal: 32 },
  emptyTitle: { marginTop: 16, fontSize: 17, fontWeight: "600", color: Colors.TEXT_PRIMARY },
  emptyText: { marginTop: 8, color: Colors.TEXT_MUTED, fontSize: 14, textAlign: "center", lineHeight: 20 },
});
