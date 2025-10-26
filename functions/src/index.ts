/**
 * Aligna AI Features - Cloud Functions
 * Main entry point for all Firebase Cloud Functions
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export AI feature functions
export { autoDetectDecisions, detectDecisions } from './features/detectDecisions';
export { autoDetectPriority, detectPriority } from './features/detectPriority';
export { detectScheduling } from './features/detectScheduling';
export { autoExtractActionItems, extractActionItems } from './features/extractActionItems';
export { autoGenerateEmbedding, batchGenerateEmbeddings } from './features/generateEmbeddings';
export { semanticSearch } from './features/semanticSearch';
export { summarizeThread } from './features/summarizeThread';
export { testPinecone } from './features/testPinecone';

// Export push notification functions
export { sendCustomNotification, sendMessageNotification } from './features/sendPushNotification';

// Utility functions for maintenance
import * as functions from 'firebase-functions';
import { clearExpiredCache } from './ai/cache';
import { cleanupRateLimits } from './shared/ratelimit';

/**
 * Scheduled function to clean up expired cache (runs daily)
 */
export const cleanupCache = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    await clearExpiredCache();
    return null;
  });

/**
 * Scheduled function to clean up old rate limits (runs daily)
 */
export const cleanupRateLimitsScheduled = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    await cleanupRateLimits();
    return null;
  });

/**
 * HTTP endpoint for health check
 */
export const healthCheck = functions.https.onRequest((req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: Date.now(),
    version: '1.0.0',
  });
});

