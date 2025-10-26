/**
 * Embeddings Management
 * Generate and store message embeddings for semantic search
 */

import { Pinecone } from '@pinecone-database/pinecone';
import * as functions from 'firebase-functions';
import { generateEmbedding, generateEmbeddingsBatch } from './openai';

// Initialize Pinecone client
let pineconeClient: Pinecone | null = null;

function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    const apiKey = functions.config().pinecone?.key || process.env.PINECONE_API_KEY;
    if (!apiKey) {
      throw new Error('Pinecone API key not configured');
    }
    pineconeClient = new Pinecone({ apiKey });
  }
  return pineconeClient;
}

const INDEX_NAME = 'aligna-messages';
const EMBEDDING_DIMENSION = 1536; // text-embedding-3-small

/**
 * Store message embedding in Pinecone
 */
export async function storeMessageEmbedding(
  messageId: string,
  text: string,
  metadata: {
    conversationId: string;
    threadId?: string;
    senderId: string;
    timestamp: number;
  }
): Promise<void> {
  try {
    const embedding = await generateEmbedding(text);
    const pinecone = getPineconeClient();
    const index = pinecone.index(INDEX_NAME);

    await index.upsert([
      {
        id: messageId,
        values: embedding,
        metadata: {
          ...metadata,
          text: text.slice(0, 500), // Store truncated text for preview
        },
      },
    ]);

    functions.logger.info(`Stored embedding for message ${messageId}`);
  } catch (error: any) {
    functions.logger.error('Error storing embedding:', error);
    throw new Error(`Failed to store embedding: ${error.message}`);
  }
}

/**
 * Store multiple message embeddings in batch
 */
export async function storeMessageEmbeddingsBatch(
  messages: Array<{
    id: string;
    text: string;
    metadata: {
      conversationId: string;
      threadId?: string;
      senderId: string;
      timestamp: number;
    };
  }>
): Promise<void> {
  try {
    const texts = messages.map((m) => m.text);
    const embeddings = await generateEmbeddingsBatch(texts);

    const pinecone = getPineconeClient();
    const index = pinecone.index(INDEX_NAME);

    const vectors = messages.map((message, i) => ({
      id: message.id,
      values: embeddings[i],
      metadata: {
        ...message.metadata,
        text: message.text.slice(0, 500),
      },
    }));

    await index.upsert(vectors);

    functions.logger.info(`Stored ${messages.length} embeddings in batch`);
  } catch (error: any) {
    functions.logger.error('Error storing embeddings batch:', error);
    throw new Error(`Failed to store embeddings: ${error.message}`);
  }
}

/**
 * Search messages by semantic similarity
 */
export async function searchMessages(
  query: string,
  options: {
    conversationId?: string;
    topK?: number;
    minScore?: number;
  } = {}
): Promise<
  Array<{
    messageId: string;
    score: number;
    metadata: any;
  }>
> {
  try {
    functions.logger.info('Generating embedding for query', { query, queryLength: query.length });
    const queryEmbedding = await generateEmbedding(query);
    functions.logger.info('Query embedding generated', { 
      embeddingLength: queryEmbedding.length,
      firstValues: queryEmbedding.slice(0, 3),
    });
    
    const pinecone = getPineconeClient();
    const index = pinecone.index(INDEX_NAME);

    const filter: any = {};
    if (options.conversationId) {
      filter.conversationId = options.conversationId;
    }

    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK: options.topK || 10,
      includeMetadata: true,
      filter: Object.keys(filter).length > 0 ? filter : undefined,
    });

    const minScore = options.minScore !== undefined ? options.minScore : 0.7;

    // Debug logging
    functions.logger.info('Pinecone raw response', {
      totalMatches: queryResponse.matches?.length || 0,
      allScores: queryResponse.matches?.map(m => m.score) || [],
      hasFilter: Object.keys(filter).length > 0,
      filter,
      minScore, // Log the actual threshold being used
    });

    return (
      queryResponse.matches
        ?.filter((match) => (match.score || 0) >= minScore)
        .map((match) => ({
          messageId: match.id,
          score: match.score || 0,
          metadata: match.metadata,
        })) || []
    );
  } catch (error: any) {
    functions.logger.error('Error searching messages:', error);
    throw new Error(`Failed to search messages: ${error.message}`);
  }
}

/**
 * Delete message embedding
 */
export async function deleteMessageEmbedding(messageId: string): Promise<void> {
  try {
    const pinecone = getPineconeClient();
    const index = pinecone.index(INDEX_NAME);

    await index.deleteOne(messageId);

    functions.logger.info(`Deleted embedding for message ${messageId}`);
  } catch (error: any) {
    functions.logger.error('Error deleting embedding:', error);
    // Don't throw - this is best effort
  }
}

/**
 * Initialize Pinecone index (run once during setup)
 */
export async function initializePineconeIndex(): Promise<void> {
  try {
    const pinecone = getPineconeClient();
    
    // Check if index exists
    const indexes = await pinecone.listIndexes();
    const indexExists = indexes.indexes?.some((idx) => idx.name === INDEX_NAME);

    if (!indexExists) {
      // Create index
      await pinecone.createIndex({
        name: INDEX_NAME,
        dimension: EMBEDDING_DIMENSION,
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1',
          },
        },
      });

      functions.logger.info(`Created Pinecone index: ${INDEX_NAME}`);
    } else {
      functions.logger.info(`Pinecone index already exists: ${INDEX_NAME}`);
    }
  } catch (error: any) {
    functions.logger.error('Error initializing Pinecone:', error);
    throw new Error(`Failed to initialize Pinecone: ${error.message}`);
  }
}

