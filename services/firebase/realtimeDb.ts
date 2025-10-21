import {
    get,
    onDisconnect,
    onValue,
    ref,
    remove,
    set
} from 'firebase/database';
import { realtimeDb } from '../../firebaseConfig';
import { OnlineStatus, Presence, TypingStatus } from '../../types';

/**
 * Set user online status
 */
export const setUserOnline = async (userId: string): Promise<void> => {
  try {
    const presenceRef = ref(realtimeDb, `presence/${userId}`);
    const presence: Presence = {
      userId,
      status: OnlineStatus.ONLINE,
      lastSeen: Date.now(),
    };

    await set(presenceRef, presence);

    // Set up disconnect handler to mark user offline
    const disconnectRef = onDisconnect(presenceRef);
    await disconnectRef.set({
      userId,
      status: OnlineStatus.OFFLINE,
      lastSeen: Date.now(),
    });
  } catch (error) {
    console.error('Error setting user online:', error);
  }
};

/**
 * Set user offline status
 */
export const setUserOffline = async (userId: string): Promise<void> => {
  try {
    const presenceRef = ref(realtimeDb, `presence/${userId}`);
    await set(presenceRef, {
      userId,
      status: OnlineStatus.OFFLINE,
      lastSeen: Date.now(),
    });
  } catch (error) {
    console.error('Error setting user offline:', error);
  }
};

/**
 * Listen to user presence
 */
export const listenToUserPresence = (
  userId: string,
  callback: (presence: Presence | null) => void
) => {
  const presenceRef = ref(realtimeDb, `presence/${userId}`);
  
  return onValue(presenceRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val() as Presence);
    } else {
      callback(null);
    }
  });
};

/**
 * Listen to multiple users' presence
 */
export const listenToMultiplePresence = (
  userIds: string[],
  callback: (presenceMap: { [userId: string]: Presence }) => void
) => {
  const unsubscribers: (() => void)[] = [];
  const presenceMap: { [userId: string]: Presence } = {};

  userIds.forEach((userId) => {
    const unsubscribe = listenToUserPresence(userId, (presence) => {
      if (presence) {
        presenceMap[userId] = presence;
      } else {
        delete presenceMap[userId];
      }
      callback({ ...presenceMap });
    });
    unsubscribers.push(unsubscribe);
  });

  // Return cleanup function
  return () => {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  };
};

/**
 * Set user typing status
 */
export const setUserTyping = async (
  conversationId: string,
  userId: string,
  isTyping: boolean
): Promise<void> => {
  try {
    const typingRef = ref(realtimeDb, `typing/${conversationId}/${userId}`);
    
    if (isTyping) {
      const typingStatus: TypingStatus = {
        userId,
        conversationId,
        isTyping: true,
        timestamp: Date.now(),
      };
      await set(typingRef, typingStatus);

      // Auto-clear after 5 seconds of inactivity
      const disconnectRef = onDisconnect(typingRef);
      await disconnectRef.remove();
    } else {
      await remove(typingRef);
    }
  } catch (error) {
    console.error('Error setting typing status:', error);
  }
};

/**
 * Listen to typing indicators in a conversation
 */
export const listenToTyping = (
  conversationId: string,
  currentUserId: string,
  callback: (typingUsers: TypingStatus[]) => void
) => {
  const typingRef = ref(realtimeDb, `typing/${conversationId}`);
  
  return onValue(typingRef, (snapshot) => {
    const typingUsers: TypingStatus[] = [];
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      Object.keys(data).forEach((userId) => {
        // Don't include current user
        if (userId !== currentUserId) {
          const typingStatus = data[userId] as TypingStatus;
          // Check if typing status is recent (within 5 seconds)
          if (Date.now() - typingStatus.timestamp < 5000) {
            typingUsers.push(typingStatus);
          }
        }
      });
    }
    
    callback(typingUsers);
  });
};

/**
 * Clear typing status for a user
 */
export const clearTypingStatus = async (
  conversationId: string,
  userId: string
): Promise<void> => {
  try {
    const typingRef = ref(realtimeDb, `typing/${conversationId}/${userId}`);
    await remove(typingRef);
  } catch (error) {
    console.error('Error clearing typing status:', error);
  }
};

/**
 * Get user presence once (no listener)
 */
export const getUserPresence = async (userId: string): Promise<Presence | null> => {
  try {
    const presenceRef = ref(realtimeDb, `presence/${userId}`);
    const snapshot = await get(presenceRef);
    
    if (snapshot.exists()) {
      return snapshot.val() as Presence;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user presence:', error);
    return null;
  }
};


