# Aligna AI Features - Cloud Functions

Firebase Cloud Functions that power AI features in Aligna.

## Features

1. **Thread Summarization** - Auto-generate summaries of thread conversations
2. **Action Item Extraction** - Auto-detect tasks from messages
3. **Priority Detection** - Auto-flag urgent/important messages
4. **Smart Search** - Semantic search using embeddings
5. **Decision Tracking** - Auto-detect and log decisions
6. **Scheduling Assistant** - Suggest meeting times across time zones

## Setup

### Prerequisites

- Node.js 18+
- Firebase CLI (`npm install -g firebase-tools`)
- OpenAI API key
- Pinecone account and API key

### Installation

1. Install dependencies:
   ```bash
   cd functions
   npm install
   ```

2. Set up environment variables:
   ```bash
   # Copy example file
   cp .env.example .env.local
   
   # Edit .env.local with your API keys
   ```

3. Configure Firebase Functions environment:
   ```bash
   firebase functions:config:set openai.key="your_openai_api_key"
   firebase functions:config:set pinecone.key="your_pinecone_api_key"
   firebase functions:config:set pinecone.environment="us-east-1"
   firebase functions:config:set pinecone.index="aligna-messages"
   ```

### Development

1. Build TypeScript:
   ```bash
   npm run build
   ```

2. Run locally with Firebase Emulators:
   ```bash
   npm run serve
   ```

3. Watch mode for development:
   ```bash
   npm run build:watch
   ```

### Deployment

Deploy all functions:
```bash
npm run deploy
```

Deploy specific function:
```bash
firebase deploy --only functions:summarizeThread
```

## API Documentation

### summarizeThread

Generate AI summary of a thread conversation.

**Request:**
```typescript
{
  conversationId: string;
  threadId: string;
}
```

**Response:**
```typescript
{
  summary: string;
  bulletPoints: string[];
  messageCount: number;
  generatedAt: number;
  cached: boolean;
}
```

### extractActionItems

Extract action items from recent messages.

**Request:**
```typescript
{
  conversationId: string;
  threadId?: string;
  messageLimit?: number; // default: 20
}
```

**Response:**
```typescript
{
  actionItems: ActionItem[];
  count: number;
}
```

### detectPriority

Detect message priority (high/medium/low).

**Request:**
```typescript
{
  messageId: string;
  conversationId: string;
}
```

**Response:**
```typescript
{
  messageId: string;
  priority: 'high' | 'medium' | 'low';
  score: number;
  reasons: string[];
}
```

### semanticSearch

Search messages using semantic similarity.

**Request:**
```typescript
{
  query: string;
  conversationId?: string;
  topK?: number; // default: 10
  minScore?: number; // default: 0.7
}
```

**Response:**
```typescript
{
  results: SearchResult[];
  count: number;
  query: string;
}
```

### detectDecisions

Detect decisions from recent messages.

**Request:**
```typescript
{
  conversationId: string;
  threadId?: string;
  messageLimit?: number; // default: 20
}
```

**Response:**
```typescript
{
  decisions: Decision[];
  count: number;
}
```

### detectScheduling

Detect scheduling intent and suggest times.

**Request:**
```typescript
{
  conversationId: string;
  messageLimit?: number; // default: 10
}
```

**Response:**
```typescript
{
  hasSchedulingIntent: boolean;
  suggestion?: SchedulingSuggestion;
}
```

## Rate Limits

- Thread Summarization: 5 requests/minute per user
- Action Items: 10 requests/minute per user
- Priority Detection: 20 requests/minute per user
- Semantic Search: 10 requests/minute per user
- Decision Detection: 10 requests/minute per user
- Scheduling Detection: 10 requests/minute per user

## Cost Optimization

- Thread summaries are cached for 1 hour
- Embeddings are never regenerated
- GPT-4 used only for summaries (user-triggered)
- GPT-3.5-turbo used for background detection tasks
- Automatic cleanup of expired cache and rate limits

## Monitoring

View logs:
```bash
npm run logs
```

Check function status:
```bash
firebase functions:list
```

## Testing

Run emulators for local testing:
```bash
npm run serve
```

Test with curl:
```bash
curl http://localhost:5001/YOUR_PROJECT_ID/us-central1/healthCheck
```

## Troubleshooting

### "OpenAI API key not configured"

Set the environment variable:
```bash
firebase functions:config:set openai.key="your_key"
```

### "Pinecone index not found"

Create the index first using the Pinecone console or API.

### Cold start timeouts

Cloud Functions have a cold start time. The first request may be slow. Consider using min instances for production:
```typescript
.runWith({ minInstances: 1 })
```

## Architecture

```
/src
  /ai - Core AI services
    - openai.ts - OpenAI client wrapper
    - embeddings.ts - Pinecone vector operations
    - prompts.ts - Prompt templates
    - cache.ts - Response caching
  
  /features - AI feature functions
    - summarizeThread.ts
    - extractActionItems.ts
    - detectPriority.ts
    - semanticSearch.ts
    - detectDecisions.ts
    - detectScheduling.ts
  
  /shared - Utilities
    - auth.ts - Authentication middleware
    - ratelimit.ts - Rate limiting
    - logger.ts - Structured logging
  
  - index.ts - Main exports
```

## Security

- All functions verify Firebase auth tokens
- Users can only access their own conversations
- API keys stored server-side only
- Rate limiting prevents abuse
- Input validation on all requests

## License

Proprietary - Aligna

