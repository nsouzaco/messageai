import React, { createContext, ReactNode, useContext, useEffect, useReducer } from 'react';
import {
  markMessagesAsRead as firebaseMarkAsRead,
  sendMessage as firebaseSendMessage,
  getUsersByIds,
  listenToConversations,
  listenToMessages,
} from '../services/firebase/firestore';
import { ChatState, Conversation, DeliveryStatus, Message } from '../types';
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
  | { type: 'CLEAR_CHAT_STATE' };

// Initial state
const initialState: ChatState = {
  conversations: [],
  activeConversationId: null,
  messages: {},
  loading: false,
  error: null,
};

// Reducer
const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
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
    case 'CLEAR_CHAT_STATE':
      return initialState;
    default:
      return state;
  }
};

// Context type
interface ChatContextType extends ChatState {
  setActiveConversation: (conversationId: string | null) => void;
  sendMessage: (conversationId: string, text: string) => Promise<void>;
  markMessagesAsRead: (conversationId: string) => Promise<void>;
  refreshConversations: () => void;
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
        // Enrich conversations with participant details
        const enrichedConversations = await Promise.all(
          conversations.map(async (conversation) => {
            const participantDetails = await getUsersByIds(conversation.participants);
            return {
              ...conversation,
              participantDetails,
            };
          })
        );

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
  const sendMessage = async (conversationId: string, text: string) => {
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
    };

    // Add optimistic message to UI immediately
    dispatch({ type: 'ADD_OPTIMISTIC_MESSAGE', payload: optimisticMessage });

    try {
      // Send to Firebase
      const sentMessage = await firebaseSendMessage(conversationId, text, user.id);

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

  const value: ChatContextType = {
    ...state,
    setActiveConversation,
    sendMessage,
    markMessagesAsRead,
    refreshConversations,
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


