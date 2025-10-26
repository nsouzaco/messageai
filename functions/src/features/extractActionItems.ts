/**
 * Action Item Extraction Cloud Function
 * Auto-detect and extract action items from conversations
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { generateChatCompletion } from '../ai/openai';
import { buildActionItemPrompt } from '../ai/prompts';
import { verifyConversationAccess } from '../shared/auth';
import { logError, logInfo, startTimer } from '../shared/logger';
import { checkRateLimit, RATE_LIMITS } from '../shared/ratelimit';

// Keywords that suggest action items (for optimization)
const ACTION_KEYWORDS = [
  'send', 'create', 'update', 'review', 'check', 'schedule', 'meeting',
  'deadline', 'by', 'need to', 'should', 'must', 'have to', 'can you',
  'please', 'remind', 'follow up', 'tomorrow', 'today', 'this week',
  'next', 'before', 'after', 'asap', 'urgent',
];

interface ExtractActionItemsRequest {
  conversationId: string;
  threadId?: string;
  messageLimit?: number;
}

interface ActionItem {
  id: string;
  conversationId: string;
  threadId?: string;
  text: string;
  assignee?: string;
  dueDate?: number;
  completed: boolean;
  extractedFrom: string;
  confidence: number;
  createdAt: number;
}

interface ExtractActionItemsResponse {
  actionItems: ActionItem[];
  count: number;
}

/**
 * Extract action items from recent messages
 */
export const extractActionItems = functions.https.onCall(
  async (
    data: ExtractActionItemsRequest,
    context: functions.https.CallableContext
  ): Promise<ExtractActionItemsResponse> => {
    const timer = startTimer();

    try {
      // Authenticate user
      if (!context.auth) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'User must be authenticated'
        );
      }

      const userId = context.auth.uid;
      const { conversationId, threadId, messageLimit } = data;
      
      // Ensure messageLimit is a valid integer
      const limit = messageLimit && typeof messageLimit === 'number' ? messageLimit : 20;

      logInfo('Action item extraction requested', {
        userId,
        conversationId,
        threadId,
        messageLimit: limit,
      });

      // Validate input
      if (!conversationId) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'conversationId is required'
        );
      }

      // Verify access
      await verifyConversationAccess(userId, conversationId);

      // Check rate limit
      await checkRateLimit(userId, 'extractActionItems', RATE_LIMITS.EXTRACT_ACTION_ITEMS);

      // Fetch recent messages
      const db = admin.firestore();
      let messagesQuery = db
        .collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .orderBy('timestamp', 'desc')
        .limit(limit);

      if (threadId) {
        messagesQuery = messagesQuery.where('threadId', '==', threadId);
      }

      const messagesSnapshot = await messagesQuery.get();

      logInfo('Messages fetched for action item extraction', {
        conversationId,
        totalFetched: messagesSnapshot.docs.length,
        isEmpty: messagesSnapshot.empty,
      });

      if (messagesSnapshot.empty) {
        logInfo('No messages found, returning empty results', { conversationId });
        return { actionItems: [], count: 0 };
      }

      // Filter out thread replies (where threadId exists) if not looking at a specific thread
      const mainMessages = threadId 
        ? messagesSnapshot.docs 
        : messagesSnapshot.docs.filter(doc => !doc.data().threadId);

      logInfo('Messages filtered', {
        conversationId,
        mainMessages: mainMessages.length,
        threadId: threadId || null,
      });

      if (mainMessages.length === 0) {
        logInfo('No main messages after filtering, returning empty results', { conversationId });
        return { actionItems: [], count: 0 };
      }

      // Get user details for sender names
      const senderIds = [...new Set(mainMessages.map((doc) => doc.data().senderId))];
      const usersSnapshot = await db
        .collection('users')
        .where(admin.firestore.FieldPath.documentId(), 'in', senderIds.slice(0, 10))
        .get();

      const users = new Map<string, any>();
      usersSnapshot.docs.forEach((doc) => {
        users.set(doc.id, doc.data());
      });

      // Format messages for prompt
      const messages = mainMessages
        .reverse()
        .map((doc) => {
          const data = doc.data();
          const user = users.get(data.senderId);
          return {
            senderId: data.senderId,
            senderName: user?.displayName || 'Unknown',
            text: data.text,
            timestamp: data.timestamp,
          };
        });

      // Build prompt
      const prompt = buildActionItemPrompt(messages);

      // Extract action items with GPT-3.5
      const responseText = await generateChatCompletion(prompt, {
        model: 'gpt-3.5-turbo',
        temperature: 0.3,
        maxTokens: 800,
      });

      // Parse JSON response (strip markdown code blocks if present)
      let extractedItems: any[] = [];
      try {
        let cleanedResponse = responseText.trim();
        
        // Remove markdown code blocks if present
        if (cleanedResponse.startsWith('```')) {
          cleanedResponse = cleanedResponse.replace(/^```(?:json)?\n?/, '');
          cleanedResponse = cleanedResponse.replace(/\n?```$/, '');
        }
        
        extractedItems = JSON.parse(cleanedResponse);
      } catch (parseError) {
        logError('Failed to parse action items JSON', parseError, {
          userId,
          conversationId,
          response: responseText,
        });
        return { actionItems: [], count: 0 };
      }

      // Store action items in Firestore
      const actionItems: ActionItem[] = [];
      const batch = db.batch();

      for (const item of extractedItems) {
        if (item.confidence < 0.6) {
          // Skip low confidence items
          continue;
        }

        const actionItemRef = db.collection('actionItems').doc();
        const actionItem: any = {
          id: actionItemRef.id,
          conversationId,
          text: item.task,
          completed: false,
          extractedFrom: conversationId,
          confidence: item.confidence,
          createdAt: Date.now(),
        };

        // Only add optional fields if they have values
        if (threadId) {
          actionItem.threadId = threadId;
        }
        if (item.assignee) {
          actionItem.assignee = item.assignee;
        }
        if (item.deadline) {
          const parsedDate = Date.parse(item.deadline);
          if (!isNaN(parsedDate)) {
            actionItem.dueDate = parsedDate;
          }
        }

        batch.set(actionItemRef, actionItem);
        actionItems.push(actionItem as ActionItem);
      }

      await batch.commit();

      timer.end('extractActionItems', { userId, count: actionItems.length });

      return {
        actionItems,
        count: actionItems.length,
      };
    } catch (error: any) {
      logError('Action item extraction failed', error, {
        userId: context.auth?.uid,
        conversationId: data.conversationId,
      });

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError('internal', 'Failed to extract action items');
    }
  }
);

/**
 * Auto-extract action items from new messages
 * Triggers on message creation
 */
export const autoExtractActionItems = functions.firestore
  .document('conversations/{conversationId}/messages/{messageId}')
  .onCreate(async (snapshot, context) => {
    const timer = startTimer();

    try {
      const messageData = snapshot.data();
      const { conversationId, messageId } = context.params;

      // Skip if message is in a thread (only analyze main conversation)
      if (messageData.threadId) {
        logInfo('Skipping action item extraction for thread message', { messageId });
        return;
      }

      // Check if message contains action keywords (optimization to reduce API calls)
      const messageText = messageData.text?.toLowerCase() || '';
      const hasActionKeyword = ACTION_KEYWORDS.some(keyword =>
        messageText.includes(keyword)
      );

      if (!hasActionKeyword) {
        logInfo('No action keywords found, skipping', { messageId });
        return;
      }

      logInfo('Action keyword detected, analyzing messages', {
        conversationId,
        messageId,
      });

      // Fetch last 10 messages for context
      const db = admin.firestore();

      const messagesSnapshot = await db
        .collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .orderBy('timestamp', 'desc')
        .limit(10)
        .get();

      // Filter out thread replies
      const mainMessages = messagesSnapshot.docs.filter(doc => !doc.data().threadId);

      logInfo('Messages fetched for auto-extraction', {
        conversationId,
        totalFetched: messagesSnapshot.docs.length,
        mainMessages: mainMessages.length,
      });

      if (mainMessages.length === 0) {
        logInfo('No main messages found, skipping', { conversationId });
        return;
      }

      // Get user details for sender names
      const senderIds = [...new Set(mainMessages.map((doc) => doc.data().senderId))];
      const usersSnapshot = await db
        .collection('users')
        .where(admin.firestore.FieldPath.documentId(), 'in', senderIds.slice(0, 10))
        .get();

      const users = new Map<string, any>();
      usersSnapshot.docs.forEach((doc) => {
        users.set(doc.id, doc.data());
      });

      // Format messages for prompt (take up to 10 most recent)
      const messages = mainMessages
        .slice(0, 10)
        .reverse()
        .map((doc) => {
          const data = doc.data();
          const user = users.get(data.senderId);
          return {
            senderId: data.senderId,
            senderName: user?.displayName || 'Unknown',
            text: data.text,
            timestamp: data.timestamp,
          };
        });

      // Build prompt
      const prompt = buildActionItemPrompt(messages);

      // Extract action items with GPT-3.5
      const responseText = await generateChatCompletion(prompt, {
        model: 'gpt-3.5-turbo',
        temperature: 0.3,
        maxTokens: 800,
      });

      // Parse JSON response (strip markdown code blocks if present)
      let extractedItems: any[] = [];
      try {
        let cleanedResponse = responseText.trim();
        
        // Remove markdown code blocks if present
        if (cleanedResponse.startsWith('```')) {
          cleanedResponse = cleanedResponse.replace(/^```(?:json)?\n?/, '');
          cleanedResponse = cleanedResponse.replace(/\n?```$/, '');
        }
        
        extractedItems = JSON.parse(cleanedResponse);
        logInfo('Action items AI response parsed', {
          conversationId,
          messageId,
          extractedCount: extractedItems.length,
        });
      } catch (parseError) {
        logError('Failed to parse action items JSON in auto-extract', parseError, {
          conversationId,
          messageId,
          response: responseText,
        });
        return;
      }

      if (extractedItems.length === 0) {
        logInfo('No action items found in auto-extraction', { conversationId });
        return;
      }

      // Store action items in Firestore
      const batch = db.batch();
      const actionItems: ActionItem[] = [];

      for (const item of extractedItems) {
        // Skip low-confidence items
        if (item.confidence < 0.5) {
          continue;
        }

        const actionItemRef = db.collection('actionItems').doc();
        const actionItem: any = {
          id: actionItemRef.id,
          conversationId,
          text: item.task,
          completed: false,
          extractedFrom: conversationId,
          confidence: item.confidence,
          createdAt: Date.now(),
        };

        // Only add optional fields if they have values
        if (item.assignee) {
          actionItem.assignee = item.assignee;
        }
        if (item.deadline) {
          const parsedDate = Date.parse(item.deadline);
          if (!isNaN(parsedDate)) {
            actionItem.dueDate = parsedDate;
          }
        }

        batch.set(actionItemRef, actionItem);
        actionItems.push(actionItem as ActionItem);
      }

      await batch.commit();

      logInfo('Auto-extracted action items stored', {
        conversationId,
        messageId,
        count: actionItems.length,
      });

      timer.end('autoExtractActionItems', {
        conversationId,
        count: actionItems.length,
      });
    } catch (error: any) {
      logError('Auto-action item extraction failed', error, {
        messageId: context.params.messageId,
        conversationId: context.params.conversationId,
      });
      // Don't throw - this is background processing
    }
  });

