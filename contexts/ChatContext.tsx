import React, { createContext, ReactNode, useContext, useEffect, useReducer, useRef } from 'react';
import {
    markMessagesAsRead as firebaseMarkAsRead,
    sendMessage as firebaseSendMessage,
    sendThreadReply as firebaseSendThreadReply,
    getUsersByIds,
    listenToConversations,
    listenToMessages,
    listenToThreadReplies,
} from '../services/firebase/firestore';
import { ChatState, Conversation, DeliveryStatus, Message, MessageType } from '../types';
import { generateTempId } from '../utils/helpers';
import { useAuth } from './AuthContext';

// Action types
type ChatAction =
  | { type: 'CHAT_LOADING' }
  | { type: 'CHAT_ERROR'; payload: string }
  | { type: 'SET_CONVERSATIONS'; payload: Conversation[] }
  | { type: 'SET_ACTIVE_CONVERSATION'; payload: string | null }
  | { type: 'SET_MESSAGES'; payload: { conversationId: string; messages: Message[] } }
  | { type: 'ADD_OPTIMISTIC_MESSAGE'; payload: Message }
  | { type: 'UPDATE_MESSAGE'; payload: { conversationId: string; message: Message } }
  | { type: 'SET_THREAD_MESSAGES'; payload: { parentMessageId: string; messages: Message[]; replyCount: number } }
  | { type: 'ADD_THREAD_MESSAGE'; payload: { parentMessageId: string; message: Message } }
  | { type: 'CLEAR_CHAT_STATE' };

// Extended ChatState with thread support
interface ExtendedChatState extends ChatState {
  threadMessages: { [parentMessageId: string]: Message[] };
  threadReplyCounts: { [parentMessageId: string]: number };
}

// Initial state
const initialState: ExtendedChatState = {
  conversations: [],
  activeConversationId: null,
  messages: {},
  threadMessages: {},
  threadReplyCounts: {},
  loading: false,
  error: null,
};

// Reducer
const chatReducer = (state: ExtendedChatState, action: ChatAction): ExtendedChatState => {
  switch (action.type) {
    case 'CHAT_LOADING':
      return { ...state, loading: true, error: null };
    case 'CHAT_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'SET_CONVERSATIONS':
      return { ...state, conversations: action.payload, loading: false };
    case 'SET_ACTIVE_CONVERSATION':
      return { ...state, activeConversationId: action.payload };
    case 'SET_MESSAGES':
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.conversationId]: action.payload.messages,
        },
        loading: false,
      };
    case 'ADD_OPTIMISTIC_MESSAGE': {
      const conversationId = action.payload.conversationId;
      const existingMessages = state.messages[conversationId] || [];
      return {
        ...state,
        messages: {
          ...state.messages,
          [conversationId]: [...existingMessages, action.payload],
        },
      };
    }
    case 'UPDATE_MESSAGE': {
      const { conversationId, message } = action.payload;
      const existingMessages = state.messages[conversationId] || [];
      const updatedMessages = existingMessages.map((msg) =>
        msg.id === message.id || msg.tempId === message.tempId ? message : msg
      );
      return {
        ...state,
        messages: {
          ...state.messages,
          [conversationId]: updatedMessages,
        },
      };
    }
    case 'SET_THREAD_MESSAGES':
      return {
        ...state,
        threadMessages: {
          ...state.threadMessages,
          [action.payload.parentMessageId]: action.payload.messages,
        },
        threadReplyCounts: {
          ...state.threadReplyCounts,
          [action.payload.parentMessageId]: action.payload.replyCount,
        },
      };
    case 'ADD_THREAD_MESSAGE': {
      const { parentMessageId, message } = action.payload;
      const existingThreadMessages = state.threadMessages[parentMessageId] || [];
      return {
        ...state,
        threadMessages: {
          ...state.threadMessages,
          [parentMessageId]: [...existingThreadMessages, message],
        },
      };
    }
    case 'CLEAR_CHAT_STATE':
      return initialState;
    default:
      return state;
  }
};

// Context type
interface ChatContextType extends ExtendedChatState {
  setActiveConversation: (conversationId: string | null) => void;
  sendMessage: (
    conversationId: string,
    text: string,
    options?: {
      messageType?: MessageType;
      imageUrl?: string;
      audioUrl?: string;
      audioDuration?: number;
    }
  ) => Promise<void>;
  markMessagesAsRead: (conversationId: string) => Promise<void>;
  refreshConversations: () => void;
  sendThreadReply: (conversationId: string, parentMessageId: string, text: string) => Promise<void>;
  listenToThread: (conversationId: string, parentMessageId: string) => void;
}

// Create context
const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Provider props
interface ChatProviderProps {
  children: ReactNode;
}

// Provider component
export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const { user, isAuthenticated } = useAuth();
  const threadListeners = useRef<{ [key: string]: () => void }>({});

  // Listen to conversations
  useEffect(() => {
    if (!user || !isAuthenticated) {
      dispatch({ type: 'CLEAR_CHAT_STATE' });
      return;
    }

    dispatch({ type: 'CHAT_LOADING' });

    let unsubscribe: (() => void) | undefined;

    try {
      unsubscribe = listenToConversations(user.id, async (conversations) => {
        // OPTIMIZATION: Show conversations immediately without participant details
        dispatch({ type: 'SET_CONVERSATIONS', payload: conversations.map(c => ({...c, participantDetails: []})) });
        
        // Lazy load participant details in the background
        const enrichedConversations = await Promise.all(
          conversations.map(async (conversation) => {
            try {
              const participantDetails = await getUsersByIds(conversation.participants);
              return {
                ...conversation,
                participantDetails,
              };
            } catch (error) {
              console.error('Error enriching conversation:', error);
              return conversation;
            }
          })
        );

        // Update with enriched data
        dispatch({ type: 'SET_CONVERSATIONS', payload: enrichedConversations });
      });
    } catch (error) {
      console.error('Error setting up conversation listener:', error);
      dispatch({ type: 'CLEAR_CHAT_STATE' });
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, isAuthenticated]);

  // Listen to messages for active conversation
  useEffect(() => {
    if (!state.activeConversationId || !user || !isAuthenticated) return;

    let unsubscribe: (() => void) | undefined;

    try {
      unsubscribe = listenToMessages(state.activeConversationId, (messages) => {
        dispatch({
          type: 'SET_MESSAGES',
          payload: { conversationId: state.activeConversationId!, messages },
        });
      });
    } catch (error) {
      console.error('Error setting up message listener:', error);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [state.activeConversationId, user, isAuthenticated]);

  // Set active conversation
  const setActiveConversation = (conversationId: string | null) => {
    dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: conversationId });
  };

  // Send message with optimistic UI
  const sendMessage = async (
    conversationId: string,
    text: string,
    options?: {
      messageType?: MessageType;
      imageUrl?: string;
      audioUrl?: string;
      audioDuration?: number;
    }
  ) => {
    if (!user) throw new Error('No user logged in');

    const tempId = generateTempId();
    const timestamp = Date.now();

    // Create optimistic message
    const optimisticMessage: Message = {
      id: tempId,
      tempId,
      conversationId,
      senderId: user.id,
      text,
      timestamp,
      deliveryStatus: DeliveryStatus.SENDING,
      readBy: [user.id],
      isSynced: false,
      // Only include optional fields if they're defined
      ...(options?.messageType && { messageType: options.messageType }),
      ...(options?.imageUrl && { imageUrl: options.imageUrl }),
      ...(options?.audioUrl && { audioUrl: options.audioUrl }),
      ...(options?.audioDuration !== undefined && { audioDuration: options.audioDuration }),
    };

    // Add optimistic message to UI immediately
    dispatch({ type: 'ADD_OPTIMISTIC_MESSAGE', payload: optimisticMessage });

    try {
      // Send to Firebase
      const sentMessage = await firebaseSendMessage(conversationId, text, user.id, options);

      // Update with real message
      dispatch({
        type: 'UPDATE_MESSAGE',
        payload: {
          conversationId,
          message: { ...sentMessage, tempId },
        },
      });
    } catch (error: any) {
      // Update message to show error
      dispatch({
        type: 'UPDATE_MESSAGE',
        payload: {
          conversationId,
          message: {
            ...optimisticMessage,
            deliveryStatus: DeliveryStatus.SENDING,
            isSynced: false,
          },
        },
      });
      dispatch({ type: 'CHAT_ERROR', payload: error.message });
      throw error;
    }
  };

  // Mark messages as read
  const markMessagesAsRead = async (conversationId: string) => {
    if (!user) return;

    try {
      await firebaseMarkAsRead(conversationId, user.id);
    } catch (error: any) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Refresh conversations
  const refreshConversations = () => {
    // The listener will automatically refresh
    // This is mainly for pull-to-refresh functionality
  };

  // Send thread reply
  const sendThreadReply = async (
    conversationId: string,
    parentMessageId: string,
    text: string
  ) => {
    if (!user) throw new Error('No user logged in');

    try {
      await firebaseSendThreadReply(conversationId, parentMessageId, text, user.id);
    } catch (error: any) {
      console.error('Error sending thread reply:', error);
      dispatch({ type: 'CHAT_ERROR', payload: error.message });
      throw error;
    }
  };

  // Listen to thread replies
  const listenToThread = (conversationId: string, parentMessageId: string) => {
    const listenerKey = `${conversationId}_${parentMessageId}`;

    // Clean up existing listener if any
    if (threadListeners.current[listenerKey]) {
      threadListeners.current[listenerKey]();
    }

    // Set up new listener
    const unsubscribe = listenToThreadReplies(conversationId, parentMessageId, (replies, replyCount) => {
      dispatch({
        type: 'SET_THREAD_MESSAGES',
        payload: { parentMessageId, messages: replies, replyCount },
      });
    });

    threadListeners.current[listenerKey] = unsubscribe;
  };

  // Clean up thread listeners on unmount
  useEffect(() => {
    return () => {
      Object.values(threadListeners.current).forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  const value: ChatContextType = {
    ...state,
    setActiveConversation,
    sendMessage,
    markMessagesAsRead,
    refreshConversations,
    sendThreadReply,
    listenToThread,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

// Custom hook to use chat context
export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};


