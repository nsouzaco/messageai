/**
 * Semantic Search Cloud Function
 * Smart search using embeddings and RAG
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { searchMessages } from '../ai/embeddings';
import { logError, logInfo, startTimer } from '../shared/logger';
import { checkRateLimit, RATE_LIMITS } from '../shared/ratelimit';

interface SemanticSearchRequest {
  query: string;
  conversationId?: string;
  topK?: number;
  minScore?: number;
}

interface SearchResult {
  messageId: string;
  conversationId: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: number;
  score: number;
  threadId?: string;
}

interface SemanticSearchResponse {
  results: SearchResult[];
  count: number;
  query: string;
}

/**
 * Perform semantic search across messages
 */
export const semanticSearch = functions.https.onCall(
  async (
    data: SemanticSearchRequest,
    context: functions.https.CallableContext
  ): Promise<SemanticSearchResponse> => {
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
      const { query, conversationId, topK = 30, minScore = 0.1 } = data;

      logInfo('Semantic search requested', {
        userId,
        query,
        conversationId,
      });

      // Validate input
      if (!query || query.trim().length === 0) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Search query is required'
        );
      }

      // Check rate limit
      await checkRateLimit(userId, 'semanticSearch', RATE_LIMITS.SEMANTIC_SEARCH);

      // Search in Pinecone - let the AI embeddings handle semantic understanding
      const searchResults = await searchMessages(query, {
        conversationId,
        topK,
        minScore,
      });

      logInfo('Pinecone search results', {
        userId,
        query,
        resultCount: searchResults.length,
        topScores: searchResults.slice(0, 3).map(r => r.score),
      });

      if (searchResults.length === 0) {
        logInfo('No search results found', { userId, query, minScore });
        return { results: [], count: 0, query };
      }

      // Fetch full message details from Firestore
      const db = admin.firestore();
      const results: SearchResult[] = [];

      for (const result of searchResults) {
        const messageId = result.messageId;
        const conversationId = result.metadata.conversationId;

        // Verify user has access to this conversation
        const conversationDoc = await db
          .collection('conversations')
          .doc(conversationId)
          .get();

        if (!conversationDoc.exists) {
          continue;
        }

        const conversation = conversationDoc.data();
        if (!conversation?.participants?.includes(userId)) {
          // Skip conversations user doesn't have access to
          continue;
        }

        // Fetch message
        const messageDoc = await db
          .collection('conversations')
          .doc(conversationId)
          .collection('messages')
          .doc(messageId)
          .get();

        if (!messageDoc.exists) {
          continue;
        }

        const messageData = messageDoc.data();

        // Fetch sender details
        const senderDoc = await db
          .collection('users')
          .doc(messageData!.senderId)
          .get();
        const sender = senderDoc.data();

        results.push({
          messageId,
          conversationId,
          text: messageData!.text,
          senderId: messageData!.senderId,
          senderName: sender?.displayName || 'Unknown',
          timestamp: messageData!.timestamp,
          score: result.score,
          threadId: messageData!.threadId,
        });
      }

      timer.end('semanticSearch', { userId, resultCount: results.length });

      return {
        results,
        count: results.length,
        query,
      };
    } catch (error: any) {
      logError('Semantic search failed', error, {
        userId: context.auth?.uid,
        query: data.query,
      });

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError('internal', 'Failed to perform search');
    }
  }
);

