# MessageAI Setup Guide

## Prerequisites

- Node.js (v16 or later)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- A Firebase account
- iOS Simulator (Mac) or Android Emulator, or physical device with Expo Go

## Firebase Project Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Enter project name: `messageai` (or your preferred name)
4. Disable Google Analytics (optional for MVP)
5. Click "Create project"

### 2. Enable Authentication

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Click on **Email/Password**
3. Enable it and click **Save**

### 3. Create Firestore Database

1. Go to **Firestore Database** in the left sidebar
2. Click **Create database**
3. Select **Start in production mode**
4. Choose a location (select closest to your users)
5. Click **Enable**

### 4. Set Up Firestore Security Rules

1. In Firestore Database, go to the **Rules** tab
2. Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if user is authenticated
    function isSignedIn() {
      return request.auth != null;
    }
    
    // Helper function to check if user is in participants array
    function isParticipant(conversationId) {
      return isSignedIn() && 
             request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants;
    }
    
    // Users collection
    match /users/{userId} {
      // Anyone authenticated can read any user (needed for user search/display)
      allow read: if isSignedIn();
      
      // Users can only write to their own document
      allow write: if isSignedIn() && request.auth.uid == userId;
    }
    
    // Conversations collection
    match /conversations/{conversationId} {
      // Users can read conversations where they are participants
      allow read: if isSignedIn() && 
                     request.auth.uid in resource.data.participants;
      
      // Users can create conversations if they include themselves in participants
      allow create: if isSignedIn() && 
                       request.auth.uid in request.resource.data.participants;
      
      // Users can update conversations where they are participants
      allow update: if isSignedIn() && 
                       request.auth.uid in resource.data.participants;
      
      // Messages subcollection
      match /messages/{messageId} {
        // Users can read messages if they're in the conversation
        allow read: if isParticipant(conversationId);
        
        // Users can create messages if they're in the conversation
        allow create: if isParticipant(conversationId);
        
        // Users can update messages (for read receipts) if they're in the conversation
        allow update: if isParticipant(conversationId);
      }
    }
    
    // Typing status collection (ephemeral data)
    match /typing_status/{statusId} {
      // Any authenticated user can read/write typing status
      allow read, write: if isSignedIn();
    }
  }
}
```

3. Click **Publish**

### 5. Enable Realtime Database

1. Go to **Realtime Database** in the left sidebar
2. Click **Create Database**
3. Choose the same location as Firestore
4. Start in **Locked mode**
5. Click **Enable**

### 6. Set Up Realtime Database Rules

1. In Realtime Database, go to the **Rules** tab
2. Replace with:

```json
{
  "rules": {
    "presence": {
      "$userId": {
        ".read": true,
        ".write": "$userId === auth.uid"
      }
    },
    "typing": {
      "$conversationId": {
        ".read": true,
        "$userId": {
          ".write": "$userId === auth.uid"
        }
      }
    }
  }
}
```

3. Click **Publish**

### 7. Enable Storage

1. Go to **Storage** in the left sidebar
2. Click **Get started**
3. Start in **Production mode**
4. Click **Next** and **Done**

### 8. Set Up Storage Rules

1. In Storage, go to the **Rules** tab
2. Replace with:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /profile_pictures/{userId}_{timestamp}.jpg {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /message_images/{conversationId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

3. Click **Publish**

### 9. Get Firebase Configuration

1. Go to **Project Settings** (gear icon) → **General**
2. Scroll down to "Your apps"
3. Click the **</>** (Web) icon to add a web app
4. Register app name: `messageai-web`
5. Don't enable Firebase Hosting
6. Click **Register app**
7. Copy the `firebaseConfig` object

### 10. Configure App with Firebase Credentials

Firebase credentials are stored securely in environment variables:

1. **Environment file already created**: The `.env` file has been created with your credentials
2. **Not tracked by Git**: The `.env` file is in `.gitignore` for security
3. **How to update**: Edit `.env` file directly if you need to change credentials

The `.env` file contains:
```bash
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

**Note:** See [ENV_SETUP.md](./ENV_SETUP.md) for detailed information about environment variables.

### 11. Enable Firebase Cloud Messaging (Optional)

1. Go to **Project Settings** → **Cloud Messaging**
2. Note the **Server key** (for future backend use)
3. For Expo, FCM is handled automatically through Expo Push Notifications

## Running the App

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Expo Development Server

```bash
npm start
```

### 3. Run on Device/Simulator

- **iOS Simulator (Mac only):** Press `i` in terminal or scan QR code with Camera app
- **Android Emulator:** Press `a` in terminal or scan QR code with Expo Go app
- **Physical Device:** Install Expo Go app and scan QR code

## Testing the App

### Create Test Users

1. On one device/simulator, tap "Sign Up"
2. Fill in the registration form
3. Create account (e.g., user1@test.com)
4. On another device/simulator, create another user (e.g., user2@test.com)

### Test Features

1. **One-on-One Chat:**
   - Tap the + button
   - Select a user
   - Tap Create
   - Send messages back and forth

2. **Group Chat:**
   - Create a third user
   - Tap the + button
   - Select multiple users
   - Enter a group name
   - Tap Create
   - Send messages

3. **Test Offline:**
   - Enable airplane mode on one device
   - Send messages from the other
   - Disable airplane mode
   - Messages should sync

4. **Test Persistence:**
   - Force quit the app
   - Reopen it
   - All messages should still be there

## Troubleshooting

### Firebase Connection Issues

- Check that all API keys are correctly copied
- Verify Firebase services are enabled
- Check Firebase usage quotas (shouldn't be an issue for MVP)

### Authentication Errors

- Verify Email/Password auth is enabled in Firebase Console
- Check Firestore security rules allow user creation

### Messages Not Appearing

- Check Firestore rules allow read/write
- Verify conversationId is correct
- Check browser console/terminal for errors

### Real-time Updates Not Working

- Verify Realtime Database is enabled
- Check Realtime Database rules
- Ensure app is connected to internet

### Image Upload Failing

- Verify Storage is enabled
- Check Storage rules
- Ensure correct permissions on device

## Firebase Free Tier Limits

The Firebase free tier (Spark plan) should be sufficient for MVP testing:

- **Authentication:** 50,000 monthly active users
- **Firestore:** 1GB storage, 50K reads/day, 20K writes/day
- **Realtime Database:** 1GB storage, 10GB/month transfer
- **Storage:** 5GB storage, 1GB/day transfer
- **Cloud Messaging:** Unlimited

## Next Steps

After completing this setup:

1. Test basic authentication
2. Test one-on-one messaging
3. Test group chat
4. Test offline functionality
5. Test notifications (foreground)
6. Build and distribute with EAS Build (optional)

## Common Issues

### "Firebase already initialized" Error

This is normal during development with hot reload. The app handles this gracefully.

### Expo Go Can't Connect

- Ensure both device and computer are on the same network
- Try restarting Expo dev server
- Clear Expo cache: `expo start -c`

### TypeScript Errors

- Run `npm install` to ensure all dependencies are installed
- Restart your TypeScript server in your IDE

## Support

For issues or questions:
- Check Firebase documentation: https://firebase.google.com/docs
- Check Expo documentation: https://docs.expo.dev
- Review the PRD.md for feature specifications

