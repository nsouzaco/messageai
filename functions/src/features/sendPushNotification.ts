import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { logError, logInfo, logWarning } from '../shared/logger';

/**
 * Send push notification when a new message is created
 * This is a background trigger that runs automatically
 * DISABLED: Temporarily disabled to reduce function conflicts
 */
export const sendMessageNotification = functions.firestore
  .document('conversations/{conversationId}/messages/{messageId}')
  .onCreate(async (snapshot, context) => {
    try {
      const message = snapshot.data();
      const { conversationId } = context.params;

      // Skip if message has no sender (shouldn't happen)
      if (!message.senderId) {
        logInfo('Message has no sender, skipping notification');
        return;
      }

      // Get conversation details
      const conversationDoc = await admin.firestore()
        .collection('conversations')
        .doc(conversationId)
        .get();

      if (!conversationDoc.exists) {
        logWarning('Conversation not found:', { conversationId });
        return;
      }

      const conversation = conversationDoc.data()!;
      const participants = conversation.participants || [];

      // Get sender details
      const senderDoc = await admin.firestore()
        .collection('users')
        .doc(message.senderId)
        .get();

      const senderName = senderDoc.exists 
        ? senderDoc.data()?.displayName || 'Someone'
        : 'Someone';

      // Get all participants except the sender
      const recipientIds = participants.filter((id: string) => id !== message.senderId);

      if (recipientIds.length === 0) {
        logInfo('No recipients to notify');
        return;
      }

      // Get recipient user documents
      const recipientDocs = await Promise.all(
        recipientIds.map((id: string) => 
          admin.firestore().collection('users').doc(id).get()
        )
      );

      // Prepare notification payloads
      const notifications: Array<{
        token: string;
        notification: admin.messaging.Notification;
        data: { [key: string]: string };
      }> = [];

      for (const recipientDoc of recipientDocs) {
        if (!recipientDoc.exists) continue;

        const recipient = recipientDoc.data()!;

        // Skip if user has notifications disabled
        if (recipient.notificationsEnabled === false) {
          continue;
        }

        // Skip if user has no push token
        if (!recipient.pushToken) {
          continue;
        }

        // Determine notification title and body
        let title = senderName;
        let body = message.text || 'Sent a message';

        // Handle different message types
        if (message.messageType === 'image') {
          body = '📷 Sent an image';
        } else if (message.messageType === 'audio') {
          body = '🎤 Sent a voice message';
        }

        // For group chats, add conversation name
        if (conversation.type === 'group') {
          const groupName = conversation.name || 'Group Chat';
          title = `${senderName} in ${groupName}`;
        }

        // Add priority indicator if message is high priority
        if (message.aiPriority === 'high') {
          title = `🔴 ${title}`;
        }

        notifications.push({
          token: recipient.pushToken,
          notification: {
            title,
            body,
          },
          data: {
            conversationId,
            messageId: snapshot.id,
            senderId: message.senderId,
            type: 'new_message',
          },
        });
      }

      // Send notifications in batches
      if (notifications.length === 0) {
        logInfo('No valid push tokens found for recipients');
        return;
      }

      logInfo(`Sending ${notifications.length} push notifications`, {
        conversationId,
        messageId: snapshot.id,
      });

      // Send notifications
      const promises = notifications.map(({ token, notification, data }) =>
        admin.messaging().send({
          token,
          notification,
          data,
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1, // TODO: Calculate actual unread count
              },
            },
          },
          android: {
            priority: 'high',
            notification: {
              sound: 'default',
              channelId: 'messages',
              priority: 'high',
            },
          },
        }).catch((error) => {
          // Log error but don't fail entire batch
          logError('Failed to send notification to token:', error, {
            token: token.substring(0, 20) + '...',
          });
        })
      );

      await Promise.all(promises);

      logInfo('Push notifications sent successfully', {
        count: notifications.length,
      });

    } catch (error: any) {
      logError('Error sending push notification:', error);
      // Don't throw - we don't want to block message creation
    }
  });

/**
 * Callable function to send a custom push notification
 * Useful for testing or manual notifications
 */
export const sendCustomNotification = functions.https.onCall(async (data, context) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    const { userId, title, body, data: customData } = data;

    if (!userId || !title || !body) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fields: userId, title, body'
      );
    }

    // Get user's push token
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(userId)
      .get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'User not found'
      );
    }

    const user = userDoc.data()!;

    if (!user.pushToken) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'User has no push token'
      );
    }

    // Send notification
    await admin.messaging().send({
      token: user.pushToken,
      notification: {
        title,
        body,
      },
      data: customData || {},
    });

    return { success: true, message: 'Notification sent' };

  } catch (error: any) {
    logError('Error sending custom notification:', error);
    throw error;
  }
});

