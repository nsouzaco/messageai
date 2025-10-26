/**
 * Test Pinecone Connection
 * Debug function to verify Pinecone is working
 */

import { Pinecone } from '@pinecone-database/pinecone';
import * as functions from 'firebase-functions';
import { logError, logInfo } from '../shared/logger';

export const testPinecone = functions.https.onCall(
  async (data, context) => {
    try {
      if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
      }

      const apiKey = functions.config().pinecone?.key || process.env.PINECONE_API_KEY;
      
      if (!apiKey) {
        return {
          success: false,
          error: 'Pinecone API key not configured',
          hasKey: false,
        };
      }

      logInfo('Testing Pinecone connection', { userId: context.auth.uid });

      const pinecone = new Pinecone({ apiKey });
      const index = pinecone.index('aligna-messages');

      // Try to get index stats
      const stats = await index.describeIndexStats();

      logInfo('Pinecone connection successful', {
        totalVectors: stats.totalRecordCount,
        dimension: stats.dimension,
      });

      return {
        success: true,
        hasKey: true,
        totalVectors: stats.totalRecordCount || 0,
        dimension: stats.dimension,
        message: `Pinecone is working! Found ${stats.totalRecordCount || 0} vectors in the index.`,
      };
    } catch (error: any) {
      logError('Pinecone test failed', error, { userId: context.auth?.uid });
      
      return {
        success: false,
        hasKey: !!functions.config().pinecone?.key,
        error: error.message || 'Unknown error',
        message: `Failed to connect to Pinecone: ${error.message}`,
      };
    }
  }
);

