/**
 * Authentication Middleware
 * Verify Firebase auth tokens on Cloud Function requests
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

/**
 * Verify Firebase ID token from request
 */
export async function verifyAuth(
  authorization: string | undefined
): Promise<admin.auth.DecodedIdToken> {
  if (!authorization || !authorization.startsWith('Bearer ')) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Missing or invalid authorization header'
    );
  }

  const token = authorization.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return decodedToken;
  } catch (error: any) {
    functions.logger.error('Token verification failed:', error);
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Invalid authentication token'
    );
  }
}

/**
 * Get user ID from request
 */
export async function getUserId(
  authorization: string | undefined
): Promise<string> {
  const decodedToken = await verifyAuth(authorization);
  return decodedToken.uid;
}

/**
 * Check if user has access to conversation
 */
export async function verifyConversationAccess(
  userId: string,
  conversationId: string
): Promise<boolean> {
  try {
    const db = admin.firestore();
    const conversationDoc = await db
      .collection('conversations')
      .doc(conversationId)
      .get();

    if (!conversationDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Conversation not found'
      );
    }

    const conversation = conversationDoc.data();
    const participants = conversation?.participants || [];

    if (!participants.includes(userId)) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'You do not have access to this conversation'
      );
    }

    return true;
  } catch (error: any) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    functions.logger.error('Error verifying conversation access:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to verify access'
    );
  }
}

