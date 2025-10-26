import {
    addDoc,
    arrayUnion,
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    onSnapshot,
    orderBy,
    query,
    updateDoc,
    where,
    writeBatch
} from 'firebase/firestore';
import { firestore } from '../../firebaseConfig';
import { Conversation, ConversationType, DeliveryStatus, Message, User } from '../../types';

/**
 * Create a new conversation
 */
export const createConversation = async (
  participants: string[],
  type: ConversationType,
  createdBy: string,
  name?: string
): Promise<string> => {
  try {
    const conversation: any = {
      type,
      participants,
      lastActivity: Date.now(),
      unreadCount: {},
      createdAt: Date.now(),
      createdBy,
    };

    // Only include name if it's provided (Firestore doesn't allow undefined values)
    if (name) {
      conversation.name = name;
    }

    // Initialize unread count for all participants
    participants.forEach((participantId) => {
      conversation.unreadCount[participantId] = 0;
    });

    const docRef = await addDoc(collection(firestore, 'conversations'), conversation);
    return docRef.id;
  } catch (error: any) {
    console.error('Error creating conversation:', error);
    throw new Error(error.message || 'Failed to create conversation');
  }
};

/**
 * Get or create a one-on-one conversation
 */
export const getOrCreateConversation = async (
  currentUserId: string,
  otherUserId: string
): Promise<string> => {
  try {
    // Check if conversation already exists
    const q = query(
      collection(firestore, 'conversations'),
      where('type', '==', ConversationType.ONE_ON_ONE),
      where('participants', 'array-contains', currentUserId)
    );

    const snapshot = await getDocs(q);
    
    // Find existing conversation with both users
    const existingConv = snapshot.docs.find((doc) => {
      const data = doc.data();
      return data.participants.includes(otherUserId);
    });

    if (existingConv) {
      return existingConv.id;
    }

    // Create new conversation
    return await createConversation(
      [currentUserId, otherUserId],
      ConversationType.ONE_ON_ONE,
      currentUserId
    );
  } catch (error: any) {
    console.error('Error getting or creating conversation:', error);
    throw new Error(error.message || 'Failed to get or create conversation');
  }
};

/**
 * Listen to user's conversations
 */
export const listenToConversations = (
  userId: string,
  callback: (conversations: Conversation[]) => void
) => {
  // PERFORMANCE: Limit to 20 most recent conversations for faster initial load
  const q = query(
    collection(firestore, 'conversations'),
    where('participants', 'array-contains', userId),
    orderBy('lastActivity', 'desc'),
    limit(20)
  );

  return onSnapshot(q, (snapshot) => {
    const conversations: Conversation[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Conversation[];

    callback(conversations);
  });
};

/**
 * Send a message
 */
export const sendMessage = async (
  conversationId: string,
  text: string,
  senderId: string
): Promise<Message> => {
  try {
    const batch = writeBatch(firestore);
    const timestamp = Date.now();

    // Create message document
    const messageRef = doc(collection(firestore, `conversations/${conversationId}/messages`));
    const message: Omit<Message, 'id'> = {
      conversationId,
      senderId,
      text,
      timestamp,
      deliveryStatus: DeliveryStatus.SENT,
      readBy: [senderId],
      isSynced: true,
    };

    batch.set(messageRef, message);

    // Update conversation's last message and last activity
    const conversationRef = doc(firestore, 'conversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);
    
    if (conversationSnap.exists()) {
      const conversationData = conversationSnap.data();
      const unreadCount = { ...conversationData.unreadCount };
      
      // Increment unread count for all participants except sender
      conversationData.participants.forEach((participantId: string) => {
        if (participantId !== senderId) {
          unreadCount[participantId] = (unreadCount[participantId] || 0) + 1;
        }
      });

      batch.update(conversationRef, {
        lastMessage: {
          text,
          senderId,
          timestamp,
        },
        lastActivity: timestamp,
        unreadCount,
      });
    }

    await batch.commit();

    return {
      id: messageRef.id,
      ...message,
    };
  } catch (error: any) {
    console.error('Error sending message:', error);
    throw new Error(error.message || 'Failed to send message');
  }
};

/**
 * Listen to messages in a conversation
 */
export const listenToMessages = (
  conversationId: string,
  callback: (messages: Message[]) => void
) => {
  const q = query(
    collection(firestore, `conversations/${conversationId}/messages`),
    orderBy('timestamp', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const messages: Message[] = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      // Filter out thread replies - only show top-level messages
      .filter((msg: Message) => !msg.threadId) as Message[];

    callback(messages);
  });
};

/**
 * Mark messages as read
 */
export const markMessagesAsRead = async (
  conversationId: string,
  userId: string
): Promise<void> => {
  try {
    const batch = writeBatch(firestore);

    // Get conversation to know the participants
    const conversationRef = doc(firestore, 'conversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);
    
    if (!conversationSnap.exists()) {
      throw new Error('Conversation not found');
    }

    const conversation = conversationSnap.data() as Conversation;
    const participants = conversation.participants;

    // Get all unread messages
    const q = query(collection(firestore, `conversations/${conversationId}/messages`));
    const snapshot = await getDocs(q);

    snapshot.docs.forEach((doc) => {
      const message = doc.data() as Message;
      if (!message.readBy.includes(userId)) {
        // Add user to readBy array
        const newReadBy = [...message.readBy, userId];
        
        // Check if ALL participants (except sender) have now read the message
        const otherParticipants = participants.filter(
          (p: string) => p !== message.senderId
        );
        const allRead = otherParticipants.every((p: string) => newReadBy.includes(p));
        
        // Only set to READ if all participants have read
        const newStatus = allRead ? DeliveryStatus.READ : DeliveryStatus.SENT;

        batch.update(doc.ref, {
          readBy: arrayUnion(userId),
          deliveryStatus: newStatus,
        });
      }
    });

    // Reset unread count for this user
    batch.update(conversationRef, {
      [`unreadCount.${userId}`]: 0,
    });

    await batch.commit();
  } catch (error: any) {
    console.error('Error marking messages as read:', error);
    throw new Error(error.message || 'Failed to mark messages as read');
  }
};

/**
 * Update message delivery status
 */
export const updateMessageStatus = async (
  conversationId: string,
  messageId: string,
  status: DeliveryStatus
): Promise<void> => {
  try {
    const messageRef = doc(firestore, `conversations/${conversationId}/messages`, messageId);
    await updateDoc(messageRef, {
      deliveryStatus: status,
    });
  } catch (error: any) {
    console.error('Error updating message status:', error);
    throw new Error(error.message || 'Failed to update message status');
  }
};

/**
 * Get all users (for creating conversations)
 */
export const getAllUsers = async (currentUserId: string): Promise<User[]> => {
  try {
    const snapshot = await getDocs(collection(firestore, 'users'));
    const users: User[] = [];

    snapshot.docs.forEach((doc) => {
      if (doc.id !== currentUserId) {
        users.push({ id: doc.id, ...doc.data() } as User);
      }
    });

    return users;
  } catch (error: any) {
    console.error('Error getting all users:', error);
    throw new Error(error.message || 'Failed to get users');
  }
};

/**
 * Get user by ID
 */
export const getUserById = async (userId: string): Promise<User | null> => {
  try {
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    
    if (!userDoc.exists()) {
      return null;
    }

    return { id: userDoc.id, ...userDoc.data() } as User;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
};

/**
 * Get multiple users by IDs
 */
export const getUsersByIds = async (userIds: string[]): Promise<User[]> => {
  try {
    const users: User[] = [];
    
    for (const userId of userIds) {
      const user = await getUserById(userId);
      if (user) {
        users.push(user);
      }
    }

    return users;
  } catch (error) {
    console.error('Error getting users by IDs:', error);
    return [];
  }
};

/**
 * Send a threaded reply to a message
 */
export const sendThreadReply = async (
  conversationId: string,
  parentMessageId: string,
  text: string,
  senderId: string
): Promise<string> => {
  try {
    // Create the thread reply message
    const threadMessage: Omit<Message, 'id'> = {
      conversationId,
      senderId,
      text,
      timestamp: Date.now(),
      deliveryStatus: DeliveryStatus.SENT,
      readBy: [senderId],
      isSynced: true,
      threadId: parentMessageId, // Link to parent message
    };

    const messagesRef = collection(firestore, `conversations/${conversationId}/messages`);
    const newMessageRef = await addDoc(messagesRef, threadMessage);

    // Mark parent as having a thread
    const parentMessageRef = doc(firestore, `conversations/${conversationId}/messages/${parentMessageId}`);
    await updateDoc(parentMessageRef, {
      hasThread: true,
    });

    return newMessageRef.id;
  } catch (error: any) {
    console.error('Error sending thread reply:', error);
    throw new Error(error.message || 'Failed to send thread reply');
  }
};

/**
 * Listen to thread replies for a specific message
 */
export const listenToThreadReplies = (
  conversationId: string,
  parentMessageId: string,
  callback: (replies: Message[], replyCount: number) => void
) => {
  const messagesRef = collection(firestore, `conversations/${conversationId}/messages`);
  const q = query(
    messagesRef,
    where('threadId', '==', parentMessageId),
    orderBy('timestamp', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const replies: Message[] = [];
    snapshot.forEach((doc) => {
      replies.push({ id: doc.id, ...doc.data() } as Message);
    });
    
    // Pass both replies and the actual count
    callback(replies, replies.length);
  });
};

/**
 * Get the reply count for a message by querying actual replies
 */
export const getReplyCount = async (
  conversationId: string,
  parentMessageId: string
): Promise<number> => {
  try {
    const messagesRef = collection(firestore, `conversations/${conversationId}/messages`);
    const q = query(
      messagesRef,
      where('threadId', '==', parentMessageId)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('Error getting reply count:', error);
    return 0;
  }
};

/**
 * Get parent message details
 */
export const getParentMessage = async (
  conversationId: string,
  messageId: string
): Promise<Message | null> => {
  try {
    const messageRef = doc(firestore, `conversations/${conversationId}/messages/${messageId}`);
    const messageDoc = await getDoc(messageRef);
    
    if (messageDoc.exists()) {
      return { id: messageDoc.id, ...messageDoc.data() } as Message;
    }
    return null;
  } catch (error) {
    console.error('Error getting parent message:', error);
    return null;
  }
};


