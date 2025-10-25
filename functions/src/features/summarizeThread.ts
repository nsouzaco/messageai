/**
 * Thread Summarization Cloud Function
 * Generate AI summaries of thread conversations
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { generateCacheKey, getCache, setCache } from '../ai/cache';
import { generateChatCompletion } from '../ai/openai';
import { buildThreadSummaryPrompt } from '../ai/prompts';
import { verifyConversationAccess } from '../shared/auth';
import { logError, logInfo, startTimer } from '../shared/logger';
import { checkRateLimit, RATE_LIMITS } from '../shared/ratelimit';

interface SummarizeThreadRequest {
  conversationId: string;
  threadId: string;
}

interface SummarizeThreadResponse {
  summary: string;
  bulletPoints: string[];
  messageCount: number;
  generatedAt: number;
  cached: boolean;
}

/**
 * Summarize a thread conversation
 */
export const summarizeThread = functions.https.onCall(
  async (
    data: SummarizeThreadRequest,
    context: functions.https.CallableContext
  ): Promise<SummarizeThreadResponse> => {
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
      const { conversationId, threadId } = data;

      logInfo('Thread summarization requested', {
        userId,
        conversationId,
        threadId,
      });

      // Validate input
      if (!conversationId || !threadId) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'conversationId and threadId are required'
        );
      }

      // Verify access
      await verifyConversationAccess(userId, conversationId);

      // Check rate limit
      await checkRateLimit(userId, 'summarizeThread', RATE_LIMITS.SUMMARIZE_THREAD);

      // Check cache
      const cacheKey = generateCacheKey('threadSummary', { conversationId, threadId });
      const cached = await getCache<SummarizeThreadResponse>(cacheKey);
      if (cached) {
        logInfo('Returning cached summary', { userId, threadId, cached: true });
        return { ...cached, cached: true };
      }

      // Fetch thread messages from Firestore
      const db = admin.firestore();
      const messagesSnapshot = await db
        .collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .where('threadId', '==', threadId)
        .orderBy('timestamp', 'asc')
        .get();

      if (messagesSnapshot.empty) {
        throw new functions.https.HttpsError(
          'not-found',
          'No messages found in thread'
        );
      }

      // Get parent message for context
      const parentSnapshot = await db
        .collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .doc(threadId)
        .get();

      const parentMessage = parentSnapshot.data();

      // Get conversation details
      const conversationSnapshot = await db
        .collection('conversations')
        .doc(conversationId)
        .get();

      const conversation = conversationSnapshot.data();

      // Fetch user details for sender names
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
      const messages = messagesSnapshot.docs.map((doc) => {
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
      const prompt = buildThreadSummaryPrompt(messages, {
        conversationName: conversation?.name,
        threadTopic: parentMessage?.text?.slice(0, 100),
      });

      // Generate summary with GPT-4
      const summaryText = await generateChatCompletion(prompt, {
        model: 'gpt-4-turbo-preview',
        temperature: 0.5,
        maxTokens: 500,
      });

      // Parse response
      const lines = summaryText.split('\n').filter((line) => line.trim());
      const bulletPoints = lines
        .filter((line) => line.trim().startsWith('-') || line.trim().startsWith('•'))
        .map((line) => line.replace(/^[-•]\s*/, '').trim());

      const response: SummarizeThreadResponse = {
        summary: summaryText,
        bulletPoints,
        messageCount: messages.length,
        generatedAt: Date.now(),
        cached: false,
      };

      // Store summary in Firestore for persistence
      await db.collection('threadSummaries').add({
        conversationId,
        threadId,
        summary: summaryText,
        bulletPoints,
        messageCount: messages.length,
        generatedAt: Date.now(),
      });

      // Cache the result (1 hour TTL)
      await setCache(cacheKey, response, 3600);

      timer.end('summarizeThread', { userId, messageCount: messages.length });

      return response;
    } catch (error: any) {
      logError('Thread summarization failed', error, {
        userId: context.auth?.uid,
        conversationId: data.conversationId,
        threadId: data.threadId,
      });

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError('internal', 'Failed to generate summary');
    }
  }
);

