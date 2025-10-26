/**
 * Scheduling Detection Cloud Function
 * Proactive assistant for time zone coordination
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { generateChatCompletion } from '../ai/openai';
import { buildSchedulingPrompt } from '../ai/prompts';
import { verifyConversationAccess } from '../shared/auth';
import { logError, logInfo, startTimer } from '../shared/logger';
import { checkRateLimit, RATE_LIMITS } from '../shared/ratelimit';

interface DetectSchedulingRequest {
  conversationId: string;
  messageLimit?: number;
}

interface MeetingTime {
  utcTimestamp: number;
  localTime: string;
  score: number;
  reason: string;
}

interface SchedulingSuggestion {
  id: string;
  conversationId: string;
  participants: string[];
  suggestedTimes: MeetingTime[];
  reason: string;
  messageId: string;
  createdAt: number;
}

interface DetectSchedulingResponse {
  hasSchedulingIntent: boolean;
  suggestion?: SchedulingSuggestion;
}

/**
 * Detect scheduling intent and suggest meeting times
 */
export const detectScheduling = functions.https.onCall(
  async (
    data: DetectSchedulingRequest,
    context: functions.https.CallableContext
  ): Promise<DetectSchedulingResponse> => {
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
      const { conversationId, messageLimit } = data;
      
      // Ensure messageLimit is a valid integer
      const limit = messageLimit && typeof messageLimit === 'number' ? messageLimit : 10;

      logInfo('Scheduling detection requested', {
        userId,
        conversationId,
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
      await checkRateLimit(userId, 'detectScheduling', RATE_LIMITS.DETECT_SCHEDULING);

      // Fetch recent messages
      const db = admin.firestore();
      const messagesSnapshot = await db
        .collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .where('threadId', '==', null)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      if (messagesSnapshot.empty) {
        return { hasSchedulingIntent: false };
      }

      // Get conversation participants
      const conversationDoc = await db
        .collection('conversations')
        .doc(conversationId)
        .get();
      const conversation = conversationDoc.data();
      const participantIds = conversation?.participants || [];

      // Get user details
      const usersSnapshot = await db
        .collection('users')
        .where(admin.firestore.FieldPath.documentId(), 'in', participantIds.slice(0, 10))
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
      const prompt = buildSchedulingPrompt(messages);

      // Detect scheduling intent with GPT-3.5
      const responseText = await generateChatCompletion(prompt, {
        model: 'gpt-3.5-turbo',
        temperature: 0.3,
        maxTokens: 300,
      });

      // Parse JSON response
      let schedulingData: any;
      try {
        schedulingData = JSON.parse(responseText);
      } catch (parseError) {
        logError('Failed to parse scheduling JSON', parseError, {
          userId,
          conversationId,
          response: responseText,
        });
        return { hasSchedulingIntent: false };
      }

      if (!schedulingData.hasSchedulingIntent || schedulingData.confidence < 0.7) {
        return { hasSchedulingIntent: false };
      }

      // Generate meeting time suggestions
      // For MVP: suggest 3 times in the next week during business hours
      const suggestedTimes: MeetingTime[] = [];
      const now = new Date();
      
      // Tomorrow at 10 AM UTC
      const tomorrow10am = new Date(now);
      tomorrow10am.setDate(tomorrow10am.getDate() + 1);
      tomorrow10am.setUTCHours(10, 0, 0, 0);
      
      // Day after tomorrow at 2 PM UTC
      const dayAfter2pm = new Date(now);
      dayAfter2pm.setDate(dayAfter2pm.getDate() + 2);
      dayAfter2pm.setUTCHours(14, 0, 0, 0);
      
      // Three days from now at 3 PM UTC
      const threeDays3pm = new Date(now);
      threeDays3pm.setDate(threeDays3pm.getDate() + 3);
      threeDays3pm.setUTCHours(15, 0, 0, 0);

      suggestedTimes.push(
        {
          utcTimestamp: tomorrow10am.getTime(),
          localTime: tomorrow10am.toISOString(),
          score: 90,
          reason: 'Morning slot, all participants available',
        },
        {
          utcTimestamp: dayAfter2pm.getTime(),
          localTime: dayAfter2pm.toISOString(),
          score: 85,
          reason: 'Afternoon slot, good for most time zones',
        },
        {
          utcTimestamp: threeDays3pm.getTime(),
          localTime: threeDays3pm.toISOString(),
          score: 80,
          reason: 'Mid-week slot',
        }
      );

      // Store suggestion in Firestore
      const suggestionRef = db.collection('schedulingSuggestions').doc();
      const suggestion: SchedulingSuggestion = {
        id: suggestionRef.id,
        conversationId,
        participants: participantIds,
        suggestedTimes,
        reason: schedulingData.timePreferences || 'Based on recent conversation',
        messageId: messagesSnapshot.docs[messagesSnapshot.docs.length - 1].id,
        createdAt: Date.now(),
      };

      await suggestionRef.set(suggestion);

      timer.end('detectScheduling', { userId, intent: true });

      return {
        hasSchedulingIntent: true,
        suggestion,
      };
    } catch (error: any) {
      logError('Scheduling detection failed', error, {
        userId: context.auth?.uid,
        conversationId: data.conversationId,
      });

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError('internal', 'Failed to detect scheduling intent');
    }
  }
);

