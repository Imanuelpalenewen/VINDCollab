import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/hooks/useAuth";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { SafeAreaView } from "react-native-safe-area-context";

interface ReplyState {
  messageId: Id<"chatMessages">;
  content: string;
  senderOrgName: string;
}

export default function EventChatScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const evId = eventId as Id<"events">;

  const event = useQuery(api.events.getById, { id: evId });
  const myOrg = useQuery(api.organizations.getMyOrg);
  const rooms = useQuery(api.chat.getRoomsByEvent, { eventId: evId });

  const [activeRoomId, setActiveRoomId] = useState<Id<"chatRooms"> | null>(null);
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [replyTo, setReplyTo] = useState<ReplyState | null>(null);
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [loadingSmartReplies, setLoadingSmartReplies] = useState(false);

  const lastSeenMessageIdRef = useRef<string | null>(null);

  const sendMessageMutation = useMutation(api.chat.sendMessage);
  const updateReadReceiptMutation = useMutation(api.chat.updateReadReceipt);
  const getSmartRepliesAction = useAction(api.chat.getSmartReplies);

  // Filter out partnership rooms — only show EVENT/ANNOUNCEMENT channels
  const visibleRooms = React.useMemo(() => {
    // Debug: log raw room data from DB so we can verify what's being filtered
    console.log(
      "[EventChat] Raw rooms from DB:",
      JSON.stringify(
        (rooms ?? []).map((r) => ({ name: r.name, type: r.type, id: r._id }))
      )
    );
    const filtered = (rooms ?? []).filter(
      (r) => !r.name.startsWith("partnership-") && r.type !== "TASK"
    );
    console.log(
      "[EventChat] Visible rooms after filter:",
      filtered.map((r) => r.name)
    );
    return filtered;
  }, [rooms]);

  // Set default room to first one (prefer EVENT/general type)
  useEffect(() => {
    if (visibleRooms.length > 0 && !activeRoomId) {
      const general = visibleRooms.find(
        (r) => r.type === "EVENT" || r.name.toLowerCase().includes("general")
      );
      setActiveRoomId(general?._id ?? visibleRooms[0]._id);
    }
  }, [visibleRooms]);

  const messagesPage = useQuery(
    api.chat.getMessagesByRoom,
    activeRoomId
      ? { roomId: activeRoomId, paginationOpts: { numItems: 50, cursor: null } }
      : "skip"
  );

  // Update read receipt when messages load
  useEffect(() => {
    if (messagesPage && messagesPage.page.length > 0 && activeRoomId) {
      const latestId = messagesPage.page[0]._id;
      updateReadReceiptMutation({
        roomId: activeRoomId,
        lastReadMessageId: latestId,
      }).catch(console.error);
    }
  }, [messagesPage, activeRoomId]);

  // Trigger smart replies when a new message from another user arrives
  useEffect(() => {
    if (!messagesPage || messagesPage.page.length === 0 || !activeRoomId) return;
    const latest = messagesPage.page[0];
    if (latest._id === lastSeenMessageIdRef.current) return;
    lastSeenMessageIdRef.current = latest._id;

    // Only trigger if latest message is NOT from current user
    if (latest.senderUserId !== user?._id) {
      setLoadingSmartReplies(true);
      setSmartReplies([]);
      getSmartRepliesAction({ roomId: activeRoomId })
        .then((result) => {
          if (result && result.replies.length > 0) {
            setSmartReplies(result.replies);
          }
        })
        .catch(() => {}) // Fail silently
        .finally(() => setLoadingSmartReplies(false));
    }
  }, [messagesPage?.page[0]?._id, activeRoomId]);

  // Build message lookup map for reply previews
  const messageMap = React.useMemo(() => {
    const map = new Map<string, { content: string; senderOrgName: string }>();
    if (messagesPage?.page) {
      for (const msg of messagesPage.page) {
        map.set(msg._id, {
          content: msg.content,
          senderOrgName: msg.senderOrg?.name ?? "Unknown",
        });
      }
    }
    return map;
  }, [messagesPage]);

  const handleSwitchRoom = (roomId: Id<"chatRooms">) => {
    if (roomId === activeRoomId) return;
    setActiveRoomId(roomId);
    setReplyTo(null);
    setSmartReplies([]);
    lastSeenMessageIdRef.current = null;
  };

  const handleLongPressMessage = useCallback((msg: any) => {
    setReplyTo({
      messageId: msg._id,
      content: msg.content,
      senderOrgName: msg.senderOrg?.name ?? "Unknown",
    });
  }, []);

  const handleSend = async () => {
    if (!messageText.trim() || isSending || !activeRoomId || !canSend) return;
    setIsSending(true);
    try {
      await sendMessageMutation({
        roomId: activeRoomId,
        content: messageText.trim(),
        replyToMessageId: replyTo?.messageId,
      });
      setMessageText("");
      setReplyTo(null);
      setSmartReplies([]);
    } catch (error) {
      console.error("Failed to send message", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleSmartReplyTap = (text: string) => {
    setMessageText(text);
    setSmartReplies([]);
  };

  const getRoomIcon = (type: string) => {
    if (type === "ANNOUNCEMENT") return "megaphone";
    if (type === "TASK") return "checkbox";
    return "chatbubbles";
  };

  const getRoomLabel = (room: { name: string; type: string }) => {
    const prefix = room.type === "ANNOUNCEMENT" ? "#" : "#";
    return `${prefix}${room.name.toLowerCase().replace(/\s+/g, "-")}`;
  };

  if (event === undefined || rooms === undefined || myOrg === undefined) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <ActivityIndicator size="large" color={Colors.PRIMARY} />
      </SafeAreaView>
    );
  }

  const activeRoom = rooms.find((r) => r._id === activeRoomId);
  const isCompleted = event?.status === "COMPLETED";
  const isHost = event?.hostOrgId === myOrg?._id;
  const canSend =
    !isCompleted && (activeRoom?.type !== "ANNOUNCEMENT" || isHost);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      {/* Header */}
      <SafeAreaView edges={["top"]} style={styles.headerWrap}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={Colors.TEXT_PRIMARY} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {event?.title ?? "Chat"}
            </Text>
            <Text style={styles.headerSub}>{event?.eventType}</Text>
          </View>
        </View>

        {/* Room Pill Tabs — only EVENT & ANNOUNCEMENT rooms */}
        {visibleRooms.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.pillScroll}
            contentContainerStyle={styles.pillContainer}
          >
            {visibleRooms.map((room) => {
              const isActive = room._id === activeRoomId;
              return (
                <TouchableOpacity
                  key={room._id}
                  style={[styles.pill, isActive && styles.pillActive]}
                  onPress={() => handleSwitchRoom(room._id)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={getRoomIcon(room.type) as any}
                    size={13}
                    color={isActive ? "#fff" : Colors.TEXT_MUTED}
                    style={{ marginRight: 5 }}
                  />
                  <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                    {getRoomLabel(room)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </SafeAreaView>

      {/* Read-only banner */}
      {isCompleted && (
        <View style={styles.readOnlyBanner}>
          <Ionicons name="information-circle" size={14} color="#9CA3AF" />
          <Text style={styles.readOnlyText}>Event completed · Chat is read-only</Text>
        </View>
      )}
      {activeRoom?.type === "ANNOUNCEMENT" && !isHost && (
        <View style={styles.readOnlyBanner}>
          <Ionicons name="megaphone" size={14} color="#9CA3AF" />
          <Text style={styles.readOnlyText}>Only the host can post announcements</Text>
        </View>
      )}

      {/* Messages */}
      {/* Case 1: no room selected yet (effect hasn't fired or no visible rooms) */}
      {!activeRoomId ? (
        rooms !== undefined && visibleRooms.length === 0 ? (
          <View style={styles.emptyMessages}>
            <Ionicons name="chatbubble-ellipses-outline" size={40} color={Colors.TEXT_MUTED} />
            <Text style={styles.emptyMessagesText}>
              No chat rooms available for this event.
            </Text>
          </View>
        ) : (
          // Rooms are loading or effect hasn't set activeRoomId yet — brief spinner
          <View style={styles.centered}>
            <ActivityIndicator size="small" color={Colors.PRIMARY} />
          </View>
        )
      ) : messagesPage === undefined ? (
        // Case 2: room is selected but messages are still loading
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={Colors.PRIMARY} />
        </View>
      ) : (
        // Case 3: messages loaded
        <FlatList
          data={messagesPage.page}
          keyExtractor={(item) => item._id}
          inverted
          renderItem={({ item }) => {
            const replyPreview = item.replyToMessageId
              ? messageMap.get(item.replyToMessageId) ?? null
              : null;
            return (
              <MessageBubble
                message={item}
                isOwnMessage={item.senderUserId === user?._id}
                replyPreview={replyPreview}
                onLongPress={() => handleLongPressMessage(item)}
              />
            );
          }}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyMessages}>
              <Ionicons name="chatbubble-ellipses-outline" size={40} color={Colors.TEXT_MUTED} />
              <Text style={styles.emptyMessagesText}>No messages yet. Say hello!</Text>
            </View>
          }
        />
      )}

      {/* Input area — SafeAreaView handles bottom notch on iOS */}
      <SafeAreaView edges={["bottom"]} style={styles.inputArea}>
        {/* Smart Reply Pills */}
        {smartReplies.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.smartReplyScroll}
            contentContainerStyle={styles.smartReplyContainer}
          >
            {smartReplies.map((reply, index) => (
              <TouchableOpacity
                key={index}
                style={styles.smartReplyPill}
                onPress={() => handleSmartReplyTap(reply)}
                activeOpacity={0.7}
              >
                <Text style={styles.smartReplyText}>{reply}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Reply-to preview */}
        {replyTo && (
          <View style={styles.replyPreviewBar}>
            <View style={styles.replyAccent} />
            <View style={styles.replyPreviewContent}>
              <Text style={styles.replyPreviewName}>{replyTo.senderOrgName}</Text>
              <Text style={styles.replyPreviewText} numberOfLines={1}>
                {replyTo.content}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReplyTo(null)} style={styles.replyClose}>
              <Ionicons name="close" size={18} color={Colors.TEXT_MUTED} />
            </TouchableOpacity>
          </View>
        )}

        {/* Text input row */}
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, !canSend && styles.inputDisabled]}
            placeholder={
              !canSend
                ? isCompleted
                  ? "Chat is read-only"
                  : "Only host can post here"
                : "Type a message…"
            }
            placeholderTextColor={Colors.TEXT_MUTED}
            value={messageText}
            onChangeText={setMessageText}
            multiline
            editable={canSend}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!messageText.trim() || !canSend || isSending) && styles.sendBtnDisabled,
            ]}
            onPress={handleSend}
            disabled={!messageText.trim() || !canSend || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.BG_DARK },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.BG_DARK },
  // Header
  headerWrap: { backgroundColor: Colors.BG_CARD, borderBottomWidth: 1, borderBottomColor: Colors.BORDER },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  backBtn: { marginRight: 12, padding: 2 },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: "700", color: Colors.TEXT_PRIMARY },
  headerSub: { fontSize: 11, color: Colors.TEXT_MUTED, marginTop: 1 },
  // Room pills
  pillScroll: { maxHeight: 46 },
  pillContainer: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 8,
    flexDirection: "row",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  pillActive: {
    backgroundColor: Colors.PRIMARY,
    borderColor: Colors.PRIMARY,
  },
  pillText: { fontSize: 13, fontWeight: "500", color: Colors.TEXT_MUTED },
  pillTextActive: { color: "#fff" },
  // Banners
  readOnlyBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1F2937",
    paddingVertical: 7,
    gap: 6,
  },
  readOnlyText: { color: "#9CA3AF", fontSize: 12 },
  // Messages
  listContent: { paddingVertical: 12 },
  emptyMessages: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 10,
  },
  emptyMessagesText: { color: Colors.TEXT_MUTED, fontSize: 14 },
  // Input area
  inputArea: {
    backgroundColor: Colors.BG_CARD,
    borderTopWidth: 1,
    borderTopColor: Colors.BORDER,
  },
  // Smart replies
  smartReplyScroll: { maxHeight: 44 },
  smartReplyContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    flexDirection: "row",
  },
  smartReplyPill: {
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "rgba(59,130,246,0.15)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.4)",
  },
  smartReplyText: { fontSize: 13, color: "#60A5FA", fontWeight: "500" },
  // Reply preview bar
  replyPreviewBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderTopWidth: 1,
    borderTopColor: Colors.BORDER,
  },
  replyAccent: {
    width: 3,
    height: 36,
    borderRadius: 2,
    backgroundColor: Colors.PRIMARY,
    marginRight: 10,
  },
  replyPreviewContent: { flex: 1 },
  replyPreviewName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#60A5FA",
    marginBottom: 2,
  },
  replyPreviewText: { fontSize: 12, color: Colors.TEXT_MUTED },
  replyClose: { padding: 4, marginLeft: 8 },
  // Text input
  inputRow: {
    flexDirection: "row",
    padding: 10,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    backgroundColor: Colors.BG_DARK,
    color: Colors.TEXT_PRIMARY,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    maxHeight: 110,
    minHeight: 42,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    fontSize: 15,
  },
  inputDisabled: {
    backgroundColor: "#1F2937",
    color: "#6B7280",
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.PRIMARY,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  sendBtnDisabled: { backgroundColor: "#374151" },
});
