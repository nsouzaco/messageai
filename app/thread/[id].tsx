import AIButton from '@/components/AIButton';
import MessageBubble from '@/components/MessageBubble';
import MessageInput from '@/components/MessageInput';
import ThreadSummaryCard from '@/components/ThreadSummaryCard';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { summarizeThread, ThreadSummary } from '@/services/firebase/ai';
import { getParentMessage } from '@/services/firebase/firestore';
import { Message } from '@/types';
import { formatMessageTime } from '@/utils/helpers';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';

export default function ThreadScreen() {
  const { id } = useLocalSearchParams();
  const params = (id as string).split('_');
  const conversationId = params[0];
  const parentMessageId = params[1];
  
  const router = useRouter();
  const { user } = useAuth();
  const { conversations, sendThreadReply: sendReply, listenToThread, threadMessages } = useChat();

  const [parentMessage, setParentMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [summary, setSummary] = useState<ThreadSummary | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const replies = threadMessages[parentMessageId] || [];
  const conversation = conversations.find((c) => c.id === conversationId);

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
      // Invalidate summary when new reply is added
      if (summary) {
        setSummary(null);
        setShowSummary(false);
      }
    } catch (error) {
      console.error('Error sending thread reply:', error);
    } finally {
      setSending(false);
    }
  };

  const getSenderName = (senderId: string): string => {
    if (senderId === user?.id) return 'You';
    const sender = conversation?.participantDetails?.find((p) => p.id === senderId);
    return sender?.displayName || sender?.username || 'Unknown';
  };

  const handleSummarizeThread = async () => {
    setSummarizing(true);
    try {
      const result = await summarizeThread(conversationId, parentMessageId);
      setSummary(result);
      setShowSummary(true);
    } catch (error: any) {
      console.error('Error summarizing thread:', error);
      Alert.alert('Error', error.message || 'Failed to generate summary. Please try again.');
    } finally {
      setSummarizing(false);
    }
  };

  const renderParentMessage = () => {
    if (!parentMessage) return null;

    const isOwnMessage = parentMessage.senderId === user?.id;
    const senderName = getSenderName(parentMessage.senderId);

    return (
      <View style={styles.parentMessageContainer}>
        <View style={styles.parentMessage}>
          {!isOwnMessage && (
            <Text style={styles.parentSenderName}>{senderName}</Text>
          )}
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

  const renderSummarizeButton = () => {
    return (
      <View style={styles.summarizeSection}>
        <AIButton
          onPress={handleSummarizeThread}
          label="Summarize Thread"
          icon="sparkles"
          loading={summarizing}
          variant="primary"
          size="medium"
        />
      </View>
    );
  };

  const renderReply = ({ item }: { item: Message }) => {
    const isOwnMessage = item.senderId === user?.id;
    const senderName = getSenderName(item.senderId);
    
    return (
      <View style={styles.replyContainer}>
        {!isOwnMessage && (
          <Text style={styles.senderName}>{senderName}</Text>
        )}
        <MessageBubble
          message={item}
          isOwnMessage={isOwnMessage}
          showSenderName={false}
          currentUserId={user?.id}
        />
      </View>
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
    <>
      <Stack.Screen
        options={{
          title: 'Thread',
          headerTransparent: true,
          headerBlurEffect: 'light',
          headerStyle: {
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
          },
          headerTitleStyle: {
            color: '#007AFF',
            fontWeight: '600',
          },
        }}
      />
      <LinearGradient
        colors={['#E0E7FF', '#F8F9FF', '#FFFFFF']}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
          <ScrollView 
            style={styles.contentWrapper}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Summarize Button */}
            {renderSummarizeButton()}
            
            {/* Parent Message */}
            {renderParentMessage()}
            
            {/* AI Summary */}
            {summary && showSummary && (
              <ThreadSummaryCard
                summary={summary.summary}
                bulletPoints={summary.bulletPoints}
                messageCount={summary.messageCount}
                generatedAt={summary.generatedAt}
                cached={summary.cached}
                onDismiss={() => setShowSummary(false)}
              />
            )}

            {/* Replies */}
            {replies.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No replies yet</Text>
                <Text style={styles.emptySubtext}>Be the first to reply</Text>
              </View>
            ) : (
              <View style={styles.repliesContainer}>
                {replies.map((item) => (
                  <View key={item.id}>
                    {renderReply({ item })}
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          <BlurView intensity={80} tint="light" style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <MessageInput
                onSend={handleSendReply}
                placeholder="Reply in thread..."
                disabled={sending}
                noWrapper={true}
              />
            </View>
          </BlurView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
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
  contentWrapper: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 80,
    paddingBottom: 20,
  },
  summarizeSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  repliesContainer: {
    paddingTop: 8,
  },
  parentMessageContainer: {
    backgroundColor: '#f5f8ff',
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 0,
  },
  parentMessage: {
    paddingHorizontal: 16,
  },
  parentSenderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
    marginLeft: 4,
  },
  parentMessageBubble: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 60,
  },
  parentMessageText: {
    fontSize: 16,
    color: '#000000',
    lineHeight: 24,
    fontWeight: '400',
  },
  parentMessageTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 8,
  },
  replyContainer: {
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    minHeight: 200,
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
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 122, 255, 0.1)',
    overflow: 'hidden',
  },
  inputWrapper: {
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 20 : 16,
  },
});

