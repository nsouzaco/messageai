import { Conversation, ConversationType } from '@/types';
import { formatConversationTime, getInitials, truncateText } from '@/utils/helpers';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CachedImage from './CachedImage';

interface ConversationItemProps {
  conversation: Conversation;
  currentUserId: string;
  onPress: () => void;
}

export default function ConversationItem({
  conversation,
  currentUserId,
  onPress,
}: ConversationItemProps) {
  const getConversationName = () => {
    if (conversation.type === ConversationType.GROUP) {
      return conversation.name || 'Group Chat';
    }

    // For one-on-one, get the other user's name
    const otherUser = conversation.participantDetails?.find(
      (user) => user.id !== currentUserId
    );
    return otherUser?.displayName || 'Unknown User';
  };

  const getConversationImage = () => {
    if (conversation.type === ConversationType.GROUP) {
      return null; // Could show group icon
    }

    const otherUser = conversation.participantDetails?.find(
      (user) => user.id !== currentUserId
    );
    return otherUser?.profilePicture;
  };

  const getUnreadCount = () => {
    return conversation.unreadCount[currentUserId] || 0;
  };

  const name = getConversationName();
  const imageUrl = getConversationImage();
  const unreadCount = getUnreadCount();
  const lastMessageText = conversation.lastMessage?.text || 'No messages yet';
  const lastMessageTime = conversation.lastMessage?.timestamp || conversation.createdAt;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.avatarContainer}>
        {imageUrl ? (
          <CachedImage uri={imageUrl} style={styles.avatar} borderRadius={28} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{getInitials(name)}</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.time}>{formatConversationTime(lastMessageTime)}</Text>
        </View>

        <View style={styles.messageRow}>
          <Text style={[styles.lastMessage, unreadCount > 0 && styles.unreadText]} numberOfLines={1}>
            {truncateText(lastMessageText, 40)}
          </Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  time: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  unreadText: {
    fontWeight: '600',
    color: '#000',
  },
  badge: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});


