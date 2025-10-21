# MessageAI - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Name it "messageai"
4. Disable Google Analytics (optional)
5. Click "Create project"

### Step 3: Enable Firebase Services

#### Authentication
1. Go to **Authentication** → **Sign-in method**
2. Enable **Email/Password**
3. Click **Save**

#### Firestore
1. Go to **Firestore Database**
2. Click **Create database**
3. Select **Production mode**
4. Choose a location
5. Click **Enable**

#### Realtime Database
1. Go to **Realtime Database**
2. Click **Create Database**
3. Select **Locked mode**
4. Click **Enable**

#### Storage
1. Go to **Storage**
2. Click **Get started**
3. Select **Production mode**
4. Click **Done**

### Step 4: Configure Security Rules

Copy and paste these rules into each service:

#### Firestore Rules
Go to **Firestore Database** → **Rules** tab:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isSignedIn() {
      return request.auth != null;
    }
    
    function isParticipant(conversationId) {
      return isSignedIn() && 
             request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants;
    }
    
    match /users/{userId} {
      allow read: if isSignedIn();
      allow write: if isSignedIn() && request.auth.uid == userId;
    }
    
    match /conversations/{conversationId} {
      allow read: if isSignedIn() && 
                     request.auth.uid in resource.data.participants;
      allow create: if isSignedIn() && 
                       request.auth.uid in request.resource.data.participants;
      allow update: if isSignedIn() && 
                       request.auth.uid in resource.data.participants;
      
      match /messages/{messageId} {
        allow read: if isParticipant(conversationId);
        allow create: if isParticipant(conversationId);
        allow update: if isParticipant(conversationId);
      }
    }
    
    match /typing_status/{statusId} {
      allow read, write: if isSignedIn();
    }
  }
}
```

Click **Publish**

#### Realtime Database Rules
Go to **Realtime Database** → **Rules** tab:

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

Click **Publish**

#### Storage Rules
Go to **Storage** → **Rules** tab:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /profile_pictures/{userId}_{timestamp}.jpg {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /message_images/{conversationId}/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Click **Publish**

### Step 5: Get Firebase Configuration

1. Go to **Project Settings** (gear icon)
2. Scroll to "Your apps"
3. Click the **</>** (Web) icon
4. Register app as "messageai-web"
5. Copy the `firebaseConfig` object

### Step 6: Configure Environment Variables

Your Firebase credentials are already configured in the `.env` file! The file has been created with your Firebase project settings and is **not tracked by Git** for security.

**The `.env` file contains:**
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

**Note**: If you need to update these values later, edit the `.env` file directly. Never commit this file to Git!

### Step 7: Run the App

```bash
npm start
```

Then:
- Press `i` for iOS Simulator
- Press `a` for Android Emulator
- Scan QR code with Expo Go on your phone

### Step 8: Test

1. Register a new user
2. On another device/simulator, register another user
3. Create a new chat
4. Start messaging!

## 🎉 You're Done!

The app is now running with:
- ✅ Real-time messaging
- ✅ Group chats
- ✅ Presence indicators
- ✅ Typing indicators
- ✅ Read receipts
- ✅ Profile pictures
- ✅ Offline support

## 📚 More Information

- **Full Setup Guide**: See [SETUP.md](./SETUP.md)
- **Feature Documentation**: See [README.md](./README.md)
- **Implementation Details**: See [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
- **Product Requirements**: See [PRD.md](./PRD.md)

## 🐛 Troubleshooting

### Firestore Index Error
**Error**: "The query requires an index"

**Solution**:
1. Click the link in the error message (it takes you directly to create the index)
2. Click "Create Index" in Firebase Console
3. Wait 2-5 minutes for it to build
4. Restart your app

See [FIRESTORE_INDEX_FIX.md](./FIRESTORE_INDEX_FIX.md) for detailed instructions.

### Persistence Error in React Native
**Error**: "IndexedDB persistence is only available on platforms that support LocalStorage"

**Solution**: Already fixed! The firebaseConfig.ts has been updated to use React Native-compatible persistence.

If you still see this:
1. Stop the development server (Ctrl+C)
2. Clear cache: `npm start -- --clear`
3. Force quit and restart your app

### "Firebase already initialized" Error
This is normal during development with hot reload. The app handles it gracefully.

### Messages Not Appearing
- Check Firestore security rules are published
- Verify internet connection
- Check console for errors
- Make sure Firestore indexes are created (see above)

### Can't Login
- Ensure Email/Password auth is enabled in Firebase Console
- Check that user was successfully created in Firebase Authentication

### Image Upload Failing
- Verify Storage is enabled
- Check Storage security rules are published

## 💡 Tips

- Use at least 2 devices/simulators to test real-time features
- Test offline by enabling airplane mode
- Force quit and restart to test persistence
- Check Firebase Console to see data in real-time

## 🚀 Next Steps

- Add more test users
- Create group chats
- Test all features from the checklist in README.md
- Consider deploying with EAS Build for production

---

**Need Help?** Check [SETUP.md](./SETUP.md) for detailed instructions.

