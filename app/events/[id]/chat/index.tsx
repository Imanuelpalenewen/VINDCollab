import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { UnreadBadge } from "@/components/chat/UnreadBadge";

export default function ChatRoomListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const eventId = id as Id<"events">;
  
  const rooms = useQuery(api.chat.getRoomsByEvent, { eventId });
  const unreadCounts = useQuery(api.chat.getUnreadCounts, { eventId });

  if (rooms === undefined || unreadCounts === undefined) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.PRIMARY} />
      </View>
    );
  }

  const renderRoom = ({ item }: { item: any }) => {
    const countInfo = unreadCounts.find((c) => c.roomId === item._id);
    const unreadCount = countInfo ? countInfo.unreadCount : 0;

    let iconName = "chatbubbles-outline";
    if (item.type === "ANNOUNCEMENT") iconName = "megaphone-outline";
    if (item.type === "TASK") iconName = "checkbox-outline";

    return (
      <TouchableOpacity
        style={styles.roomItem}
        onPress={() => router.push(`/events/${eventId}/chat/${item._id}`)}
      >
        <View style={styles.iconContainer}>
          <Ionicons name={iconName as any} size={24} color={Colors.PRIMARY} />
        </View>
        <View style={styles.roomInfo}>
          <Text style={styles.roomName}>{item.name}</Text>
          <Text style={styles.roomType}>{item.type.toLowerCase()}</Text>
        </View>
        <UnreadBadge count={unreadCount} />
        <Ionicons name="chevron-forward" size={20} color={Colors.TEXT_MUTED} style={{ marginLeft: 8 }} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.title}>Event Chat</Text>
      </View>
      <FlatList
        data={rooms}
        keyExtractor={(item) => item._id}
        renderItem={renderRoom}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={48} color={Colors.TEXT_MUTED} />
            <Text style={styles.emptyText}>No chat rooms available yet.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BG_DARK,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.BG_DARK,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: Colors.BG_CARD,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  backBtn: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.TEXT_PRIMARY,
  },
  listContent: {
    padding: 16,
  },
  roomItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.BG_CARD,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(59,130,246,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  roomInfo: {
    flex: 1,
  },
  roomName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.TEXT_PRIMARY,
    marginBottom: 4,
  },
  roomType: {
    fontSize: 12,
    color: Colors.TEXT_MUTED,
    textTransform: "capitalize",
  },
  emptyContainer: {
    paddingTop: 60,
    alignItems: "center",
  },
  emptyText: {
    marginTop: 16,
    color: Colors.TEXT_MUTED,
    fontSize: 14,
  },
});
