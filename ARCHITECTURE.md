# Aligna System Architecture

**Version:** 2.0 (AI-Enhanced)  
**Last Updated:** October 27, 2025  
**Project:** Aligna - AI-Powered Team Collaboration Platform

---

## Table of Contents

1. [System Overview](#system-overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Frontend Architecture](#frontend-architecture)
4. [Backend Architecture](#backend-architecture)
5. [Data Models](#data-models)
6. [AI Processing Pipeline](#ai-processing-pipeline)
7. [Real-Time Communication](#real-time-communication)
8. [Security Architecture](#security-architecture)
9. [Data Flow Patterns](#data-flow-patterns)
10. [Deployment Architecture](#deployment-architecture)

---

## System Overview

Aligna is a real-time messaging platform built for remote teams, enhanced with AI-powered productivity features. The system combines React Native for cross-platform mobile apps with Firebase for backend infrastructure and OpenAI for intelligent features.

### Key Components

- **Mobile App** (React Native + Expo)
- **Firebase Backend** (Firestore, Realtime DB, Storage, Auth)
- **AI Backend** (Firebase Cloud Functions + OpenAI + Pinecone)
- **Real-time Services** (Presence, Typing Indicators)
- **Push Notifications** (Firebase Cloud Messaging)

---

## High-Level Architecture

```mermaid
flowchart TB
    subgraph Client["Mobile Clients (iOS/Android)"]
        App[React Native App<br/>Expo Router]
    end
    
    subgraph Firebase["Firebase Platform"]
        Auth[Firebase Auth<br/>Email/Password]
        Firestore[(Firestore<br/>Main Database)]
        RealtimeDB[(Realtime DB<br/>Presence/Typing)]
        Storage[Firebase Storage<br/>Profile Pictures]
        FCM[Firebase Cloud<br/>Messaging]
        Functions[Cloud Functions<br/>AI Backend]
    end
    
    subgraph AI["AI Services"]
        OpenAI[OpenAI API<br/>GPT-4 + Embeddings]
        Pinecone[(Pinecone<br/>Vector Database)]
    end
    
    App <-->|Auth Tokens| Auth
    App <-->|Real-time Sync| Firestore
    App <-->|Presence Status| RealtimeDB
    App <-->|Upload/Download| Storage
    App <-->|Push Notifications| FCM
    App -->|HTTPS Calls| Functions
    
    Functions -->|Read/Write| Firestore
    Functions -->|GPT-4 API| OpenAI
    Functions -->|Vector Search| Pinecone
    Functions -->|Send| FCM
    
    style App fill:#4CAF50
    style Functions fill:#FF9800
    style OpenAI fill:#9C27B0
    style Pinecone fill:#2196F3
```

### Technology Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React Native 0.81, Expo ~54, TypeScript 5.9, Expo Router |
| **Backend** | Firebase (Firestore, Realtime DB, Storage, Auth, FCM) |
| **AI Services** | OpenAI (GPT-4, text-embedding-3-small), Pinecone |
| **Cloud Functions** | Node.js 18, TypeScript, Firebase Functions |
| **State Management** | React Context + useReducer |

---

## Frontend Architecture

```mermaid
flowchart TD
    subgraph App["React Native App Structure"]
        subgraph Routing["Expo Router (File-Based)"]
            Auth["/(auth)/<br/>Login, Register,<br/>Profile Setup"]
            Tabs["/(tabs)/<br/>Home, Calendar,<br/>AI Settings"]
            Chat["/chat/[id].tsx<br/>Chat Screen"]
            Thread["/thread/[id].tsx<br/>Thread Modal"]
            GroupInfo["/group-info/[id].tsx<br/>Group Details"]
        end
        
        subgraph Contexts["Global State"]
            AuthCtx[AuthContext<br/>User, Auth State]
            ChatCtx[ChatContext<br/>Conversations,<br/>Messages]
        end
        
        subgraph Components["UI Components"]
            MessageBubble[MessageBubble]
            MessageInput[MessageInput]
            ConversationItem[ConversationItem]
            AIButton[AIButton]
            ThreadSummary[ThreadSummaryCard]
        end
        
        subgraph Services["Firebase Services"]
            AuthSvc[auth.ts]
            FirestoreSvc[firestore.ts]
            RealtimeSvc[realtimeDb.ts]
            StorageSvc[storage.ts]
            NotifSvc[notifications.ts]
            AISvc[ai.ts]
        end
    end
    
    Routing --> Contexts
    Contexts --> Components
    Components --> Services
    Services -->|Firebase SDK| Firebase[(Firebase)]
    
    style Contexts fill:#2196F3
    style Services fill:#4CAF50
```

### Directory Structure

```
/app                          # Expo Router pages
  /(auth)                     # Authentication flow
    login.tsx                 # Login screen
    register.tsx              # Registration
    profile-setup.tsx         # Profile creation
  /(tabs)                     # Main app tabs
    index.tsx                 # Conversations list
    calendar.tsx              # Calendar view
    ai-settings.tsx           # AI feature settings
  /chat/[id].tsx             # Chat screen (dynamic route)
  /thread/[id].tsx           # Thread modal
  /group-info/[id].tsx       # Group info modal
  action-items.tsx           # Action items view
  decisions.tsx              # Decisions log
  search.tsx                 # Semantic search

/components                   # Reusable UI components
  MessageBubble.tsx          # Message display
  MessageInput.tsx           # Message composition
  ConversationItem.tsx       # Conversation list item
  AIButton.tsx               # AI feature trigger
  ThreadSummaryCard.tsx      # Thread summary display
  TypingIndicator.tsx        # Typing animation
  PresenceIndicator.tsx      # Online/offline status

/contexts                     # Global state management
  AuthContext.tsx            # Authentication state
  ChatContext.tsx            # Chat/message state

/services/firebase            # Firebase service layer
  auth.ts                    # Authentication operations
  firestore.ts               # Firestore CRUD operations
  realtimeDb.ts              # Presence/typing indicators
  storage.ts                 # File upload/download
  notifications.ts           # Push notification handling
  ai.ts                      # AI feature API calls

/types                        # TypeScript type definitions
  index.ts                   # User, Message, Conversation, etc.
```

### State Management Pattern

```mermaid
flowchart LR
    UI[UI Component] -->|User Action| Dispatch[Context Dispatch]
    Dispatch -->|Action| Reducer[useReducer]
    Reducer -->|Update State| State[Context State]
    State -->|Re-render| UI
    
    Dispatch -->|Side Effect| Service[Firebase Service]
    Service -->|Response| Listener[Real-time Listener]
    Listener -->|Update| Dispatch
    
    style Reducer fill:#FF9800
    style Service fill:#4CAF50
```

**Key Pattern: Optimistic Updates**

1. User sends message → Dispatch `ADD_MESSAGE` with `tempId`
2. UI updates immediately (status: `sending`)
3. Firebase service sends to Firestore
4. Real-time listener receives confirmed message
5. Dispatch `UPDATE_MESSAGE` with real ID (status: `sent`)
6. UI shows checkmark

---

## Backend Architecture

```mermaid
flowchart TB
    subgraph CloudFunctions["Firebase Cloud Functions"]
        subgraph AI["AI Features"]
            SummarizeThread[summarizeThread]
            ExtractActions[extractActionItems]
            DetectPriority[detectPriority]
            DetectDecisions[detectDecisions]
            DetectScheduling[detectScheduling]
            SemanticSearch[semanticSearch]
            GenerateEmbeddings[generateEmbeddings]
        end
        
        subgraph AutoTriggers["Auto Triggers"]
            AutoPriority[autoDetectPriority<br/>onCreate: messages]
            AutoActions[autoExtractActionItems<br/>onCreate: messages]
            AutoDecisions[autoDetectDecisions<br/>onCreate: messages]
            AutoEmbed[autoGenerateEmbedding<br/>onCreate: messages]
        end
        
        subgraph Utils["Utilities"]
            Auth[auth.ts<br/>Token Verification]
            RateLimit[ratelimit.ts<br/>Rate Limiting]
            Logger[logger.ts<br/>Logging]
            Cache[cache.ts<br/>Response Caching]
        end
    end
    
    subgraph External["External Services"]
        OpenAI[OpenAI API]
        Pinecone[Pinecone Vector DB]
    end
    
    Messages[(messages/<br/>Firestore)] -->|onCreate| AutoTriggers
    Client[Mobile App] -->|HTTPS| AI
    
    AI --> Utils
    AutoTriggers --> Utils
    
    AI --> OpenAI
    AI --> Pinecone
    SemanticSearch --> Pinecone
    GenerateEmbeddings --> OpenAI
    GenerateEmbeddings --> Pinecone
    
    style AutoTriggers fill:#4CAF50
    style AI fill:#FF9800
    style Utils fill:#2196F3
```

### Cloud Functions Architecture

#### Function Modules

```
/functions/src
  /ai                        # AI infrastructure
    openai.ts               # OpenAI client wrapper
    embeddings.ts           # Embedding generation
    prompts.ts              # Prompt templates
    cache.ts                # Response caching
    
  /features                  # AI feature functions
    summarizeThread.ts      # Thread summarization
    extractActionItems.ts   # Action item extraction
    detectPriority.ts       # Priority detection
    detectDecisions.ts      # Decision detection
    detectScheduling.ts     # Scheduling suggestions
    semanticSearch.ts       # Vector-based search
    generateEmbeddings.ts   # Embedding pipeline
    sendPushNotification.ts # Push notifications
    
  /shared                    # Shared utilities
    auth.ts                 # Firebase token verification
    ratelimit.ts            # Per-user rate limiting
    logger.ts               # Structured logging
    
  index.ts                  # Function exports
```

#### Function Types

| Function | Trigger Type | Purpose |
|----------|--------------|---------|
| `summarizeThread` | HTTPS Callable | User-initiated thread summary |
| `extractActionItems` | HTTPS Callable | Manual action item extraction |
| `semanticSearch` | HTTPS Callable | User search query |
| `detectScheduling` | HTTPS Callable | Scheduling suggestions |
| `autoDetectPriority` | Firestore onCreate | Auto-flag priority messages |
| `autoExtractActionItems` | Firestore onCreate | Auto-extract action items |
| `autoDetectDecisions` | Firestore onCreate | Auto-log decisions |
| `autoGenerateEmbedding` | Firestore onCreate | Auto-index for search |

---

## Data Models

### Firestore Collections

```mermaid
erDiagram
    USERS ||--o{ CONVERSATIONS : participates
    CONVERSATIONS ||--o{ MESSAGES : contains
    MESSAGES ||--o{ MESSAGES : "has replies (threadId)"
    MESSAGES ||--o{ ACTION_ITEMS : "generates"
    MESSAGES ||--o{ DECISIONS : "generates"
    MESSAGES ||--o{ MESSAGE_PRIORITIES : "has priority"
    MESSAGES ||--o{ THREAD_SUMMARIES : "summarized by"
    
    USERS {
        string id PK
        string email
        string displayName
        string photoURL
        number createdAt
        boolean aiEnabled
        array fcmTokens
    }
    
    CONVERSATIONS {
        string id PK
        array participants
        string name
        string type
        number lastActivity
        object lastMessage
    }
    
    MESSAGES {
        string id PK
        string conversationId FK
        string threadId FK
        string senderId FK
        string text
        number timestamp
        string status
        array readBy
        number replyCount
        string aiPriority
        boolean hasActionItems
        boolean isDecision
    }
    
    ACTION_ITEMS {
        string id PK
        string conversationId FK
        string threadId FK
        string text
        string assignee FK
        number dueDate
        boolean completed
        string extractedFrom FK
        number confidence
    }
    
    DECISIONS {
        string id PK
        string conversationId FK
        string threadId FK
        string decision
        array participants
        number timestamp
        string extractedFrom FK
    }
    
    MESSAGE_PRIORITIES {
        string id PK
        string priority
        array reasons
        number score
        number detectedAt
    }
    
    THREAD_SUMMARIES {
        string id PK
        string threadId FK
        string conversationId FK
        string summary
        array bulletPoints
        number generatedAt
        number messageCount
        number invalidatedAt
    }
```

### Realtime Database Structure

```
/presence/{userId}
  status: 'online' | 'offline'
  lastSeen: timestamp
  activeConversationId: string?

/typing/{conversationId}/{userId}
  isTyping: boolean
  timestamp: number
```

### Pinecone Vector Index

```
Index: aligna-messages
Dimension: 1536 (text-embedding-3-small)

Metadata per vector:
{
  messageId: string
  conversationId: string
  threadId?: string
  senderId: string
  timestamp: number
  textPreview: string  // First 200 chars
}
```

---

## AI Processing Pipeline

```mermaid
flowchart TB
    subgraph MessageFlow["New Message Flow"]
        User[User Sends Message]
        Client[Mobile App]
        Firestore[(Firestore)]
        
        User -->|1. Send| Client
        Client -->|2. Write| Firestore
    end
    
    subgraph AutoProcessing["Automatic AI Processing"]
        Trigger[onCreate Trigger]
        Priority[Detect Priority]
        Actions[Extract Actions]
        Decisions[Detect Decisions]
        Embed[Generate Embedding]
        
        Firestore -->|3. Trigger| Trigger
        Trigger -->|4. Parallel| Priority
        Trigger -->|4. Parallel| Actions
        Trigger -->|4. Parallel| Decisions
        Trigger -->|4. Parallel| Embed
    end
    
    subgraph Results["Results Storage"]
        PriorityDB[(messagePriorities)]
        ActionsDB[(actionItems)]
        DecisionsDB[(decisions)]
        Pinecone[(Pinecone)]
        
        Priority -->|5. Write| PriorityDB
        Actions -->|5. Write| ActionsDB
        Decisions -->|5. Write| DecisionsDB
        Embed -->|5. Index| Pinecone
    end
    
    subgraph Notification["User Notification"]
        FCM[Push Notification]
        UpdateUI[Update UI]
        
        PriorityDB -->|6. Notify| FCM
        ActionsDB -->|6. Notify| FCM
        DecisionsDB -->|6. Notify| FCM
        
        PriorityDB -->|7. Real-time| UpdateUI
        ActionsDB -->|7. Real-time| UpdateUI
        DecisionsDB -->|7. Real-time| UpdateUI
    end
    
    style AutoProcessing fill:#FF9800
    style Results fill:#4CAF50
    style Notification fill:#2196F3
```

### AI Feature Details

#### 1. Thread Summarization

```mermaid
sequenceDiagram
    participant User
    participant App
    participant Function as summarizeThread
    participant Firestore
    participant Cache
    participant OpenAI
    
    User->>App: Click "Summarize Thread"
    App->>Function: HTTPS Call (threadId)
    Function->>Firestore: Verify user access
    Function->>Cache: Check cache
    
    alt Cache Hit
        Cache-->>Function: Return cached summary
    else Cache Miss
        Function->>Firestore: Fetch thread messages
        Function->>OpenAI: GPT-4 API call
        OpenAI-->>Function: Summary + bullet points
        Function->>Firestore: Write threadSummaries
        Function->>Cache: Cache result (1 hour)
    end
    
    Function-->>App: Return summary
    App->>User: Display summary card
```

**Key Implementation:**
- Uses GPT-4 for high-quality summaries
- Caches for 1 hour or until new messages
- Rate limited to 1 summary/thread/minute per user
- Processes up to 100 messages per thread

#### 2. Semantic Search

```mermaid
sequenceDiagram
    participant User
    participant App
    participant Function as semanticSearch
    participant OpenAI
    participant Pinecone
    participant Firestore
    
    User->>App: Enter search query
    App->>Function: HTTPS Call (query, conversationIds)
    Function->>OpenAI: Generate query embedding
    OpenAI-->>Function: Vector [1536 dims]
    Function->>Pinecone: Vector similarity search
    Pinecone-->>Function: Top K matching messages
    Function->>Firestore: Fetch full message data
    Firestore-->>Function: Message details
    Function-->>App: Ranked search results
    App->>User: Display results
```

**Key Implementation:**
- text-embedding-3-small for cost efficiency
- Vector similarity using cosine distance
- Filters by conversation access rights
- Returns top 20 results with context

#### 3. Priority Detection

**Criteria:**
- Contains urgent keywords ("ASAP", "urgent", "critical")
- Mentions (@user)
- Question marks (implies action needed)
- Time-sensitive language ("today", "now", "deadline")
- Sentiment analysis (high arousal/urgency)

**Scoring:**
- `high`: score ≥ 0.7
- `medium`: score ≥ 0.4
- `low`: score < 0.4

#### 4. Action Item Extraction

**Detected Patterns:**
- "Can you [action]?"
- "Please [action]"
- "[Person] will [action]"
- "Let's [action]"
- "TODO: [action]"

**Output Format:**
```typescript
{
  text: "Deploy the API to production",
  assignee: "userId",  // if mentioned
  dueDate: timestamp,  // if date detected
  confidence: 0.85,    // 0-1 scale
  completed: false
}
```

---

## Real-Time Communication

```mermaid
flowchart TB
    subgraph Clients["Mobile Clients"]
        User1[User A]
        User2[User B]
        User3[User C]
    end
    
    subgraph RealtimeDB["Firebase Realtime DB"]
        Presence["/presence/{userId}"]
        Typing["/typing/{conversationId}/{userId}"]
    end
    
    subgraph Firestore["Firestore"]
        Messages["/conversations/{id}/messages"]
        ReadReceipts["readBy array updates"]
    end
    
    User1 -->|Set online| Presence
    User2 -->|Set online| Presence
    User3 -->|Set online| Presence
    
    User1 -->|Listen| Presence
    User2 -->|Listen| Presence
    User3 -->|Listen| Presence
    
    User1 -->|Typing: true| Typing
    User2 -->|Listen| Typing
    User3 -->|Listen| Typing
    
    User1 -->|Send message| Messages
    Messages -->|Real-time sync| User2
    Messages -->|Real-time sync| User3
    
    User2 -->|Mark read| ReadReceipts
    ReadReceipts -->|Real-time sync| User1
    
    style Presence fill:#4CAF50
    style Typing fill:#FF9800
    style Messages fill:#2196F3
```

### Presence System

**Implementation:**
1. On app foreground → Set `status: 'online'`
2. Set `onDisconnect()` → Set `status: 'offline'`, `lastSeen: timestamp`
3. Listen to `/presence` for all conversation participants
4. Display green dot for online, gray for offline

**Code Pattern:**
```typescript
// services/firebase/realtimeDb.ts
export const setUserPresence = (userId: string) => {
  const presenceRef = ref(realtimeDb, `presence/${userId}`);
  
  // Set online
  set(presenceRef, {
    status: 'online',
    lastSeen: Date.now()
  });
  
  // Set offline on disconnect
  onDisconnect(presenceRef).set({
    status: 'offline',
    lastSeen: Date.now()
  });
};
```

### Typing Indicators

**Implementation:**
1. User types → Debounce 300ms → Set `isTyping: true`
2. Stop typing → Clear after 2 seconds
3. Listen to `/typing/{conversationId}` for all participants
4. Display "Alice is typing..." at bottom of chat

---

## Security Architecture

```mermaid
flowchart TB
    subgraph Client["Mobile App"]
        User[User Action]
        Token[Firebase Auth Token]
    end
    
    subgraph Firebase["Firebase Security"]
        AuthGate[Firebase Auth]
        FirestoreRules[Firestore Rules]
        RealtimeRules[Realtime DB Rules]
        StorageRules[Storage Rules]
    end
    
    subgraph CloudFunctions["Cloud Functions"]
        VerifyToken[Verify ID Token]
        RateLimit[Rate Limiting]
        Function[Function Logic]
    end
    
    subgraph External["External Services"]
        APIKeys[API Keys<br/>Server-side Only]
        OpenAI[OpenAI API]
        Pinecone[Pinecone API]
    end
    
    User -->|1. Authenticate| AuthGate
    AuthGate -->|2. Return token| Token
    Token -->|3. Include in requests| FirestoreRules
    Token -->|3. Include in requests| RealtimeRules
    Token -->|3. Include in requests| StorageRules
    
    Token -->|4. HTTPS Call| VerifyToken
    VerifyToken -->|5. Check rate limit| RateLimit
    RateLimit -->|6. Execute| Function
    
    Function -->|7. Use API keys| APIKeys
    APIKeys --> OpenAI
    APIKeys --> Pinecone
    
    style AuthGate fill:#4CAF50
    style VerifyToken fill:#FF9800
    style APIKeys fill:#F44336
```

### Security Layers

#### 1. Firebase Authentication
- Email/password authentication
- Tokens stored in AsyncStorage
- Auto-refresh on expiry
- Logout clears all tokens

#### 2. Firestore Security Rules

```javascript
// firestore.rules
match /conversations/{convId} {
  allow read: if request.auth != null && 
    request.auth.uid in resource.data.participants;
  allow write: if request.auth != null && 
    request.auth.uid in resource.data.participants;
    
  match /messages/{msgId} {
    allow read: if request.auth != null && 
      request.auth.uid in get(/databases/$(database)/documents/conversations/$(convId)).data.participants;
    allow create: if request.auth != null && 
      request.auth.uid in get(/databases/$(database)/documents/conversations/$(convId)).data.participants;
  }
}
```

#### 3. Cloud Function Security

```typescript
// shared/auth.ts
export const verifyAuthToken = async (
  context: https.CallableContext
): Promise<string> => {
  if (!context.auth) {
    throw new https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }
  return context.auth.uid;
};
```

#### 4. Rate Limiting

```typescript
// shared/ratelimit.ts
const RATE_LIMITS = {
  summarizeThread: { calls: 10, window: 3600 },  // 10/hour
  semanticSearch: { calls: 50, window: 3600 },   // 50/hour
  extractActionItems: { calls: 20, window: 3600 } // 20/hour
};
```

#### 5. API Key Management

- **Storage:** Firebase Functions config (never client-side)
- **Access:** Only Cloud Functions can use API keys
- **Rotation:** Keys rotated quarterly
- **Monitoring:** Track usage and costs

#### 6. PII Protection

Before sending to OpenAI:
- Strip email addresses
- Strip phone numbers
- Strip URLs with query params
- Keep @mentions (user IDs only)

---

## Data Flow Patterns

### 1. Send Message Flow

```mermaid
sequenceDiagram
    participant UI
    participant Context
    participant Service as firestore.ts
    participant Firestore
    participant CloudFn as Cloud Functions
    participant Listener
    
    UI->>Context: sendMessage(text)
    Context->>Context: Generate tempId
    Context->>UI: Optimistic update (sending)
    Context->>Service: addMessage(data)
    Service->>Firestore: Add document
    Firestore-->>Service: Return docId
    Service-->>Context: Return realId
    Context->>UI: Update tempId → realId (sent)
    
    Firestore->>CloudFn: onCreate trigger
    CloudFn->>CloudFn: AI processing (parallel)
    CloudFn->>Firestore: Write AI results
    
    Firestore->>Listener: Real-time update
    Listener->>Context: Message confirmed
    Context->>UI: Show checkmarks
```

### 2. Read Receipt Flow

```mermaid
sequenceDiagram
    participant UserB as User B (Reader)
    participant Firestore
    participant UserA as User A (Sender)
    
    UserB->>UserB: Opens chat
    UserB->>Firestore: Update message.readBy += userId
    Firestore->>UserA: Real-time listener update
    UserA->>UserA: Update UI (✓✓)
```

### 3. Thread Summarization Flow

```mermaid
sequenceDiagram
    participant User
    participant App
    participant Function
    participant Cache
    participant Firestore
    participant OpenAI
    
    User->>App: Click "Summarize"
    App->>Function: summarizeThread(threadId)
    Function->>Cache: Check cache
    
    alt Cache valid
        Cache-->>Function: Return summary
    else Cache invalid/missing
        Function->>Firestore: Fetch messages
        Firestore-->>Function: Messages array
        Function->>OpenAI: Generate summary
        OpenAI-->>Function: Summary + bullets
        Function->>Firestore: Save threadSummary
        Function->>Cache: Cache result
    end
    
    Function-->>App: Return summary
    App->>User: Display ThreadSummaryCard
```

### 4. Semantic Search Flow

```mermaid
sequenceDiagram
    participant User
    participant App
    participant Function
    participant OpenAI
    participant Pinecone
    participant Firestore
    
    User->>App: Enter search query
    App->>Function: semanticSearch(query)
    Function->>OpenAI: Generate embedding
    OpenAI-->>Function: Query vector
    Function->>Pinecone: Similarity search
    Pinecone-->>Function: Top K messageIds
    Function->>Firestore: Batch fetch messages
    Firestore-->>Function: Message data
    Function-->>App: Ranked results
    App->>User: Display search results
```

---

## Deployment Architecture

```mermaid
flowchart TB
    subgraph Developers["Development"]
        Dev[Developer Machine]
        Git[Git Repository]
    end
    
    subgraph CI["Build & Deploy"]
        GitHub[GitHub Actions]
        EAS[EAS Build]
    end
    
    subgraph Firebase["Firebase Hosting"]
        Functions[Cloud Functions<br/>us-central1]
        Firestore[(Firestore)]
        Storage[Storage]
        RealtimeDB[(Realtime DB)]
    end
    
    subgraph Distribution["App Distribution"]
        TestFlight[TestFlight<br/>iOS Beta]
        PlayInternal[Play Console<br/>Internal Testing]
        AppStore[App Store]
        PlayStore[Play Store]
    end
    
    subgraph Monitoring["Monitoring & Logs"]
        FirebaseLogs[Firebase Logs]
        Analytics[Firebase Analytics]
        Crashlytics[Crashlytics]
    end
    
    Dev -->|Push| Git
    Git -->|Trigger| GitHub
    GitHub -->|Build| EAS
    
    Dev -->|Deploy| Functions
    Functions --> Firestore
    Functions --> Storage
    Functions --> RealtimeDB
    
    EAS -->|Beta| TestFlight
    EAS -->|Beta| PlayInternal
    EAS -->|Release| AppStore
    EAS -->|Release| PlayStore
    
    Functions --> FirebaseLogs
    Functions --> Analytics
    EAS --> Crashlytics
    
    style Functions fill:#FF9800
    style EAS fill:#4CAF50
```

### Environment Tiers

| Tier | Purpose | Configuration |
|------|---------|---------------|
| **Development** | Local testing with Expo Go | Firebase Dev project + OpenAI test key |
| **Staging** | EAS builds for QA | Firebase Staging + OpenAI tier 1 |
| **Production** | App Store / Play Store | Firebase Prod + OpenAI tier 2 |

### Deployment Process

1. **Code Changes** → Push to GitHub
2. **Cloud Functions** → `firebase deploy --only functions`
3. **Mobile App** → EAS Build → TestFlight/Play Internal
4. **Firestore Rules** → `firebase deploy --only firestore:rules`
5. **Monitoring** → Check Firebase Console

---

## Performance Considerations

### Caching Strategy

```mermaid
flowchart LR
    Request[API Request] --> Cache{Cache Check}
    Cache -->|Hit| Return[Return Cached]
    Cache -->|Miss| Process[Process Request]
    Process --> OpenAI[OpenAI API]
    OpenAI --> Store[Store in Cache]
    Store --> Return
    
    style Cache fill:#4CAF50
    style OpenAI fill:#FF9800
```

**Cache TTLs:**
- Thread Summaries: 1 hour (invalidate on new messages)
- Embeddings: Permanent (never regenerate)
- Priority Detection: 5 minutes
- Search Results: 15 minutes

### Rate Limiting

| Feature | Limit | Window |
|---------|-------|--------|
| Thread Summarization | 10 calls | per hour per user |
| Semantic Search | 50 queries | per hour per user |
| Action Item Extraction | 20 calls | per hour per user |
| Priority Detection | Auto (no limit) | N/A |

### Cost Optimization

1. **Use GPT-3.5-turbo** for background tasks (priority, actions)
2. **Use GPT-4** only for user-initiated summaries
3. **Batch embeddings** when possible
4. **Cache aggressively** to avoid duplicate API calls
5. **Rate limit** to prevent abuse

---

## Scalability Considerations

### Current Limits (Firebase Free Tier)

- **Firestore:** 20K writes/day, 50K reads/day
- **Cloud Functions:** 2M invocations/month
- **Storage:** 5GB stored, 1GB/day downloads

### Scaling Strategy

1. **Phase 1 (MVP):** Stay within free tier
2. **Phase 2 (Beta):** Upgrade to Blaze (pay-as-you-go)
3. **Phase 3 (Production):** Consider dedicated infrastructure

### Bottleneck Mitigation

| Bottleneck | Solution |
|------------|----------|
| OpenAI rate limits | Implement request queue |
| Firestore read quotas | Aggressive client-side caching |
| Cloud Function cold starts | Keep functions warm with scheduled pings |
| Vector search latency | Optimize Pinecone index settings |

---

## Future Architecture Enhancements

### Phase 3 Roadmap

1. **Real-time Collaboration**
   - Collaborative document editing
   - Shared whiteboards
   - Screen sharing

2. **Advanced AI Features**
   - Meeting transcription
   - Voice message summarization
   - Multi-language translation

3. **Enterprise Features**
   - SSO integration (SAML, OIDC)
   - Admin dashboard
   - Audit logs
   - Custom AI model fine-tuning

4. **Infrastructure Upgrades**
   - Migrate to dedicated Kubernetes cluster
   - Self-hosted vector database
   - Redis for distributed caching
   - WebSocket server for lower latency

---

## References

- [Firebase Documentation](https://firebase.google.com/docs)
- [OpenAI API Reference](https://platform.openai.com/docs)
- [Pinecone Documentation](https://docs.pinecone.io)
- [React Native Docs](https://reactnative.dev)
- [Expo Documentation](https://docs.expo.dev)

---

**Document Maintained By:** Development Team  
**Review Cycle:** Quarterly or after major changes  
**Last Reviewed:** October 27, 2025


