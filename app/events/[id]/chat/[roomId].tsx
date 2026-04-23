import React, { useState, useEffect } from "react";
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
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/hooks/useAuth";
import { MessageBubble } from "@/components/chat/MessageBubble";

export default function ChatRoomScreen() {
  const { id, roomId } = useLocalSearchParams<{ id: string; roomId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  
  const eventId = id as Id<"events">;
  const currentRoomId = roomId as Id<"chatRooms">;

  const event = useQuery(api.events.getById, { id: eventId });
  const myOrg = useQuery(api.organizations.getMyOrg);
  
  const messagesPage = useQuery(api.chat.getMessagesByRoom, {
    roomId: currentRoomId,
    paginationOpts: { numItems: 50, cursor: null },
  });

  const rooms = useQuery(api.chat.getRoomsByEvent, { eventId });
  const room = rooms?.find((r) => r._id === currentRoomId);

  const sendMessageMutation = useMutation(api.chat.sendMessage);
  const updateReadReceiptMutation = useMutation(api.chat.updateReadReceipt);

  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Update read receipt on load and when new messages arrive
  useEffect(() => {
    if (messagesPage && messagesPage.page.length > 0) {
      const latestMessageId = messagesPage.page[0]._id;
      updateReadReceiptMutation({
        roomId: currentRoomId,
        lastReadMessageId: latestMessageId,
      }).catch(console.error);
    }
  }, [messagesPage, currentRoomId]);

  if (event === undefined || messagesPage === undefined || room === undefined || myOrg === undefined || user === undefined) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.PRIMARY} />
      </View>
    );
  }

  const isCompleted = event?.status === "COMPLETED";
  const isHost = event?.hostOrgId === myOrg?._id;
  const canSend = !isCompleted && (room.type !== "ANNOUNCEMENT" || isHost);

  const handleSend = async () => {
    if (!messageText.trim() || isSending || !canSend) return;

    setIsSending(true);
    try {
      await sendMessageMutation({
        roomId: currentRoomId,
        content: messageText.trim(),
      });
      setMessageText("");
    } catch (error) {
      console.error("Failed to send message", error);
      // Fallback optimistic error handling could be added here
    } finally {
      setIsSending(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.TEXT_PRIMARY} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>{room.name}</Text>
          <Text style={styles.subtitle}>{room.type}</Text>
        </View>
      </View>

      {isCompleted && (
        <View style={styles.readOnlyBanner}>
          <Ionicons name="information-circle" size={16} color="#9CA3AF" />
          <Text style={styles.readOnlyText}>Event is completed. Chat is read-only.</Text>
        </View>
      )}

      <FlatList
        data={messagesPage.page}
        keyExtractor={(item) => item._id}
        inverted
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            isOwnMessage={item.senderUserId === user?._id}
          />
        )}
        contentContainerStyle={styles.listContent}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, !canSend && styles.inputDisabled]}
          placeholder={
            !canSend
              ? isCompleted
                ? "Chat is read-only"
                : "Only host can send announcements"
              : "Type a message..."
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
            <Ionicons name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    paddingBottom: 16,
    backgroundColor: Colors.BG_CARD,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  backBtn: {
    marginRight: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.TEXT_PRIMARY,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.TEXT_MUTED,
    textTransform: "capitalize",
  },
  readOnlyBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#374151",
    paddingVertical: 8,
    gap: 8,
  },
  readOnlyText: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "500",
  },
  listContent: {
    paddingVertical: 16,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: Colors.BG_CARD,
    borderTopWidth: 1,
    borderTopColor: Colors.BORDER,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    backgroundColor: Colors.BG_DARK,
    color: Colors.TEXT_PRIMARY,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    maxHeight: 100,
    minHeight: 40,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  inputDisabled: {
    backgroundColor: "#374151",
    color: "#9CA3AF",
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.PRIMARY,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  sendBtnDisabled: {
    backgroundColor: "#4B5563",
  },
});
