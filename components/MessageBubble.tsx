import { ConversationType, DeliveryStatus, Message, MessageType, User } from '@/types';
import { formatMessageTime } from '@/utils/helpers';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CachedImage from './CachedImage';
import PriorityBadge from './PriorityBadge';

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  senderName?: string;
  showSenderName?: boolean;
  conversationType?: ConversationType;
  participants?: User[];
  currentUserId?: string;
  onLongPress?: (message: Message) => void;
  onOpenThread?: (message: Message) => void;
  replyCount?: number; // Actual reply count from context
}

export default function MessageBubble({
  message,
  isOwnMessage,
  senderName,
  showSenderName = false,
  conversationType,
  participants = [],
  currentUserId,
  onLongPress,
  onOpenThread,
  replyCount,
}: MessageBubbleProps) {
  const getStatusIcon = () => {
    if (!isOwnMessage) return null;

    // Check if message is fully read by all recipients
    const isFullyRead = () => {
      if (!participants || participants.length === 0) {
        // 1-on-1 chat or no participant data
        return message.deliveryStatus === DeliveryStatus.READ;
      }

      // Group chat: check if ALL participants (except sender) have read
      const otherParticipants = participants.filter(
        (p) => p.id !== currentUserId
      );
      
      if (otherParticipants.length === 0) return false;

      // All other participants must have read the message
      return otherParticipants.every((p) => message.readBy.includes(p.id));
    };

    const fullyRead = isFullyRead();

    switch (message.deliveryStatus) {
      case DeliveryStatus.SENDING:
        return <Ionicons name="time-outline" size={14} color="rgba(255, 255, 255, 0.8)" />; // Clock while sending
      case DeliveryStatus.SENT:
      case DeliveryStatus.DELIVERED:
        // Show single white tick if not fully read
        if (!fullyRead) {
          return <Ionicons name="checkmark" size={14} color="rgba(255, 255, 255, 0.8)" />;
        }
        // Show double white ticks if fully read
        return <Ionicons name="checkmark-done" size={14} color="rgba(255, 255, 255, 0.8)" />;
      case DeliveryStatus.READ:
        // Double white ticks when read
        return <Ionicons name="checkmark-done" size={14} color="rgba(255, 255, 255, 0.8)" />;
      default:
        return null;
    }
  };

  const getReadByText = () => {
    // Only show for own messages in group chats
    if (!isOwnMessage || conversationType !== ConversationType.GROUP) {
      return null;
    }

    // Get list of users who have read the message (excluding sender)
    const readByUsers = participants.filter(
      (user) => message.readBy.includes(user.id) && user.id !== currentUserId
    );

    if (readByUsers.length === 0) {
      return null;
    }

    // Show names
    const names = readByUsers.map((user) => user.displayName).join(', ');
    
    // Limit display if too many readers
    if (readByUsers.length === 1) {
      return `Read by ${names}`;
    } else if (readByUsers.length === 2) {
      return `Read by ${names}`;
    } else if (readByUsers.length <= 4) {
      return `Read by ${names}`;
    } else {
      // Show first 3 names + count of others
      const firstThree = readByUsers.slice(0, 3).map((u) => u.displayName).join(', ');
      const remaining = readByUsers.length - 3;
      return `Read by ${firstThree} +${remaining} other${remaining > 1 ? 's' : ''}`;
    }
  };

  const readByText = getReadByText();

  const isGroupChat = conversationType === ConversationType.GROUP;
  const actualReplyCount = typeof replyCount === 'number' ? replyCount : 0;
  const hasReplies = actualReplyCount > 0;

  const handleLongPress = () => {
    if (onLongPress && isGroupChat) {
      onLongPress(message);
    }
  };

  const handleThreadPress = () => {
    if (onOpenThread && hasReplies) {
      onOpenThread(message);
    }
  };

  // Only show priority badge for high and medium priority (not low/green)
  const shouldShowPriority = message.aiPriority && (message.aiPriority === 'high' || message.aiPriority === 'medium');

  return (
    <View style={[styles.container, isOwnMessage ? styles.ownMessage : styles.otherMessage]}>
      {showSenderName && !isOwnMessage && senderName && (
        <Text style={styles.senderName}>{senderName}</Text>
      )}
      
      {/* Row container for badge and message */}
      <View style={styles.messageWithBadge}>
        {/* Priority Badge - left side for other's messages */}
        {shouldShowPriority && !isOwnMessage && (
          <View style={styles.badgeLeft}>
            <PriorityBadge priority={message.aiPriority!} score={message.priorityScore} showLabel={false} />
          </View>
        )}
        
        <TouchableOpacity
          onLongPress={handleLongPress}
          delayLongPress={500}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.bubble,
              isOwnMessage ? styles.ownBubble : styles.otherBubble,
              message.messageType === MessageType.IMAGE && styles.imageBubble,
            ]}
          >
            {/* Image Message */}
            {message.messageType === MessageType.IMAGE && message.imageUrl && (
              <CachedImage
                uri={message.imageUrl}
                style={styles.messageImage}
                borderRadius={12}
              />
            )}

            {/* Audio Message */}
            {message.messageType === MessageType.AUDIO && message.audioUrl && (
              <View style={styles.audioMessage}>
                <Ionicons name="play-circle" size={32} color={isOwnMessage ? '#fff' : '#007AFF'} />
                <Text style={[styles.text, isOwnMessage ? styles.ownText : styles.otherText]}>
                  🎤 Voice message {message.audioDuration ? `(${Math.floor(message.audioDuration)}s)` : ''}
                </Text>
              </View>
            )}

            {/* Text Message */}
            {(!message.messageType || message.messageType === MessageType.TEXT) && message.text && (
              <Text style={[styles.text, isOwnMessage ? styles.ownText : styles.otherText]}>
                {message.text}
              </Text>
            )}

            <View style={styles.footer}>
              <Text style={[styles.time, isOwnMessage ? styles.ownTime : styles.otherTime]}>
                {formatMessageTime(message.timestamp)}
              </Text>
              {getStatusIcon()}
            </View>
          </View>
        </TouchableOpacity>

        {/* Priority Badge - right side for own messages */}
        {shouldShowPriority && isOwnMessage && (
          <View style={styles.badgeRight}>
            <PriorityBadge priority={message.aiPriority!} score={message.priorityScore} showLabel={false} />
          </View>
        )}
      </View>
      
      {/* Thread indicator */}
      {isGroupChat && hasReplies && (
        <TouchableOpacity onPress={handleThreadPress} style={styles.threadIndicatorContainer}>
          <Text style={styles.threadIndicator}>
            {actualReplyCount} {actualReplyCount === 1 ? 'reply' : 'replies'} →
          </Text>
        </TouchableOpacity>
      )}
      
      {readByText && (
        <Text style={styles.readByText}>{readByText}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    marginHorizontal: 12,
    maxWidth: '80%',
  },
  ownMessage: {
    alignSelf: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
  },
  senderName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    marginLeft: 12,
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  ownBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
  },
  imageBubble: {
    padding: 0,
    overflow: 'hidden',
  },
  messageImage: {
    width: 250,
    height: 250,
  },
  audioMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
  },
  ownText: {
    color: '#fff',
  },
  otherText: {
    color: '#000',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  time: {
    fontSize: 11,
  },
  ownTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherTime: {
    color: '#999',
  },
  readByText: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
    marginLeft: 12,
    fontStyle: 'italic',
  },
  threadIndicatorContainer: {
    marginTop: 4,
    marginLeft: 12,
  },
  threadIndicator: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '500',
  },
  messageWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeLeft: {
    // Priority badge on the left side
  },
  badgeRight: {
    // Priority badge on the right side
  },
});


