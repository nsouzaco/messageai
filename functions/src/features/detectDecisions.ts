/**
 * Decision Detection Cloud Function
 * Auto-detect and log decisions made in conversations
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { generateChatCompletion } from '../ai/openai';
import { buildDecisionPrompt } from '../ai/prompts';
import { verifyConversationAccess } from '../shared/auth';
import { logError, logInfo, startTimer } from '../shared/logger';
import { checkRateLimit, RATE_LIMITS } from '../shared/ratelimit';

interface DetectDecisionsRequest {
  conversationId: string;
  threadId?: string;
  messageLimit?: number;
}

interface Decision {
  id: string;
  conversationId: string;
  threadId?: string;
  decision: string;
  participants: string[];
  timestamp: number;
  extractedFrom: string;
  tags: string[];
  confidence: number;
}

interface DetectDecisionsResponse {
  decisions: Decision[];
  count: number;
}

/**
 * Detect decisions from recent messages
 */
export const detectDecisions = functions.https.onCall(
  async (
    data: DetectDecisionsRequest,
    context: functions.https.CallableContext
  ): Promise<DetectDecisionsResponse> => {
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

      logInfo('Decision detection requested', {
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
      await checkRateLimit(userId, 'detectDecisions', RATE_LIMITS.DETECT_DECISIONS);

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
        return { decisions: [], count: 0 };
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
      const prompt = buildDecisionPrompt(messages);

      // Detect decisions with GPT-3.5
      const responseText = await generateChatCompletion(prompt, {
        model: 'gpt-3.5-turbo',
        temperature: 0.3,
        maxTokens: 500,
      });

      // Parse JSON response
      let decisionData: any;
      try {
        decisionData = JSON.parse(responseText);
      } catch (parseError) {
        logError('Failed to parse decision JSON', parseError, {
          userId,
          conversationId,
          response: responseText,
        });
        return { decisions: [], count: 0 };
      }

      if (!decisionData.hasDecision || decisionData.confidence < 0.7) {
        return { decisions: [], count: 0 };
      }

      // Extract tags from decision text
      const tags: string[] = [];
      const decisionText = decisionData.decision.toLowerCase();
      if (decisionText.includes('api') || decisionText.includes('backend')) {
        tags.push('technical');
      }
      if (decisionText.includes('design') || decisionText.includes('ui')) {
        tags.push('design');
      }
      if (decisionText.includes('deadline') || decisionText.includes('timeline')) {
        tags.push('timeline');
      }

      // Store decision in Firestore
      const decisionRef = db.collection('decisions').doc();
      const decision: Decision = {
        id: decisionRef.id,
        conversationId,
        threadId,
        decision: decisionData.decision,
        participants: decisionData.participants || [],
        timestamp: Date.now(),
        extractedFrom: conversationId,
        tags,
        confidence: decisionData.confidence,
      };

      await decisionRef.set(decision);

      timer.end('detectDecisions', { userId, found: 1 });

      return {
        decisions: [decision],
        count: 1,
      };
    } catch (error: any) {
      logError('Decision detection failed', error, {
        userId: context.auth?.uid,
        conversationId: data.conversationId,
      });

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError('internal', 'Failed to detect decisions');
    }
  }
);

/**
 * Background function to auto-detect decisions on new messages
 * Analyzes the last 10 messages when a new message is sent
 */
export const autoDetectDecisions = functions.firestore
  .document('conversations/{conversationId}/messages/{messageId}')
  .onCreate(async (snapshot, context) => {
    const timer = startTimer();

    try {
      const messageData = snapshot.data();
      const { conversationId, messageId } = context.params;

      // Skip if message is in a thread (only analyze main conversation)
      if (messageData.threadId) {
        logInfo('Skipping decision detection for thread message', { messageId });
        return;
      }

      // Check if message text contains decision keywords
      const decisionKeywords = [
        'decide', 'decided', 'decision', 'final decision', 'agree', 'agreed',
        'let\'s go with', 'we\'ll use', 'we should', 'choose', 'chosen',
        'approve', 'approved', 'confirm', 'confirmed'
      ];
      
      const messageText = messageData.text?.toLowerCase() || '';
      const hasDecisionKeyword = decisionKeywords.some(keyword => 
        messageText.includes(keyword)
      );

      // Skip if no decision keywords found (optimization to reduce API calls)
      if (!hasDecisionKeyword) {
        logInfo('No decision keywords found, skipping', { messageId });
        return;
      }

      logInfo('Decision keyword detected, analyzing messages', { 
        conversationId, 
        messageId 
      });

      // Fetch last 10 messages for context
      const db = admin.firestore();
      
      logInfo('Fetching messages for decision analysis', {
        conversationId,
        messageId
      });
      
      // Query without threadId filter since most messages don't have this field at all
      const messagesSnapshot = await db
        .collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .orderBy('timestamp', 'desc')
        .limit(20)
        .get();

      // Filter out thread replies in code (where threadId exists)
      const mainMessages = messagesSnapshot.docs.filter(doc => !doc.data().threadId);

      logInfo('Messages fetched', {
        conversationId,
        totalFetched: messagesSnapshot.docs.length,
        mainMessages: mainMessages.length,
        isEmpty: mainMessages.length === 0
      });

      if (mainMessages.length === 0) {
        logInfo('No main messages found, skipping decision detection', { conversationId });
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
      const prompt = buildDecisionPrompt(messages);

      // Detect decisions with GPT-3.5
      const responseText = await generateChatCompletion(prompt, {
        model: 'gpt-3.5-turbo',
        temperature: 0.3,
        maxTokens: 500,
      });

      // Parse JSON response
      let decisionData: any;
      try {
        decisionData = JSON.parse(responseText);
        logInfo('Decision AI response parsed', {
          conversationId,
          messageId,
          hasDecision: decisionData.hasDecision,
          confidence: decisionData.confidence,
          decision: decisionData.decision
        });
      } catch (parseError) {
        logError('Failed to parse decision JSON in auto-detect', parseError, {
          conversationId,
          messageId,
          response: responseText,
        });
        return;
      }

      if (!decisionData.hasDecision || decisionData.confidence < 0.5) {
        logInfo('No high-confidence decision found', { 
          conversationId, 
          confidence: decisionData.confidence,
          hasDecision: decisionData.hasDecision 
        });
        return;
      }

      // Extract tags from decision text
      const tags: string[] = [];
      const decisionText = decisionData.decision.toLowerCase();
      if (decisionText.includes('api') || decisionText.includes('backend')) {
        tags.push('technical');
      }
      if (decisionText.includes('design') || decisionText.includes('ui')) {
        tags.push('design');
      }
      if (decisionText.includes('deadline') || decisionText.includes('timeline')) {
        tags.push('timeline');
      }
      if (decisionText.includes('meeting') || decisionText.includes('time')) {
        tags.push('scheduling');
      }

      // Store decision in Firestore
      const decisionRef = db.collection('decisions').doc();
      const decision: Decision = {
        id: decisionRef.id,
        conversationId,
        decision: decisionData.decision,
        participants: decisionData.participants || [],
        timestamp: Date.now(),
        extractedFrom: conversationId,
        tags,
        confidence: decisionData.confidence,
      };

      await decisionRef.set(decision);

      logInfo('Decision automatically detected and stored', {
        conversationId,
        decisionId: decision.id,
        confidence: decision.confidence,
      });

      timer.end('autoDetectDecisions', {
        conversationId,
        decisionId: decision.id,
      });
    } catch (error: any) {
      logError('Auto-decision detection failed', error, {
        messageId: context.params.messageId,
        conversationId: context.params.conversationId,
      });
      // Don't throw - this is background processing
    }
  });

