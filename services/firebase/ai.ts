/**
 * AI Services - Frontend Client
 * Calls Firebase Cloud Functions for AI features
 */

import { auth } from '@/firebaseConfig';
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();

// Type definitions matching Cloud Function responses
export interface ThreadSummary {
  summary: string;
  bulletPoints: string[];
  messageCount: number;
  generatedAt: number;
  cached: boolean;
}

export interface ActionItem {
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

export interface MessagePriority {
  messageId: string;
  priority: 'high' | 'medium' | 'low';
  score: number;
  reasons: string[];
}

export interface SearchResult {
  messageId: string;
  conversationId: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: number;
  score: number;
  threadId?: string;
}

export interface Decision {
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

export interface MeetingTime {
  utcTimestamp: number;
  localTime: string;
  score: number;
  reason: string;
}

export interface SchedulingSuggestion {
  id: string;
  conversationId: string;
  participants: string[];
  suggestedTimes: MeetingTime[];
  reason: string;
  messageId: string;
  createdAt: number;
}

/**
 * Get Firebase auth token for API calls
 */
async function getAuthToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return await user.getIdToken();
}

/**
 * Summarize a thread conversation
 */
export async function summarizeThread(
  conversationId: string,
  threadId: string
): Promise<ThreadSummary> {
  try {
    const summarizeThreadFn = httpsCallable<
      { conversationId: string; threadId: string },
      ThreadSummary
    >(functions, 'summarizeThread');

    const result = await summarizeThreadFn({ conversationId, threadId });
    return result.data;
  } catch (error: any) {
    console.error('Error summarizing thread:', error);
    throw new Error(error.message || 'Failed to generate summary');
  }
}

/**
 * Extract action items from conversation
 */
export async function extractActionItems(
  conversationId: string,
  threadId?: string,
  messageLimit?: number
): Promise<ActionItem[]> {
  try {
    const extractActionItemsFn = httpsCallable<
      { conversationId: string; threadId?: string; messageLimit?: number },
      { actionItems: ActionItem[]; count: number }
    >(functions, 'extractActionItems');

    const result = await extractActionItemsFn({
      conversationId,
      threadId,
      messageLimit,
    });
    return result.data.actionItems;
  } catch (error: any) {
    console.error('Error extracting action items:', error);
    throw new Error(error.message || 'Failed to extract action items');
  }
}

/**
 * Detect message priority
 */
export async function detectPriority(
  messageId: string,
  conversationId: string
): Promise<MessagePriority> {
  try {
    const detectPriorityFn = httpsCallable<
      { messageId: string; conversationId: string },
      MessagePriority
    >(functions, 'detectPriority');

    const result = await detectPriorityFn({ messageId, conversationId });
    return result.data;
  } catch (error: any) {
    console.error('Error detecting priority:', error);
    throw new Error(error.message || 'Failed to detect priority');
  }
}

/**
 * Semantic search across messages
 */
export async function semanticSearch(
  query: string,
  conversationId?: string,
  topK?: number,
  minScore?: number
): Promise<SearchResult[]> {
  try {
    const semanticSearchFn = httpsCallable<
      {
        query: string;
        conversationId?: string;
        topK?: number;
        minScore?: number;
      },
      { results: SearchResult[]; count: number; query: string }
    >(functions, 'semanticSearch');

    const result = await semanticSearchFn({
      query,
      conversationId,
      topK,
      minScore,
    });
    return result.data.results;
  } catch (error: any) {
    console.error('Error performing semantic search:', error);
    throw new Error(error.message || 'Failed to search messages');
  }
}

/**
 * Detect decisions from conversation
 */
export async function detectDecisions(
  conversationId: string,
  threadId?: string,
  messageLimit?: number
): Promise<Decision[]> {
  try {
    const detectDecisionsFn = httpsCallable<
      { conversationId: string; threadId?: string; messageLimit?: number },
      { decisions: Decision[]; count: number }
    >(functions, 'detectDecisions');

    const result = await detectDecisionsFn({
      conversationId,
      threadId,
      messageLimit,
    });
    return result.data.decisions;
  } catch (error: any) {
    console.error('Error detecting decisions:', error);
    throw new Error(error.message || 'Failed to detect decisions');
  }
}

/**
 * Detect scheduling intent and get suggestions
 */
export async function detectScheduling(
  conversationId: string,
  messageLimit?: number
): Promise<SchedulingSuggestion | null> {
  try {
    const detectSchedulingFn = httpsCallable<
      { conversationId: string; messageLimit?: number },
      { hasSchedulingIntent: boolean; suggestion?: SchedulingSuggestion }
    >(functions, 'detectScheduling');

    const result = await detectSchedulingFn({ conversationId, messageLimit });
    return result.data.hasSchedulingIntent ? result.data.suggestion || null : null;
  } catch (error: any) {
    console.error('Error detecting scheduling:', error);
    throw new Error(error.message || 'Failed to detect scheduling intent');
  }
}

/**
 * Generate embeddings for existing messages in a conversation
 */
export async function batchGenerateEmbeddings(
  conversationId: string,
  limit?: number
): Promise<{ processed: number; failed: number; message: string }> {
  try {
    const batchGenerateEmbeddingsFn = httpsCallable<
      { conversationId: string; limit?: number },
      { processed: number; failed: number; message: string }
    >(functions, 'batchGenerateEmbeddings');

    const result = await batchGenerateEmbeddingsFn({ conversationId, limit });
    return result.data;
  } catch (error: any) {
    console.error('Error generating embeddings:', error);
    throw new Error(error.message || 'Failed to generate embeddings');
  }
}

