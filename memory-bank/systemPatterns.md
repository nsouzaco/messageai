# System Patterns & Architecture

## Current Architecture (Phase 1 - MVP)

### Frontend: React Native + Expo
```
/app - File-based routing (Expo Router)
  /(auth) - Authentication screens
  /(tabs) - Main app tabs
  /chat/[id].tsx - Chat screen (dynamic route)
  /thread/[id].tsx - Thread modal
  /group-info/[id].tsx - Group info modal

/components - Reusable UI components
  - MessageBubble.tsx
  - MessageInput.tsx
  - ConversationItem.tsx
  - PresenceIndicator.tsx
  - TypingIndicator.tsx
  - MessageActionMenu.tsx

/contexts - Global state management
  - AuthContext.tsx (useReducer pattern)
  - ChatContext.tsx (useReducer pattern)

/services/firebase - Firebase abstractions
  - auth.ts
  - firestore.ts
  - realtimeDb.ts
  - storage.ts
  - notifications.ts

/types - TypeScript interfaces
  - User, Message, Conversation, TypingStatus, etc.
```

### Backend: Firebase
- **Firestore**: Conversations, messages, user profiles
- **Realtime Database**: Presence, typing indicators (low latency)
- **Storage**: Profile pictures
- **Authentication**: Email/password with AsyncStorage persistence
- **FCM**: Push notifications (foreground only in MVP)

### Key Patterns

#### 1. Optimistic UI Updates
```typescript
// Send message flow:
1. Generate tempId on client
2. Add to local state immediately (status: 'sending')
3. Send to Firestore
4. Firestore returns real ID
5. Update local state with real ID (status: 'sent')
6. Real-time listener updates delivery status
```

#### 2. Thread Architecture
- Main chat messages have `threadId: undefined`
- Thread replies have `threadId: parentMessageId`
- Parent message tracks `replyCount`
- Firestore queries filter: `where('threadId', '==', null)` for main chat
- Separate listener for thread replies: `where('threadId', '==', parentId)`

#### 3. Read Receipts in Groups
- Message has `readBy: string[]` (user IDs)
- Mark as read: add userId to array
- Visual indicator: ✓ (not all read), ✓✓ (all read)
- Display "Read by Alice, Bob, Charlie"

#### 4. Presence System (Realtime DB)
```typescript
/presence/{userId}
  status: 'online' | 'offline'
  lastSeen: timestamp
  
// On connect: set online, setup onDisconnect to set offline
```

#### 5. State Management with useReducer
```typescript
// AuthContext and ChatContext use reducer pattern
dispatch({ type: 'ADD_MESSAGE', payload: message })
dispatch({ type: 'UPDATE_MESSAGE_STATUS', payload: { messageId, status } })
```

## AI Architecture (Phase 2 - To Build)

### Backend: Firebase Cloud Functions
```
/functions/src
  /ai
    - openai.ts - OpenAI client wrapper
    - embeddings.ts - Generate/store embeddings
    - prompts.ts - Prompt templates
    - cache.ts - Response caching
  /features
    - summarizeThread.ts - Cloud Function
    - extractActionItems.ts - Cloud Function
    - detectPriority.ts - Cloud Function
    - semanticSearch.ts - Cloud Function
    - detectDecisions.ts - Cloud Function
    - detectScheduling.ts - Cloud Function
  /shared
    - auth.ts - Verify Firebase tokens
    - ratelimit.ts - Rate limiting per user
    - logger.ts - Structured logging
```

### Vector Database: Pinecone
```
Index: aligna-messages
Dimension: 1536 (text-embedding-3-small)
Metadata: {
  messageId: string
  conversationId: string
  threadId?: string
  senderId: string
  timestamp: number
  text: string (truncated for preview)
}
```

### New Data Models (Firestore)

#### `/threadSummaries/{summaryId}`
```typescript
{
  threadId: string
  conversationId: string
  summary: string
  bulletPoints: string[]
  generatedAt: number
  messageCount: number
  invalidatedAt?: number // if thread has new messages
}
```

#### `/actionItems/{itemId}`
```typescript
{
  conversationId: string
  threadId?: string
  text: string
  assignee?: string
  dueDate?: number
  completed: boolean
  extractedFrom: string // messageId
  confidence: number
  createdAt: number
}
```

#### `/decisions/{decisionId}`
```typescript
{
  conversationId: string
  threadId?: string
  decision: string
  participants: string[]
  timestamp: number
  extractedFrom: string
  tags: string[]
}
```

#### `/messagePriorities/{messageId}`
```typescript
{
  priority: 'high' | 'medium' | 'low'
  reasons: string[]
  score: number
  detectedAt: number
}
```

#### Extended Message Interface
```typescript
interface Message {
  // ... existing fields
  aiPriority?: 'high' | 'medium' | 'low'
  priorityScore?: number
  hasActionItems?: boolean
  isDecision?: boolean
  embeddingId?: string // Pinecone ID
}
```

### AI Processing Patterns

#### 1. Asynchronous Processing
- Message send triggers Cloud Function (async)
- Priority detection, action items run in background
- Don't block message delivery
- Update message metadata when complete

#### 2. Caching Strategy
- Cache thread summaries (invalidate after N new messages)
- Cache embeddings (never regenerate)
- Cache GPT responses for 1 hour
- Use Redis or Firestore for cache

#### 3. Cost Optimization
- Batch embedding generation
- Use GPT-3.5-turbo for simple tasks
- Use GPT-4 only for complex summaries
- Rate limiting: max 1 summary/thread/minute

#### 4. Security
- API keys in Firebase Functions config (never client-side)
- Verify Firebase auth token on all Cloud Function calls
- Rate limit per user to prevent abuse
- Strip PII before sending to OpenAI

## Design Patterns

### Frontend Patterns
- **Container/Presentation**: Screens contain logic, components are presentational
- **Custom Hooks**: useAuth(), useChat(), usePresence()
- **Context + useReducer**: Centralized state management
- **Optimistic Updates**: UI updates before server confirms

### Backend Patterns
- **Service Layer**: Firebase operations abstracted into service modules
- **Single Responsibility**: One Cloud Function per AI feature
- **Middleware**: Auth verification, rate limiting, logging
- **Error Handling**: Try-catch with structured error responses

### Data Flow
```
User Action → Context Dispatch → Firebase Service → Cloud Function (if AI) → 
Real-time Listener → Context Update → UI Re-render
```

## Key Decisions

1. **Why Cloud Functions?** - Secure API key management, server-side processing
2. **Why Pinecone?** - Fast vector search for semantic search (vs Firestore Vector Search)
3. **Why useReducer?** - Complex state with multiple update types
4. **Why separate Realtime DB?** - Lower latency for presence/typing than Firestore
5. **Why threads filter on client?** - Firestore has composite indexes, faster than multiple queries
6. **Why GPT-4 for summaries?** - Higher quality, cost justified for user-triggered actions
7. **Why GPT-3.5 for detection?** - Cheaper, fast enough for background processing

