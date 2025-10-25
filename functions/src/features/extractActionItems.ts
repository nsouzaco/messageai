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
      const { conversationId, threadId, messageLimit = 20 } = data;

      logInfo('Action item extraction requested', {
        userId,
        conversationId,
        threadId,
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
      let query = db
        .collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .orderBy('timestamp', 'desc')
        .limit(messageLimit);

      if (threadId) {
        query = query.where('threadId', '==', threadId);
      } else {
        query = query.where('threadId', '==', null);
      }

      const messagesSnapshot = await query.get();

      if (messagesSnapshot.empty) {
        return { actionItems: [], count: 0 };
      }

      // Get user details for sender names
      const senderIds = [...new Set(messagesSnapshot.docs.map((doc) => doc.data().senderId))];
      const usersSnapshot = await db
        .collection('users')
        .where(admin.firestore.FieldPath.documentId(), 'in', senderIds.slice(0, 10))
        .get();

      const users = new Map<string, any>();
      usersSnapshot.docs.forEach((doc) => {
        users.set(doc.id, doc.data());
      });

      // Format messages for prompt
      const messages = messagesSnapshot.docs
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

      // Parse JSON response
      let extractedItems: any[] = [];
      try {
        extractedItems = JSON.parse(responseText);
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
        const actionItem: ActionItem = {
          id: actionItemRef.id,
          conversationId,
          threadId,
          text: item.task,
          assignee: item.assignee || undefined,
          dueDate: item.deadline ? Date.parse(item.deadline) : undefined,
          completed: false,
          extractedFrom: conversationId,
          confidence: item.confidence,
          createdAt: Date.now(),
        };

        batch.set(actionItemRef, actionItem);
        actionItems.push(actionItem);
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

