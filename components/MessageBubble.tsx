import { DeliveryStatus, Message } from '@/types';
import { formatMessageTime } from '@/utils/helpers';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  senderName?: string;
  showSenderName?: boolean;
}

export default function MessageBubble({
  message,
  isOwnMessage,
  senderName,
  showSenderName = false,
}: MessageBubbleProps) {
  const getStatusIcon = () => {
    if (!isOwnMessage) return null;

    switch (message.deliveryStatus) {
      case DeliveryStatus.SENDING:
        return <Ionicons name="time-outline" size={14} color="#999" />;
      case DeliveryStatus.SENT:
        return <Ionicons name="checkmark" size={14} color="#999" />;
      case DeliveryStatus.DELIVERED:
        return <Ionicons name="checkmark-done" size={14} color="#999" />;
      case DeliveryStatus.READ:
        return <Ionicons name="checkmark-done" size={14} color="#007AFF" />;
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, isOwnMessage ? styles.ownMessage : styles.otherMessage]}>
      {showSenderName && !isOwnMessage && senderName && (
        <Text style={styles.senderName}>{senderName}</Text>
      )}
      <View
        style={[
          styles.bubble,
          isOwnMessage ? styles.ownBubble : styles.otherBubble,
        ]}
      >
        <Text style={[styles.text, isOwnMessage ? styles.ownText : styles.otherText]}>
          {message.text}
        </Text>
        <View style={styles.footer}>
          <Text style={[styles.time, isOwnMessage ? styles.ownTime : styles.otherTime]}>
            {formatMessageTime(message.timestamp)}
          </Text>
          {getStatusIcon()}
        </View>
      </View>
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
    backgroundColor: '#E8E8E8',
    borderBottomLeftRadius: 4,
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
});


