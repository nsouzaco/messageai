# Product Requirements Document: MessageAI MVP
**React Native + Expo + Firebase Edition**

## Executive Summary

MessageAI is a cross-platform messaging application built with React Native, Expo, and Firebase, focused on delivering WhatsApp-level reliability in a 24-hour sprint.

## MVP Goal (24 Hours)

Build a working messaging app that proves the core infrastructure is solid. Simple and reliable beats feature-rich and broken.

## Hard Requirements

### 1. User Authentication

- Users can create an account
- Users can log in
- User has a display name and profile picture
- Session persists (don't need to login every time)

### 2. One-on-One Chat

#### Message Sending & Receiving

- Send text messages between two users
- Messages appear in real-time for online users
- Messages have timestamps
- Messages persist (survive app restart)

#### Optimistic UI

- Message appears instantly in sender's UI
- UI updates when server confirms delivery
- Clear visual states: sending → sent → delivered → read

#### Presence

- Show if user is online/offline
- Show when user is typing

#### Read Receipts

- Track when messages are delivered
- Track when messages are read
- Display read status to sender

### 3. Group Chat

- Create group with 3+ users
- All participants see messages from everyone
- Clear attribution (who sent each message)
- Message delivery tracking works for all members

### 4. Push Notifications

- Receive notifications when app is in foreground
- Show sender name and message preview

### 5. Core Infrastructure

#### Message Delivery

- Real-time delivery using Firebase Realtime Database or Firestore
- Messages never get lost
- Handle basic network issues (automatic retry)

#### Data Persistence

- Messages stored locally via Firebase offline persistence
- Chat history loads from local cache
- Survives app force-quit and restart

#### Deployment

- Firebase project configured and accessible
- App runs on Expo Go
- Nice to have: EAS Build for standalone testing

## Technical Stack

### Frontend: React Native + Expo

#### Core Dependencies

- Expo SDK (latest stable version)
- React Native
- Firebase SDK (auth, firestore/realtime database, storage, cloud messaging)
- React Navigation for routing
- Expo Notifications for push notifications
- Expo Image Picker for profile pictures

#### State Management

- React Context API with useReducer for global state
- Or Zustand for simpler state management

#### Local Storage

- Firebase offline persistence (automatic with Firestore)
- AsyncStorage for user session tokens if needed

#### Real-Time

- Firebase Realtime Database for instant message delivery
- Or Firestore with real-time listeners
- Automatic reconnection and offline support built-in

#### Notifications

- Expo Notifications API
- Firebase Cloud Messaging for push delivery

### Backend: Firebase

#### Firebase Services

- Firebase Authentication for user management
- Firestore or Realtime Database for data storage
- Firebase Cloud Storage for profile pictures and media
- Firebase Cloud Messaging for push notifications
- Firebase Security Rules for data protection
- Optional: Cloud Functions for server-side logic

#### Why Firebase

- Real-time sync out of the box
- Offline persistence automatically handled
- No server infrastructure to manage
- Built-in authentication
- Scales automatically
- Generous free tier

## Project Structure

The app follows Expo Router file-based routing with organized components and services for Firebase integration. Authentication screens are separated from the main app tabs. The chat screen uses dynamic routing for different conversations. Components are modular and reusable. Firebase services are abstracted into separate modules for auth, database operations, and notifications. Context providers manage global state for authentication and chat data. TypeScript types ensure type safety throughout the app.

## Data Models

### Firestore Collections

#### `users` collection

Each user document contains their profile information including unique ID, username, display name, profile picture URL, online status, and last seen timestamp. This data is publicly readable but only writable by the user themselves.

#### `conversations` collection

Each conversation document stores the conversation type (one-on-one or group), array of participant user IDs, optional group name, reference to the last message, timestamp of last activity, and unread count per user. A subcollection stores all messages for that conversation.

#### `messages` subcollection

Nested under each conversation, messages contain sender ID, message content, timestamp, delivery status (sending, sent, delivered, read), array of user IDs who have read the message, and sync status flag.

#### `typing_status` collection

Ephemeral documents that track which users are currently typing in which conversations. These auto-expire after a few seconds.

### TypeScript Types

**User interface** defines the structure for user profiles with ID, username, display name, optional profile picture, online status enum, and optional last seen timestamp.

**Message interface** includes all message metadata: unique ID, conversation ID, sender ID, text content, timestamp, delivery status enum, array of users who read it, and sync status.

**Conversation interface** describes chat rooms with ID, type enum, participant array, optional name for groups, optional last message reference, last activity timestamp, and unread count.

**TypingStatus interface** tracks real-time typing indicators with user ID, conversation ID, and boolean typing state.

### Firebase Database Structure

#### Realtime Database Option

If using Realtime Database instead of Firestore, structure data as nested JSON. Users are stored at the top level by user ID. Conversations contain metadata and a messages child node. Messages are keyed by message ID with all message data. Presence data tracks online status and typing indicators. Use database rules to secure read/write access appropriately.

#### Firestore Option (Recommended)

Firestore provides better querying, automatic indexing, and clearer data modeling. Collections are first-class and subcollections keep messages organized per conversation. Real-time listeners provide instant updates. Offline persistence is robust and automatic. Security rules are more expressive and easier to understand.

## Real-Time Sync Patterns

### Message Sending Flow

When a user sends a message, create an optimistic message object with a temporary client-generated ID. Immediately add it to the local UI with "sending" status. Save to local state or cache. Send to Firebase with batch write or add operation. Firebase returns with server-generated ID and timestamp. Update the optimistic message with real ID and "sent" status. Other users receive the message via real-time listeners. Update delivery status when other clients confirm receipt. Update read status when users view the message.

### Real-Time Listeners

Set up Firestore listeners on the messages subcollection for each active conversation. Listen for new messages, status updates, and deletions. On snapshot changes, merge with local state. Handle added, modified, and removed events appropriately. Detach listeners when leaving a conversation to save resources.

### Offline Support

Firebase automatically caches data locally. Writes are queued when offline. On reconnection, queued writes are sent automatically. Users see cached messages immediately. New messages sync when connection returns. No custom offline queue needed - Firebase handles it.

### Presence System

Use Firebase Realtime Database for presence (works better than Firestore for this). On app foreground, set user status to online. Set up onDisconnect handler to mark offline. Update lastSeen timestamp on disconnect. Listen to presence updates for conversation participants. Show online/offline indicators in UI. Handle app backgrounding and foregrounding appropriately.

### Typing Indicators

Write to typing_status collection when user starts typing. Set a timestamp for auto-expiry. Clear typing status after 2 seconds of inactivity. Listen to typing status for current conversation participants. Show typing indicator in UI for active typers. Use Realtime Database for lower latency if preferred.

## Key Implementation Details

### Optimistic UI Pattern

Implement optimistic updates by immediately showing messages in the UI before server confirmation. Generate temporary IDs on the client. Display with "sending" status indicator. Save to Firebase which returns real ID. Update UI with confirmed ID and "sent" status. If send fails, show error state and allow retry. Never leave messages in limbo - always resolve to success or failure.

### Message Persistence

Firebase Firestore provides automatic offline persistence. Enable persistence in Firebase config. Messages are cached locally automatically. On app restart, cached data loads immediately. Then Firebase syncs any new data from server. No manual SQLite or AsyncStorage needed for messages. Session tokens may still use AsyncStorage for auth.

### Read Receipts Implementation

Track read status at the message level with an array of user IDs who have read it. When user opens conversation, mark all messages as read. Update readBy array in Firebase for each message. Listen for readBy updates on sent messages. Show read indicators (checkmarks) in UI based on readBy array. For groups, show read count or list of readers.

### Delivery Status Tracking

Messages progress through states: sending (client-side only), sent (saved to Firebase), delivered (recipient client has loaded), read (recipient has viewed). Update status in Firebase as each milestone is reached. Use batch updates for efficiency. Show appropriate indicators in UI (single check, double check, blue checks).

### Group Chat Logic

Create conversation document with type set to group and multiple participant IDs. All participants listen to the same messages subcollection. Message attribution comes from senderId field. Track delivery and read status per participant. Show participant list in group info screen. Handle members joining or leaving by updating participants array.

## Testing Checklist

- Test with two or more physical devices or simulators running Expo Go
- Ensure real-time messaging works bidirectionally
- Send 20+ messages rapidly and verify all deliver correctly
- Force quit the app completely, reopen, and confirm all messages persist
- Put one device in airplane mode, send messages from the other, then restore connection and verify sync
- Send messages while app is backgrounded and verify they appear
- Test group chat with 3+ simultaneous users
- Verify read receipts update correctly across all devices
- Check typing indicators show and hide properly with appropriate timing
- Confirm online/offline status updates in real-time
- Test foreground notifications appear with correct sender and preview

## Implementation Priority (24 Hours)

### Hour 0-4: Setup & Auth

Create new Expo app with tabs template. Install Firebase SDK and dependencies. Set up Firebase project in console (enable Auth, Firestore, Storage, FCM). Configure Firebase in the app with API keys. Install React Navigation packages. Build login and register screens with basic UI. Implement Firebase Authentication (email/password). Set up auth state persistence. Create user profile on registration.

### Hour 4-12: Core Messaging

Create chat list screen showing all conversations. Build chat screen UI with message list and input. Implement message sending to Firestore. Set up real-time listeners for incoming messages. Add local state management for messages. Implement optimistic UI updates. Add message timestamps and formatting. Create conversation creation flow. Test basic send/receive between two devices.

### Hour 12-18: Essential Features

Implement typing indicators using Firestore or Realtime Database. Build presence system with online/offline status. Add read receipts with readBy tracking. Create group chat functionality. Add profile pictures using Firebase Storage. Implement message delivery status tracking. Test all features with multiple devices.

### Hour 18-24: Polish & Testing

Set up Expo Notifications for foreground alerts. Configure Firebase Cloud Messaging. Test notification delivery. Run through complete testing checklist. Fix critical bugs and edge cases. Polish UI and loading states. Test offline scenarios thoroughly. Prepare demo video. Document setup process.

## Development Setup

### Firebase Console Setup

Create new Firebase project. Enable Authentication with Email/Password provider. Create Firestore database in production mode. Set up Security Rules for users, conversations, and messages collections. Enable Firebase Storage for profile pictures. Set up Firebase Cloud Messaging. Get Firebase config object with API keys.

### Expo Project Setup

Create new Expo project using tabs template. Install Firebase SDK for React Native. Install React Navigation and dependencies. Install Expo Notifications and Image Picker. Configure Firebase with your project credentials. Set up environment variables for API keys. Test on Expo Go with both iOS and Android.

### Firebase Security Rules

Write Firestore rules that allow users to read their own profile and write only to their own document. Conversations can be read/written by participants only. Messages subcollection inherits conversation rules. Typing status can be written by the user and read by conversation participants. Validate data structure and required fields.

## Deployment

### Firebase Configuration

All Firebase services are already cloud-hosted. No deployment needed for backend. Configure Firebase project for production. Set up proper security rules. Enable billing if exceeding free tier (unlikely for MVP). Monitor usage in Firebase console.

### Expo App Distribution

Run app on Expo Go for testing - no build needed. Share development URL with testers. For standalone app: use EAS Build to create APK (Android) or IPA (iOS). Submit to TestFlight or internal distribution. For production: build and submit to app stores through EAS.

## Success Criteria

### Must Have (Hard Gate)

- Real-time messaging works between 2+ users on Expo Go
- Messages persist after app restart using Firebase offline cache
- Optimistic UI updates appear in under 100ms
- Online/offline indicators update in real-time
- Basic group chat works with 3+ users
- Read receipts track and display correctly
- Foreground notifications show sender and preview
- Firebase project is configured and accessible

### Quality Bar

- No crashes during basic usage flows
- Messages deliver within 1 second on good network
- Messages sync correctly after offline period
- Chat history loads quickly from cache (under 2 seconds)
- App works on both iOS and Android
- UI feels responsive and polished
- Firebase quotas are within free tier limits

## Explicitly Out of Scope for MVP

- Media support including images, videos, and files (can add post-MVP using Firebase Storage)
- Message editing or deletion
- Message search functionality
- Emoji reactions or message reactions
- Advanced offline handling beyond Firebase's automatic support
- Message threads or reply chains
- Extended user profiles beyond name and picture
- Group admin features like kick/ban
- Any AI features or integrations
- Background push notifications (foreground only for MVP)
- End-to-end encryption
- Message forwarding between chats
- Custom dev client or EAS Build (Expo Go is sufficient)
- Voice or video calls

## Firebase Advantages for MVP

Firebase provides real-time sync out of the box with no custom WebSocket code needed. Offline persistence is automatic with Firestore. No backend server to build, deploy, or maintain. Authentication is pre-built and secure. Scales automatically without configuration. Security rules protect data without custom API endpoints. Cloud Functions available if server-side logic is needed later. Generous free tier covers MVP needs. Excellent documentation and community support. Works seamlessly with React Native and Expo.

## Time Budget: 24 hours total

- **4 hours**: Setup, Firebase config, and Auth
- **8 hours**: Core Messaging with Firestore
- **6 hours**: Essential Features (presence, typing, receipts, groups)
- **6 hours**: Polish, Testing, and Bug Fixes

**Focus**: Firebase handles the hard parts (real-time, offline, auth). Focus on UI/UX and reliable message delivery.


