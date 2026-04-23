import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ReplyPreview {
  content: string;
  senderOrgName: string;
}

interface MessageBubbleProps {
  message: {
    _id: string;
    content: string;
    _creationTime: number;
    isEdited: boolean;
    senderOrgId: string;
    senderUserId: string;
    replyToMessageId?: string | null;
    senderOrg?: {
      logoUrl?: string;
      name: string;
    } | null;
  };
  isOwnMessage: boolean;
  replyPreview?: ReplyPreview | null;
  onLongPress?: () => void;
}

export function MessageBubble({ message, isOwnMessage, replyPreview, onLongPress }: MessageBubbleProps) {
  const timeString = new Date(message._creationTime).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <TouchableOpacity
      style={[styles.container, isOwnMessage ? styles.ownContainer : styles.otherContainer]}
      onLongPress={onLongPress}
      delayLongPress={350}
      activeOpacity={0.85}
    >
      {!isOwnMessage && message.senderOrg && (
        <Image
          source={{ uri: message.senderOrg.logoUrl || 'https://ui-avatars.com/api/?name=Org&background=3B82F6&color=fff' }}
          style={styles.avatar}
        />
      )}
      <View style={[styles.bubble, isOwnMessage ? styles.ownBubble : styles.otherBubble]}>
        {!isOwnMessage && message.senderOrg && (
          <Text style={styles.orgName}>{message.senderOrg.name}</Text>
        )}

        {/* Reply quote block */}
        {replyPreview && (
          <View style={[styles.replyQuote, isOwnMessage ? styles.replyQuoteOwn : styles.replyQuoteOther]}>
            <View style={[styles.replyBar, isOwnMessage ? styles.replyBarOwn : styles.replyBarOther]} />
            <View style={styles.replyContent}>
              <Text style={[styles.replyName, isOwnMessage ? styles.replyNameOwn : styles.replyNameOther]}>
                {replyPreview.senderOrgName}
              </Text>
              <Text
                style={[styles.replyText, isOwnMessage ? styles.replyTextOwn : styles.replyTextOther]}
                numberOfLines={2}
              >
                {replyPreview.content}
              </Text>
            </View>
          </View>
        )}

        <Text style={[styles.content, isOwnMessage ? styles.ownContent : styles.otherContent]}>
          {message.content}
        </Text>
        <View style={styles.metaContainer}>
          {message.isEdited && <Text style={styles.editedText}>edited </Text>}
          <Text style={[styles.time, isOwnMessage ? styles.ownTime : styles.otherTime]}>
            {timeString}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
    paddingHorizontal: 16,
  },
  ownContainer: { justifyContent: 'flex-end' },
  otherContainer: { justifyContent: 'flex-start' },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#374151',
  },
  bubble: {
    maxWidth: '75%',
    padding: 10,
    borderRadius: 16,
  },
  ownBubble: {
    backgroundColor: '#3B82F6',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#1F2937',
    borderBottomLeftRadius: 4,
  },
  orgName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 3,
  },
  // Reply quote
  replyQuote: {
    flexDirection: 'row',
    borderRadius: 8,
    marginBottom: 6,
    padding: 6,
    overflow: 'hidden',
  },
  replyQuoteOwn: { backgroundColor: 'rgba(0,0,0,0.2)' },
  replyQuoteOther: { backgroundColor: 'rgba(255,255,255,0.07)' },
  replyBar: { width: 3, borderRadius: 2, marginRight: 7 },
  replyBarOwn: { backgroundColor: 'rgba(255,255,255,0.6)' },
  replyBarOther: { backgroundColor: '#3B82F6' },
  replyContent: { flex: 1 },
  replyName: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  replyNameOwn: { color: 'rgba(255,255,255,0.8)' },
  replyNameOther: { color: '#60A5FA' },
  replyText: { fontSize: 12, lineHeight: 16 },
  replyTextOwn: { color: 'rgba(255,255,255,0.65)' },
  replyTextOther: { color: '#9CA3AF' },
  // Message content
  content: { fontSize: 15, lineHeight: 21 },
  ownContent: { color: '#FFFFFF' },
  otherContent: { color: '#F3F4F6' },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  editedText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: 'rgba(255,255,255,0.6)',
    marginRight: 4,
  },
  time: { fontSize: 11 },
  ownTime: { color: 'rgba(255,255,255,0.6)' },
  otherTime: { color: '#6B7280' },
});
