import CachedImage from '@/components/CachedImage';
import MessageActionMenu from '@/components/MessageActionMenu';
import MessageBubble from '@/components/MessageBubble';
import MessageInput from '@/components/MessageInput';
import PresenceIndicator from '@/components/PresenceIndicator';
import TypingIndicator from '@/components/TypingIndicator';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { listenToTyping, listenToUserPresence, setUserTyping } from '@/services/firebase/realtimeDb';
import { uploadAudioMessage, uploadImageMessage } from '@/services/firebase/storage';
import { ConversationType, Message, MessageType, OnlineStatus, Presence, TypingStatus } from '@/types';
import { getInitials } from '@/utils/helpers';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
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

  const handleAttachment = async () => {
    if (Platform.OS === 'ios') {
      Alert.alert(
        'Add Attachment',
        'Choose an option',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Take Photo', onPress: handleTakePhoto },
          { text: 'Choose from Library', onPress: handlePickImage },
        ]
      );
    } else {
      Alert.alert(
        'Add Attachment',
        'Choose an option',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Take Photo', onPress: handleTakePhoto },
          { text: 'Choose from Library', onPress: handlePickImage },
        ]
      );
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0] && user) {
      await handleSendImage(result.assets[0].uri);
    }
  };

  const handlePickImage = async () => {
    const { status} = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library permission is required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0] && user) {
      await handleSendImage(result.assets[0].uri);
    }
  };

  const handleSendImage = async (imageUri: string) => {
    if (!user) return;

    setSending(true);
    try {
      // Upload image to Firebase Storage
      const imageUrl = await uploadImageMessage(conversationId, user.id, imageUri);
      
      // Send message with image URL
      await sendMessage(conversationId, '', {
        messageType: MessageType.IMAGE,
        imageUrl,
      });

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending image:', error);
      Alert.alert('Error', 'Failed to send image. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleVoiceMessage = async () => {
    if (isRecording) {
      // Stop recording
      await stopRecording();
    } else {
      // Start recording
      await startRecording();
    }
  };

  const startRecording = async () => {
    try {
      // Request permission
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Microphone permission is required to record voice messages');
        return;
      }

      // Set audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      
      // Get duration before stopping
      const status = await recording.getStatusAsync();
      const durationSeconds = status.durationMillis / 1000;
      
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recording.getURI();
      setRecording(null);

      if (uri && user) {
        await handleSendAudio(uri, durationSeconds);
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to stop recording');
    }
  };

  const handleSendAudio = async (audioUri: string, durationSeconds: number) => {
    if (!user) return;

    setSending(true);
    try {
      // Upload audio to Firebase Storage
      const audioUrl = await uploadAudioMessage(conversationId, user.id, audioUri);
      
      // Send message with audio URL
      await sendMessage(conversationId, '', {
        messageType: MessageType.AUDIO,
        audioUrl,
        audioDuration: durationSeconds,
      });

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending audio:', error);
      Alert.alert('Error', 'Failed to send voice message. Please try again.');
    } finally {
      setSending(false);
    }
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
    <LinearGradient
      colors={['#FFF5F7', '#F5E6FF', '#FFFFFF']}
      style={styles.container}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <BlurView intensity={80} tint="light" style={styles.headerBlur}>
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
        </BlurView>

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
      />

      {/* Typing Indicator - positioned between messages and input */}
      {renderFooter()}

      {/* Input with Plus and Microphone Buttons */}
      <View style={styles.inputRow}>
        <TouchableOpacity
          style={styles.plusButton}
          onPress={handleAttachment}
          disabled={sending}
        >
          <Ionicons name="add-circle" size={36} color="#007AFF" />
        </TouchableOpacity>
        <View style={styles.inputWrapper}>
          <MessageInput
            onSend={handleSendMessage}
            onTyping={handleTyping}
            disabled={sending}
          />
        </View>
        <TouchableOpacity
          style={[styles.micButton, isRecording && styles.micButtonRecording]}
          onPress={handleVoiceMessage}
          disabled={sending}
        >
          <Ionicons 
            name={isRecording ? "stop-circle" : "mic"} 
            size={28} 
            color={isRecording ? "#FF3B30" : "#007AFF"} 
          />
        </TouchableOpacity>
      </View>

      {/* Message Action Menu */}
        <MessageActionMenu
          visible={showActionMenu}
          message={selectedMessage}
          conversationType={conversation?.type}
          onClose={() => setShowActionMenu(false)}
          onReplyInThread={handleReplyInThread}
        />
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  headerBlur: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
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
    backgroundColor: 'transparent',
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: 'transparent',
  },
  plusButton: {
    paddingRight: 4,
  },
  micButton: {
    paddingLeft: 4,
  },
  micButtonRecording: {
    opacity: 0.8,
  },
  inputWrapper: {
    flex: 1,
  },
});


