/**
 * Rate Limiting
 * Prevent abuse and control costs
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

const RATE_LIMIT_COLLECTION = 'rateLimits';

interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

/**
 * Check rate limit for user
 */
export async function checkRateLimit(
  userId: string,
  feature: string,
  config: RateLimitConfig
): Promise<void> {
  try {
    const db = admin.firestore();
    const now = Date.now();
    const windowStart = now - config.windowSeconds * 1000;
    const key = `${userId}:${feature}`;

    const docRef = db.collection(RATE_LIMIT_COLLECTION).doc(key);
    const doc = await docRef.get();

    if (!doc.exists) {
      // First request
      await docRef.set({
        userId,
        feature,
        requests: [now],
        lastRequest: now,
      });
      return;
    }

    const data = doc.data();
    const requests: number[] = data?.requests || [];

    // Filter requests within window
    const recentRequests = requests.filter((time) => time > windowStart);

    if (recentRequests.length >= config.maxRequests) {
      const oldestRequest = Math.min(...recentRequests);
      const waitSeconds = Math.ceil(
        (oldestRequest + config.windowSeconds * 1000 - now) / 1000
      );

      throw new functions.https.HttpsError(
        'resource-exhausted',
        `Rate limit exceeded. Try again in ${waitSeconds} seconds.`
      );
    }

    // Add current request
    recentRequests.push(now);

    await docRef.update({
      requests: recentRequests,
      lastRequest: now,
    });
  } catch (error: any) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    functions.logger.error('Rate limit check error:', error);
    // Don't block on rate limit errors
  }
}

/**
 * Common rate limit configs
 */
export const RATE_LIMITS = {
  SUMMARIZE_THREAD: { maxRequests: 5, windowSeconds: 60 }, // 5 per minute
  EXTRACT_ACTION_ITEMS: { maxRequests: 10, windowSeconds: 60 }, // 10 per minute
  DETECT_PRIORITY: { maxRequests: 20, windowSeconds: 60 }, // 20 per minute
  SEMANTIC_SEARCH: { maxRequests: 10, windowSeconds: 60 }, // 10 per minute
  DETECT_DECISIONS: { maxRequests: 10, windowSeconds: 60 }, // 10 per minute
  DETECT_SCHEDULING: { maxRequests: 10, windowSeconds: 60 }, // 10 per minute
};

/**
 * Clear old rate limit data (cleanup function)
 */
export async function cleanupRateLimits(): Promise<void> {
  try {
    const db = admin.firestore();
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    const snapshot = await db
      .collection(RATE_LIMIT_COLLECTION)
      .where('lastRequest', '<', oneDayAgo)
      .limit(500)
      .get();

    if (snapshot.empty) {
      return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    functions.logger.info(`Cleaned up ${snapshot.size} old rate limit entries`);
  } catch (error) {
    functions.logger.error('Rate limit cleanup error:', error);
  }
}


