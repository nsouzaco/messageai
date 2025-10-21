# MessageAI - Real-time Messaging App

A WhatsApp-style messaging application built with React Native, Expo, and Firebase, featuring real-time messaging, group chats, presence indicators, typing indicators, read receipts, and more.

## Features

### ✅ Implemented Features

- **User Authentication**
  - Email/password registration and login
  - Persistent sessions
  - Profile pictures
  - User profiles with display name and username

- **One-on-One Chat**
  - Real-time messaging
  - Optimistic UI updates
  - Message delivery status (sending → sent → delivered → read)
  - Read receipts
  - Message timestamps
  - Offline persistence

- **Group Chat**
  - Create groups with 3+ users
  - Group naming
  - Message attribution
  - Read receipts for all members

- **Presence System**
  - Online/offline indicators
  - Last seen timestamps
  - Real-time status updates

- **Typing Indicators**
  - Shows when users are typing
  - Auto-expires after inactivity
  - Works in both one-on-one and group chats

- **Notifications**
  - Foreground notifications
  - Deep linking to conversations
  - Custom notification icons and colors

- **Profile Management**
  - Update profile picture
  - View account information
  - Logout functionality

## Tech Stack

- **Frontend**: React Native, Expo, TypeScript
- **Backend**: Firebase (Firestore, Realtime Database, Authentication, Storage, Cloud Messaging)
- **State Management**: React Context API with useReducer
- **Navigation**: Expo Router (file-based routing)
- **UI**: React Native components with custom styling

## Prerequisites

- Node.js (v16 or later)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Firebase account
- iOS Simulator (Mac) or Android Emulator, or physical device with Expo Go

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Firebase Setup

Follow the detailed instructions in [SETUP.md](./SETUP.md) to:
- Create a Firebase project
- Enable Authentication, Firestore, Realtime Database, Storage, and Cloud Messaging
- Configure security rules
- Get your Firebase configuration

### 3. Configure Firebase

Your Firebase credentials are stored in the `.env` file (not tracked by Git):

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
# ... etc
```

The `.env` file has been created with your Firebase project settings. To update credentials, edit the `.env` file directly.

See [ENV_SETUP.md](./ENV_SETUP.md) for more details.

### 4. Start Development Server

```bash
npm start
```

### 5. Run on Device/Simulator

- **iOS Simulator (Mac only):** Press `i` in terminal
- **Android Emulator:** Press `a` in terminal
- **Physical Device:** Scan QR code with Expo Go app

## Project Structure

```
messageai/
├── app/                          # App screens (Expo Router)
│   ├── (auth)/                   # Authentication screens
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── profile-setup.tsx
│   ├── (tabs)/                   # Main app tabs
│   │   ├── index.tsx             # Chat list
│   │   └── two.tsx               # Settings
│   ├── chat/
│   │   └── [id].tsx              # Chat screen (dynamic route)
│   ├── create-conversation.tsx   # New conversation screen
│   └── _layout.tsx               # Root layout
├── components/                    # Reusable components
│   ├── ConversationItem.tsx
│   ├── MessageBubble.tsx
│   ├── MessageInput.tsx
│   ├── PresenceIndicator.tsx
│   └── TypingIndicator.tsx
├── contexts/                      # React Context providers
│   ├── AuthContext.tsx           # Authentication state
│   └── ChatContext.tsx           # Chat state
├── services/                      # Firebase services
│   └── firebase/
│       ├── auth.ts               # Authentication
│       ├── firestore.ts          # Firestore operations
│       ├── realtimeDb.ts         # Presence & typing
│       ├── storage.ts            # File uploads
│       └── notifications.ts      # Push notifications
├── types/                         # TypeScript types
│   └── index.ts
├── utils/                         # Utility functions
│   └── helpers.ts
├── firebaseConfig.ts             # Firebase initialization
├── PRD.md                        # Product Requirements Document
└── SETUP.md                      # Detailed setup guide
```

## Key Implementation Details

### Optimistic UI

Messages appear instantly in the UI with a "sending" status, then update to "sent" once confirmed by Firebase. This ensures a responsive user experience even on slower connections.

### Real-time Sync

- **Firestore**: Used for messages and conversations with real-time listeners
- **Realtime Database**: Used for presence and typing indicators (lower latency)
- **Offline Persistence**: Firestore automatically caches data locally

### Message Delivery States

1. **Sending**: Message being sent to Firebase (optimistic)
2. **Sent**: Message saved to Firebase
3. **Delivered**: Recipient has loaded the message
4. **Read**: Recipient has viewed the conversation

### Presence System

Uses Firebase Realtime Database with `onDisconnect` handlers to automatically mark users offline when they lose connection or close the app.

### Typing Indicators

Implemented with debouncing to avoid excessive writes. Auto-expires after 2 seconds of inactivity.

## Testing

### Create Test Users

1. Register 2-3 users on different devices/simulators
2. Test one-on-one messaging
3. Create a group chat with multiple users
4. Test offline scenarios
5. Verify persistence after force-quitting the app

### Test Checklist

- ✅ Real-time messaging between devices
- ✅ Message persistence after app restart
- ✅ Optimistic UI (messages appear instantly)
- ✅ Online/offline indicators
- ✅ Typing indicators
- ✅ Read receipts
- ✅ Group chat functionality
- ✅ Profile picture upload
- ✅ Foreground notifications
- ✅ Offline message sync

## Firebase Free Tier Limits

The Firebase free tier (Spark plan) is sufficient for MVP testing:

- **Authentication**: 50,000 monthly active users
- **Firestore**: 1GB storage, 50K reads/day, 20K writes/day
- **Realtime Database**: 1GB storage, 10GB/month transfer
- **Storage**: 5GB storage, 1GB/day transfer
- **Cloud Messaging**: Unlimited

## Known Limitations (MVP Scope)

The following features are intentionally excluded from the MVP:

- Media support (images, videos, files)
- Message editing or deletion
- Message search
- Emoji reactions
- Message threads/replies
- Background push notifications (foreground only)
- End-to-end encryption
- Voice/video calls
- Message forwarding
- Custom EAS builds (Expo Go is sufficient)

## Troubleshooting

### Firebase Connection Issues

- Verify all API keys are correctly copied to `firebaseConfig.ts`
- Check that Firebase services are enabled in the console
- Review Firebase security rules

### Authentication Errors

- Ensure Email/Password auth is enabled in Firebase Console
- Check Firestore security rules

### Messages Not Appearing

- Verify Firestore rules allow read/write for authenticated users
- Check browser console/terminal for errors
- Ensure internet connection is active

### Offline Sync Not Working

- Firestore offline persistence is enabled by default
- Force quit and restart the app
- Check that messages were sent while offline

## Performance Considerations

- Messages are paginated (though not implemented in MVP)
- Images are resized before upload to reduce file size
- Typing indicators use debouncing to minimize writes
- Presence updates use Realtime Database for lower latency

## Security

- Firebase Authentication handles secure user sessions
- Security rules protect user data and conversations
- Only conversation participants can read/write messages
- Profile pictures have appropriate access controls

## Future Enhancements

Potential features for post-MVP:

- Image and video sharing
- Message search
- Push notifications (background)
- Message editing and deletion
- Emoji reactions
- Voice messages
- Video calls
- Message encryption
- Archived conversations
- Pinned messages
- Message forwarding
- Custom themes

## Contributing

This is an MVP project. If you'd like to extend it:

1. Fork the repository
2. Create a feature branch
3. Implement your feature
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this project as a starting point for your own messaging app.

## Support

For issues or questions:
- Review [SETUP.md](./SETUP.md) for detailed configuration
- Check [PRD.md](./PRD.md) for feature specifications
- Consult [Firebase Documentation](https://firebase.google.com/docs)
- Refer to [Expo Documentation](https://docs.expo.dev)

## Acknowledgments

Built with:
- [React Native](https://reactnative.dev/)
- [Expo](https://expo.dev/)
- [Firebase](https://firebase.google.com/)
- [TypeScript](https://www.typescriptlang.org/)

---

**MessageAI** - A modern, real-time messaging application MVP built in 24 hours.

