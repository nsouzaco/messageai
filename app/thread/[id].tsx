import MessageBubble from '@/components/MessageBubble';
import MessageInput from '@/components/MessageInput';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { getParentMessage } from '@/services/firebase/firestore';
import { Message } from '@/types';
import { formatMessageTime } from '@/utils/helpers';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    View,
} from 'react-native';

export default function ThreadScreen() {
  const { id } = useLocalSearchParams();
  const params = (id as string).split('_');
  const conversationId = params[0];
  const parentMessageId = params[1];
  
  const router = useRouter();
  const { user } = useAuth();
  const { sendThreadReply: sendReply, listenToThread, threadMessages } = useChat();

  const [parentMessage, setParentMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const replies = threadMessages[parentMessageId] || [];

  useEffect(() => {
    // Load parent message
    const loadParentMessage = async () => {
      const message = await getParentMessage(conversationId, parentMessageId);
      setParentMessage(message);
      setLoading(false);
    };

    loadParentMessage();

    // Listen to thread replies
    if (conversationId && parentMessageId) {
      listenToThread(conversationId, parentMessageId);
    }
  }, [conversationId, parentMessageId]);

  const handleSendReply = async (text: string) => {
    if (!user || !text.trim()) return;

    setSending(true);
    try {
      await sendReply(conversationId, parentMessageId, text.trim());
    } catch (error) {
      console.error('Error sending thread reply:', error);
    } finally {
      setSending(false);
    }
  };

  const renderParentMessage = () => {
    if (!parentMessage) return null;

    const isOwnMessage = parentMessage.senderId === user?.id;

    return (
      <View style={styles.parentMessageContainer}>
        <View style={styles.parentMessageHeader}>
          <Ionicons name="chatbox-outline" size={16} color="#666" />
          <Text style={styles.parentMessageLabel}>Thread</Text>
        </View>
        <View style={styles.parentMessage}>
          <View style={styles.parentMessageBubble}>
            <Text style={styles.parentMessageText}>{parentMessage.text}</Text>
            <Text style={styles.parentMessageTime}>
              {formatMessageTime(parentMessage.timestamp)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderReply = ({ item }: { item: Message }) => {
    const isOwnMessage = item.senderId === user?.id;
    
    return (
      <MessageBubble
        message={item}
        isOwnMessage={isOwnMessage}
        showSenderName={false}
        currentUserId={user?.id}
      />
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!parentMessage) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#999" />
        <Text style={styles.errorText}>Message not found</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.content}>
        {renderParentMessage()}
        
        {replies.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No replies yet</Text>
            <Text style={styles.emptySubtext}>Be the first to reply</Text>
          </View>
        ) : (
          <FlatList
            data={replies}
            renderItem={renderReply}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.repliesList}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <MessageInput
        onSend={handleSendReply}
        placeholder="Reply in thread..."
        disabled={sending}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  errorText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  content: {
    flex: 1,
  },
  parentMessageContainer: {
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 16,
  },
  parentMessageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  parentMessageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  parentMessage: {
    paddingHorizontal: 16,
  },
  parentMessageBubble: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  parentMessageText: {
    fontSize: 15,
    color: '#000',
    lineHeight: 20,
  },
  parentMessageTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 8,
  },
  repliesList: {
    paddingTop: 16,
    paddingBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 4,
  },
});

