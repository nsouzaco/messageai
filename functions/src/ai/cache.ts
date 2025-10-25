/**
 * Response Caching
 * Cache AI responses to save costs and improve performance
 */

import * as admin from 'firebase-admin';

const CACHE_COLLECTION = 'aiCache';

interface CacheEntry {
  key: string;
  value: any;
  createdAt: number;
  expiresAt: number;
  hitCount: number;
}

/**
 * Generate cache key from parameters
 */
export function generateCacheKey(
  feature: string,
  params: Record<string, any>
): string {
  const paramsStr = JSON.stringify(params, Object.keys(params).sort());
  return `${feature}:${Buffer.from(paramsStr).toString('base64')}`;
}

/**
 * Get cached value
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const db = admin.firestore();
    const docRef = db.collection(CACHE_COLLECTION).doc(key);
    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data() as CacheEntry;

    // Check expiration
    if (data.expiresAt < Date.now()) {
      // Delete expired cache
      await docRef.delete();
      return null;
    }

    // Increment hit count
    await docRef.update({
      hitCount: admin.firestore.FieldValue.increment(1),
    });

    return data.value as T;
  } catch (error) {
    console.error('Cache read error:', error);
    return null;
  }
}

/**
 * Set cached value
 */
export async function setCache(
  key: string,
  value: any,
  ttlSeconds: number = 3600 // 1 hour default
): Promise<void> {
  try {
    const db = admin.firestore();
    const now = Date.now();

    const entry: CacheEntry = {
      key,
      value,
      createdAt: now,
      expiresAt: now + ttlSeconds * 1000,
      hitCount: 0,
    };

    await db.collection(CACHE_COLLECTION).doc(key).set(entry);
  } catch (error) {
    console.error('Cache write error:', error);
    // Don't throw - caching is best effort
  }
}

/**
 * Invalidate cache by key pattern
 */
export async function invalidateCache(keyPattern: string): Promise<void> {
  try {
    const db = admin.firestore();
    const snapshot = await db
      .collection(CACHE_COLLECTION)
      .where('key', '>=', keyPattern)
      .where('key', '<', keyPattern + '\uf8ff')
      .get();

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
}

/**
 * Clear expired cache entries
 */
export async function clearExpiredCache(): Promise<void> {
  try {
    const db = admin.firestore();
    const now = Date.now();

    const snapshot = await db
      .collection(CACHE_COLLECTION)
      .where('expiresAt', '<', now)
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

    console.log(`Cleared ${snapshot.size} expired cache entries`);
  } catch (error) {
    console.error('Cache cleanup error:', error);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalEntries: number;
  totalHits: number;
  avgHitCount: number;
}> {
  try {
    const db = admin.firestore();
    const snapshot = await db.collection(CACHE_COLLECTION).get();

    let totalHits = 0;
    snapshot.docs.forEach((doc) => {
      const data = doc.data() as CacheEntry;
      totalHits += data.hitCount || 0;
    });

    return {
      totalEntries: snapshot.size,
      totalHits,
      avgHitCount: snapshot.size > 0 ? totalHits / snapshot.size : 0,
    };
  } catch (error) {
    console.error('Cache stats error:', error);
    return { totalEntries: 0, totalHits: 0, avgHitCount: 0 };
  }
}

