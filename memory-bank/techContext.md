# Technical Context

## Technology Stack

### Frontend
- **React Native** 0.81.4
- **Expo** ~54.0.13 with Expo Router for file-based routing
- **TypeScript** ~5.9.2
- **React** 19.1.0

### Backend (Current)
- **Firebase Authentication** - Email/password with AsyncStorage persistence
- **Firestore** - Main database with offline persistence
- **Realtime Database** - Presence and typing indicators
- **Firebase Storage** - Profile pictures and media
- **Firebase Cloud Messaging** - Push notifications

### Backend (To Add for AI)
- **Firebase Cloud Functions** - Node.js serverless functions
- **OpenAI API** - GPT-4, GPT-3.5-turbo, text-embedding-3-small
- **Pinecone** - Vector database for semantic search
- **LangChain** - AI orchestration and prompt management

## Key Dependencies (Current)

```json
{
  "firebase": "^12.4.0",
  "expo": "~54.0.13",
  "expo-router": "~6.0.11",
  "react-native": "0.81.4",
  "react": "19.1.0",
  "@react-native-async-storage/async-storage": "^1.24.0",
  "expo-notifications": "~0.32.12",
  "expo-image-picker": "~17.0.8",
  "uuid": "^13.0.0",
  "date-fns": "^4.1.0"
}
```

## Dependencies to Add (Phase 2)

### Cloud Functions (New package.json in /functions)
```json
{
  "firebase-functions": "^4.5.0",
  "firebase-admin": "^12.0.0",
  "openai": "^4.20.0",
  "langchain": "^0.1.0",
  "@langchain/openai": "^0.0.14",
  "@pinecone-database/pinecone": "^1.1.0",
  "zod": "^3.22.0",
  "express": "^4.18.0"
}
```

### Frontend (Add to existing package.json)
```json
{
  "@react-native-community/datetimepicker": "^7.6.0",
  "react-native-markdown-display": "^7.0.0"
}
```

## Firebase Project Configuration

### Firestore Collections
```
/users/{userId}
/conversations/{conversationId}
  /messages/{messageId}
/typing_status/{statusId}

// To add for AI:
/threadSummaries/{summaryId}
/actionItems/{itemId}
/decisions/{decisionId}
/messagePriorities/{messageId}
/schedulingSuggestions/{suggestionId}
```

### Realtime Database Structure
```
/presence/{userId}
  status: 'online' | 'offline'
  lastSeen: timestamp
```

### Security Rules
- Firestore: Users read/write own data, conversation participants access conversations
- Realtime DB: Users write own presence, read others in same conversations
- Storage: Users upload own profile pictures, read all pictures

### Composite Indexes (Required)
```
conversations: (participants, lastActivity DESC)
messages: (conversationId, threadId, timestamp ASC)
messages: (conversationId, timestamp DESC)
```

## Development Environment

### Required Environment Variables (.env)
```bash
# Firebase Config (Client)
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_FIREBASE_DATABASE_URL=
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

### To Add (Firebase Functions Config)
```bash
# In Firebase Functions environment
OPENAI_API_KEY=
PINECONE_API_KEY=
PINECONE_ENVIRONMENT=
PINECONE_INDEX_NAME=
```

## Development Commands

### Current
```bash
npm start              # Start Expo dev server
npm run ios            # Run on iOS simulator
npm run android        # Run on Android emulator
npm run web            # Run in web browser
```

### To Add (Phase 2)
```bash
cd functions
npm install            # Install function dependencies
npm run build          # Compile TypeScript
firebase deploy --only functions    # Deploy functions
firebase emulators:start           # Test locally
```

## Architecture Constraints

### Performance Requirements
- Message delivery < 1 second
- Optimistic UI update < 100ms
- Chat history load < 2 seconds
- Thread summary < 5 seconds (AI)
- Search query < 2 seconds (AI)

### Firebase Quotas (Free Tier)
- Firestore: 20K writes/day, 50K reads/day
- Functions: 2M invocations/month, 400K GB-seconds
- Storage: 5GB stored, 1GB/day downloads
- Realtime DB: 1GB storage, 10GB/month downloaded

### Cost Optimization Strategies
- Cache AI responses aggressively
- Use GPT-3.5-turbo where possible (10x cheaper than GPT-4)
- Batch embedding generation
- Rate limit AI features per user
- Don't regenerate embeddings

## Testing Setup

### Current Testing
- Manual testing on Expo Go (iOS/Android)
- No automated tests yet

### To Add
- Jest unit tests for AI functions
- Firebase emulator for integration tests
- Prompt testing framework
- Cost monitoring dashboard

## Known Technical Limitations

### Expo Go
- Push notifications only work in foreground
- Background sync limited
- Solution: Use EAS Build for standalone app

### Firebase Free Tier
- May exceed limits with heavy AI usage
- Monitor quotas closely
- Upgrade to Blaze (pay-as-you-go) if needed

### OpenAI API
- Rate limits: 90K tokens/min (tier 1)
- Can hit limits with many simultaneous summaries
- Implement queue system if needed

## Deployment Strategy

### Current (Phase 1)
- Dev: Expo Go for testing
- Production: Not yet deployed

### Phase 2 Plan
1. **Functions**: Deploy to Firebase us-central1 region
2. **Frontend**: Update with AI UI components
3. **Standalone Build**: Use EAS Build for TestFlight/internal testing
4. **Production**: App Store + Play Store (future)

## Security Considerations

### Current
- Firebase Auth tokens for API authentication
- Security rules prevent unauthorized access
- Profile pictures publicly readable

### To Add (Phase 2)
- API keys stored in Firebase Functions config
- Rate limiting on Cloud Functions
- PII stripping before sending to OpenAI
- User consent for AI processing
- Audit logging for AI operations

## Monitoring & Observability

### Current
- Firebase Console for basic metrics
- Manual error checking

### To Add
- Cloud Functions logs
- OpenAI API usage tracking
- Cost monitoring dashboard
- Error reporting (Sentry or similar)
- Analytics (track AI feature usage)

