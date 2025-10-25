/**
 * Generate Embeddings Cloud Function
 * Automatically generate and store embeddings for new messages
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { storeMessageEmbedding } from '../ai/embeddings';
import { logError, logInfo, startTimer } from '../shared/logger';

/**
 * Background function to auto-generate embeddings on new messages
 */
export const autoGenerateEmbedding = functions.firestore
  .document('conversations/{conversationId}/messages/{messageId}')
  .onCreate(async (snapshot, context) => {
    const timer = startTimer();

    try {
      const messageData = snapshot.data();
      const { conversationId, messageId } = context.params;

      // Skip if message is too short or empty
      if (!messageData.text || messageData.text.trim().length < 3) {
        return;
      }

      logInfo('Generating embedding for message', {
        messageId,
        conversationId,
        textLength: messageData.text.length,
      });

      // Generate and store embedding in Pinecone
      await storeMessageEmbedding(messageId, messageData.text, {
        conversationId,
        threadId: messageData.threadId || undefined,
        senderId: messageData.senderId,
        timestamp: messageData.timestamp,
      });

      // Update message document to mark it as having an embedding
      await snapshot.ref.update({
        embeddingId: messageId,
      });

      timer.end('autoGenerateEmbedding', { messageId, conversationId });
    } catch (error: any) {
      logError('Auto-embedding generation failed', error, {
        messageId: context.params.messageId,
        conversationId: context.params.conversationId,
      });
      // Don't throw - this is background processing
      // The message will still be saved, just without embeddings
    }
  });

/**
 * Callable function to batch generate embeddings for existing messages
 */
export const batchGenerateEmbeddings = functions.https.onCall(
  async (
    data: { conversationId?: string; limit?: number },
    context: functions.https.CallableContext
  ) => {
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
      const { conversationId, limit = 100 } = data;

      logInfo('Batch embedding generation requested', {
        userId,
        conversationId,
        limit,
      });

      const db = admin.firestore();
      let messagesQuery;

      if (conversationId) {
        // Generate embeddings for specific conversation
        messagesQuery = db
          .collection('conversations')
          .doc(conversationId)
          .collection('messages')
          .where('embeddingId', '==', null)
          .limit(limit);
      } else {
        // This won't work with subcollections, so we'll need to iterate conversations
        throw new functions.https.HttpsError(
          'invalid-argument',
          'conversationId is required for batch processing'
        );
      }

      const messagesSnapshot = await messagesQuery.get();

      if (messagesSnapshot.empty) {
        return {
          processed: 0,
          message: 'No messages without embeddings found',
        };
      }

      let processed = 0;
      let failed = 0;

      // Process messages in batches of 10
      const messages = messagesSnapshot.docs;
      for (let i = 0; i < messages.length; i += 10) {
        const batch = messages.slice(i, i + 10);

        await Promise.all(
          batch.map(async (doc) => {
            try {
              const messageData = doc.data();

              if (!messageData.text || messageData.text.trim().length < 3) {
                return;
              }

              await storeMessageEmbedding(doc.id, messageData.text, {
                conversationId: conversationId!,
                threadId: messageData.threadId || undefined,
                senderId: messageData.senderId,
                timestamp: messageData.timestamp,
              });

              await doc.ref.update({
                embeddingId: doc.id,
              });

              processed++;
            } catch (error) {
              logError('Failed to generate embedding for message', error, {
                messageId: doc.id,
              });
              failed++;
            }
          })
        );
      }

      timer.end('batchGenerateEmbeddings', { processed, failed });

      return {
        processed,
        failed,
        message: `Successfully generated ${processed} embeddings${
          failed > 0 ? `, ${failed} failed` : ''
        }`,
      };
    } catch (error: any) {
      logError('Batch embedding generation failed', error, {
        userId: context.auth?.uid,
      });

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        'internal',
        'Failed to generate embeddings'
      );
    }
  }
);

