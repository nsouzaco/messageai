import CachedImage from '@/components/CachedImage';
import MessageActionMenu from '@/components/MessageActionMenu';
import MessageBubble from '@/components/MessageBubble';
import MessageInput from '@/components/MessageInput';
import PresenceIndicator from '@/components/PresenceIndicator';
import TypingIndicator from '@/components/TypingIndicator';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { listenToTyping, listenToUserPresence, setUserTyping } from '@/services/firebase/realtimeDb';
import { ConversationType, Message, OnlineStatus, Presence, TypingStatus } from '@/types';
import { getInitials } from '@/utils/helpers';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const conversationId = id as string;
  const router = useRouter();
  const { user } = useAuth();
  const { conversations, messages, threadReplyCounts, setActiveConversation, sendMessage, markMessagesAsRead, listenToThread } = useChat();
  
  const [typingUsers, setTypingUsers] = useState<TypingStatus[]>([]);
  const [otherUserPresence, setOtherUserPresence] = useState<Presence | null>(null);
  const [sending, setSending] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const conversation = conversations.find((c) => c.id === conversationId);
  const conversationMessages = messages[conversationId] || [];

  useEffect(() => {
    setActiveConversation(conversationId);
    markMessagesAsRead(conversationId);

    return () => {
      setActiveConversation(null);
    };
  }, [conversationId]);

  // Listen to thread counts for messages that have threads
  useEffect(() => {
    if (!conversation) return;

    // Set up listeners for any message that has a thread
    conversationMessages.forEach((message) => {
      if (message.hasThread) {
        listenToThread(conversationId, message.id);
      }
    });
  }, [conversationMessages, conversationId, listenToThread]);

  // Listen to typing indicators
  useEffect(() => {
    if (!user) return;

    const unsubscribe = listenToTyping(conversationId, user.id, (users) => {
      setTypingUsers(users);
    });

    return () => unsubscribe();
  }, [conversationId, user]);

  // Listen to presence for one-on-one chats
  useEffect(() => {
    if (!conversation || conversation.type !== ConversationType.ONE_ON_ONE || !user) return;

    const otherUser = conversation.participantDetails?.find((u) => u.id !== user.id);
    if (!otherUser) return;

    const unsubscribe = listenToUserPresence(otherUser.id, (presence) => {
      setOtherUserPresence(presence);
    });

    return () => unsubscribe();
  }, [conversation, user]);

  const handleSendMessage = async (text: string) => {
    if (!user) return;

    setSending(true);
    try {
      await sendMessage(conversationId, text);
      // Clear typing status
      await setUserTyping(conversationId, user.id, false);
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleTyping = async (isTyping: boolean) => {
    if (!user) return;
    await setUserTyping(conversationId, user.id, isTyping);
  };

  const getHeaderTitle = () => {
    if (!conversation) return 'Chat';

    if (conversation.type === ConversationType.GROUP) {
      return conversation.name || 'Group Chat';
    }

    const otherUser = conversation.participantDetails?.find((u) => u.id !== user?.id);
    return otherUser?.displayName || 'Unknown User';
  };

  const getHeaderSubtitle = () => {
    if (!conversation || conversation.type === ConversationType.GROUP) return null;

    if (otherUserPresence?.status === OnlineStatus.ONLINE) {
      return 'Online';
    }

    return null;
  };

  const getHeaderImage = () => {
    if (!conversation || conversation.type === ConversationType.GROUP) return null;

    const otherUser = conversation.participantDetails?.find((u) => u.id !== user?.id);
    return otherUser?.profilePicture;
  };

  const handleHeaderPress = () => {
    if (conversation?.type === ConversationType.GROUP) {
      router.push({
        pathname: '/group-info/[id]',
        params: { id: conversationId }
      });
    }
  };

  const handleLongPressMessage = (message: Message) => {
    setSelectedMessage(message);
    setShowActionMenu(true);
  };

  const handleReplyInThread = (message: Message) => {
    router.push({
      pathname: '/thread/[id]',
      params: { id: `${conversationId}_${message.id}` }
    });
  };

  const handleOpenThread = (message: Message) => {
    router.push({
      pathname: '/thread/[id]',
      params: { id: `${conversationId}_${message.id}` }
    });
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isOwnMessage = item.senderId === user?.id;
    const showSenderName = conversation?.type === ConversationType.GROUP && !isOwnMessage;
    
    let senderName = '';
    if (showSenderName) {
      const sender = conversation?.participantDetails?.find((u) => u.id === item.senderId);
      senderName = sender?.displayName || 'Unknown';
    }

    // Don't show thread replies in main chat
    if (item.threadId) return null;

    const messageReplyCount = threadReplyCounts?.[item.id];
    
    return (
      <MessageBubble
        message={item}
        isOwnMessage={isOwnMessage}
        senderName={senderName}
        showSenderName={showSenderName}
        conversationType={conversation?.type}
        participants={conversation?.participantDetails || []}
        currentUserId={user?.id}
        onLongPress={handleLongPressMessage}
        onOpenThread={handleOpenThread}
        replyCount={typeof messageReplyCount === 'number' ? messageReplyCount : undefined}
      />
    );
  };

  const renderFooter = () => {
    const typingUserNames = typingUsers
      .map((t) => {
        const user = conversation?.participantDetails?.find((u) => u.id === t.userId);
        return user?.displayName || 'Someone';
      })
      .filter(Boolean);

    if (typingUserNames.length === 0) return null;

    return <TypingIndicator userNames={typingUserNames} />;
  };

  if (!conversation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const headerTitle = getHeaderTitle();
  const headerSubtitle = getHeaderSubtitle();
  const headerImage = getHeaderImage();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerInfo}
          onPress={handleHeaderPress}
          disabled={conversation?.type !== ConversationType.GROUP}
          activeOpacity={conversation?.type === ConversationType.GROUP ? 0.7 : 1}
        >
          <View style={styles.avatarContainer}>
            {headerImage ? (
              <CachedImage uri={headerImage} style={styles.avatar} borderRadius={20} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{getInitials(headerTitle)}</Text>
              </View>
            )}
            {otherUserPresence?.status === OnlineStatus.ONLINE && (
              <View style={styles.presenceIndicator}>
                <PresenceIndicator status={OnlineStatus.ONLINE} size={12} />
              </View>
            )}
          </View>

          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {headerTitle}
            </Text>
            {headerSubtitle && (
              <Text style={styles.headerSubtitle}>{headerSubtitle}</Text>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.headerActions} />
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={conversationMessages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id || item.tempId || String(item.timestamp)}
        contentContainerStyle={styles.messagesList}
        inverted={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListFooterComponent={renderFooter}
      />

      {/* Input */}
      <MessageInput
        onSend={handleSendMessage}
        onTyping={handleTyping}
        disabled={sending}
      />

      {/* Message Action Menu */}
      <MessageActionMenu
        visible={showActionMenu}
        message={selectedMessage}
        conversationType={conversation?.type}
        onClose={() => setShowActionMenu(false)}
        onReplyInThread={handleReplyInThread}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  presenceIndicator: {
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 2,
  },
  headerActions: {
    width: 40,
  },
  messagesList: {
    paddingVertical: 12,
  },
});


