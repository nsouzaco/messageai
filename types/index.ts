// Enums
export enum DeliveryStatus {
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
}

export enum OnlineStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
}

export enum ConversationType {
  ONE_ON_ONE = 'one_on_one',
  GROUP = 'group',
}

// User Interface
export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  profilePicture?: string;
  onlineStatus: OnlineStatus;
  lastSeen?: number;
  createdAt: number;
}

// Message Interface
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  timestamp: number;
  deliveryStatus: DeliveryStatus;
  readBy: string[];
  isSynced: boolean;
  tempId?: string; // For optimistic updates
  threadId?: string; // ID of parent message if this is a reply
  replyCount?: number; // Number of replies (only on parent messages)
  hasThread?: boolean; // Quick check if message has replies
  aiPriority?: 'high' | 'medium' | 'low'; // AI-detected priority level
  priorityScore?: number; // Priority score (0-100)
}

// Conversation Interface
export interface Conversation {
  id: string;
  type: ConversationType;
  participants: string[];
  participantDetails?: User[]; // Populated on client side
  name?: string; // For group chats
  groupPicture?: string; // For group chats
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: number;
  };
  lastActivity: number;
  unreadCount: { [userId: string]: number };
  createdAt: number;
  createdBy: string;
}

// Typing Status Interface
export interface TypingStatus {
  userId: string;
  conversationId: string;
  isTyping: boolean;
  timestamp: number;
}

// Presence Interface
export interface Presence {
  userId: string;
  status: OnlineStatus;
  lastSeen: number;
}

// Auth State
export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

// Chat State
export interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: { [conversationId: string]: Message[] };
  loading: boolean;
  error: string | null;
}


