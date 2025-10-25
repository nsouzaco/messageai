/**
 * Priority Detection Cloud Function
 * Auto-flag urgent/important messages
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { generateChatCompletion } from '../ai/openai';
import { buildPriorityPrompt } from '../ai/prompts';
import { logError, logInfo, startTimer } from '../shared/logger';
import { checkRateLimit, RATE_LIMITS } from '../shared/ratelimit';

interface DetectPriorityRequest {
  messageId: string;
  conversationId: string;
}

interface MessagePriority {
  priority: 'high' | 'medium' | 'low';
  score: number;
  reasons: string[];
}

interface DetectPriorityResponse extends MessagePriority {
  messageId: string;
}

/**
 * Detect message priority
 */
export const detectPriority = functions.https.onCall(
  async (
    data: DetectPriorityRequest,
    context: functions.https.CallableContext
  ): Promise<DetectPriorityResponse> => {
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
      const { messageId, conversationId } = data;

      logInfo('Priority detection requested', {
        userId,
        messageId,
        conversationId,
      });

      // Validate input
      if (!messageId || !conversationId) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'messageId and conversationId are required'
        );
      }

      // Check rate limit
      await checkRateLimit(userId, 'detectPriority', RATE_LIMITS.DETECT_PRIORITY);

      // Fetch message
      const db = admin.firestore();
      const messageDoc = await db
        .collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .doc(messageId)
        .get();

      if (!messageDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Message not found');
      }

      const messageData = messageDoc.data();

      // Get sender details
      const senderDoc = await db.collection('users').doc(messageData!.senderId).get();
      const sender = senderDoc.data();

      // Check for mentions
      const hasMentions = messageData!.text?.includes('@') || false;

      // Build prompt
      const prompt = buildPriorityPrompt(
        {
          senderId: messageData!.senderId,
          senderName: sender?.displayName || 'Unknown',
          text: messageData!.text,
          timestamp: messageData!.timestamp,
        },
        { hasMentions }
      );

      // Detect priority with GPT-3.5
      const responseText = await generateChatCompletion(prompt, {
        model: 'gpt-3.5-turbo',
        temperature: 0.2,
        maxTokens: 200,
      });

      // Parse JSON response
      let priorityData: MessagePriority;
      try {
        priorityData = JSON.parse(responseText);
      } catch (parseError) {
        logError('Failed to parse priority JSON', parseError, {
          userId,
          messageId,
          response: responseText,
        });
        // Default to medium priority on parse error
        priorityData = {
          priority: 'medium',
          score: 50,
          reasons: ['Auto-detection failed'],
        };
      }

      // Store priority in Firestore
      await db.collection('messagePriorities').doc(messageId).set({
        ...priorityData,
        messageId,
        conversationId,
        detectedAt: Date.now(),
      });

      // Update message document with priority
      await messageDoc.ref.update({
        aiPriority: priorityData.priority,
        priorityScore: priorityData.score,
      });

      timer.end('detectPriority', { userId, priority: priorityData.priority });

      return {
        messageId,
        ...priorityData,
      };
    } catch (error: any) {
      logError('Priority detection failed', error, {
        userId: context.auth?.uid,
        messageId: data.messageId,
      });

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError('internal', 'Failed to detect priority');
    }
  }
);

/**
 * Background function to auto-detect priority on new messages
 */
export const autoDetectPriority = functions.firestore
  .document('conversations/{conversationId}/messages/{messageId}')
  .onCreate(async (snapshot, context) => {
    const timer = startTimer();

    try {
      const messageData = snapshot.data();
      const { conversationId, messageId } = context.params;

      // Skip if message is in a thread (only analyze main conversation)
      if (messageData.threadId) {
        return;
      }

      // Get sender details
      const senderDoc = await admin
        .firestore()
        .collection('users')
        .doc(messageData.senderId)
        .get();
      const sender = senderDoc.data();

      // Check for mentions
      const hasMentions = messageData.text?.includes('@') || false;

      // Build prompt
      const prompt = buildPriorityPrompt(
        {
          senderId: messageData.senderId,
          senderName: sender?.displayName || 'Unknown',
          text: messageData.text,
          timestamp: messageData.timestamp,
        },
        { hasMentions }
      );

      // Detect priority
      const responseText = await generateChatCompletion(prompt, {
        model: 'gpt-3.5-turbo',
        temperature: 0.2,
        maxTokens: 200,
      });

      let priorityData: MessagePriority;
      try {
        priorityData = JSON.parse(responseText);
      } catch (parseError) {
        logError('Auto-priority detection parse error', parseError, {
          messageId,
          conversationId,
        });
        return;
      }

      // Store priority
      await admin.firestore().collection('messagePriorities').doc(messageId).set({
        ...priorityData,
        messageId,
        conversationId,
        detectedAt: Date.now(),
      });

      // Update message
      await snapshot.ref.update({
        aiPriority: priorityData.priority,
        priorityScore: priorityData.score,
      });

      timer.end('autoDetectPriority', {
        messageId,
        priority: priorityData.priority,
      });
    } catch (error: any) {
      logError('Auto-priority detection failed', error, {
        messageId: context.params.messageId,
      });
      // Don't throw - this is background processing
    }
  });

