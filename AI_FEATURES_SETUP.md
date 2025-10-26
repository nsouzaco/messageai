# Aligna AI Features - Setup Guide

This guide will help you set up and deploy the AI features for Aligna.

## Prerequisites

### Required Accounts & API Keys

1. **OpenAI Account**
   - Sign up at [https://platform.openai.com](https://platform.openai.com)
   - Create an API key from the dashboard
   - Add payment method (needed for API access)
   - Recommended: Set usage limits to avoid unexpected charges

2. **Pinecone Account**
   - Sign up at [https://www.pinecone.io](https://www.pinecone.io)
   - Free tier includes: 1 index, 100K vectors
   - Get API key from dashboard
   - Note your environment (e.g., `us-east-1`)

3. **Firebase Project**
   - Already set up ✅
   - Upgrade to Blaze (pay-as-you-go) plan to deploy Cloud Functions
   - Firebase CLI installed ✅

## Step 1: Install Dependencies

### Cloud Functions Dependencies

Already installed ✅

```bash
cd functions
npm install
```

### Frontend Dependencies (if needed)

```bash
cd ..
npm install
```

## Step 2: Configure API Keys

### Method A: Firebase Functions Config (Recommended for Production)

```bash
# Set OpenAI API key
firebase functions:config:set openai.key="sk-your-openai-api-key-here"

# Set Pinecone configuration
firebase functions:config:set pinecone.key="your-pinecone-api-key-here"
firebase functions:config:set pinecone.environment="us-east-1"
firebase functions:config:set pinecone.index="aligna-messages"

# Download config for local emulator
firebase functions:config:get > functions/.runtimeconfig.json
```

### Method B: Local Environment Variables (for Testing)

Create `functions/.env.local`:

```bash
OPENAI_API_KEY=sk-your-openai-api-key-here
PINECONE_API_KEY=your-pinecone-api-key-here
PINECONE_ENVIRONMENT=us-east-1
PINECONE_INDEX_NAME=aligna-messages
```

**Note**: `.env.local` is gitignored for security.

## Step 3: Create Pinecone Index

### Option A: Via Pinecone Console

1. Log into [Pinecone Console](https://app.pinecone.io)
2. Click "Create Index"
3. Configuration:
   - **Name**: `aligna-messages`
   - **Dimensions**: `1536` (for text-embedding-3-small)
   - **Metric**: `cosine`
   - **Region**: `us-east-1` (or your preferred region)
   - **Pod Type**: `starter` (free tier)
4. Click "Create Index"

### Option B: Via API/Code

The index will be created automatically on first use, or you can run:

```bash
# Add a script to initialize Pinecone (optional)
# functions/src/scripts/initPinecone.ts
```

## Step 4: Deploy Cloud Functions

### Build TypeScript

```bash
cd functions
npm run build
```

### Deploy to Firebase

```bash
# Deploy all functions
firebase deploy --only functions

# Or deploy specific function
firebase deploy --only functions:summarizeThread
```

### Verify Deployment

```bash
# List deployed functions
firebase functions:list

# Check function logs
firebase functions:log
```

You should see functions:
- `summarizeThread`
- `extractActionItems`
- `detectPriority`
- `autoDetectPriority` (background trigger)
- `semanticSearch`
- `detectDecisions`
- `detectScheduling`
- `cleanupCache` (scheduled)
- `cleanupRateLimitsScheduled` (scheduled)
- `healthCheck`

## Step 5: Test Functions Locally (Optional)

### Start Firebase Emulators

```bash
cd functions
npm run serve
```

This starts:
- Functions emulator on `localhost:5001`
- Firestore emulator
- Auth emulator

### Test Health Check

```bash
curl http://localhost:5001/YOUR_PROJECT_ID/us-central1/healthCheck
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": 1234567890,
  "version": "1.0.0"
}
```

## Step 6: Test in App

### Thread Summarization

1. Open Aligna app on device/simulator
2. Navigate to a group chat
3. Long press a message → "Reply in thread"
4. Add 3+ replies to the thread
5. Tap "Summarize" button in thread header
6. AI summary should appear in 3-5 seconds

### Expected Behavior

- **First request**: ~3-5 seconds (calls OpenAI)
- **Cached request**: ~500ms (from Firestore cache)
- **Rate limit**: Max 5 summaries per minute per user

## Step 7: Monitor Usage & Costs

### Firebase Console

- Go to [Firebase Console](https://console.firebase.google.com)
- Select your project
- Navigate to **Functions** → **Dashboard**
- Monitor:
  - Invocations
  - Execution time
  - Errors

### OpenAI Dashboard

- Go to [OpenAI Usage](https://platform.openai.com/usage)
- Monitor:
  - Token usage
  - API calls
  - Costs

### Pinecone Dashboard

- Go to [Pinecone Console](https://app.pinecone.io)
- Monitor:
  - Vector count
  - Query volume
  - Index usage

## Cost Estimates (MVP with 10 users)

### OpenAI Costs

- **Thread Summaries** (GPT-4):
  - ~1000 tokens per summary
  - ~$0.01-0.03 per summary
  - Est: 50 summaries/day = **$0.50-1.50/day**

- **Priority Detection** (GPT-3.5):
  - ~200 tokens per detection
  - ~$0.001 per detection
  - Auto-runs on every message
  - Est: 500 messages/day = **$0.50/day**

- **Action Items, Decisions** (GPT-3.5):
  - On-demand, ~$0.01 per analysis
  - Est: **$0.10-0.50/day**

- **Embeddings** (text-embedding-3-small):
  - ~$0.0001 per message
  - 500 messages/day = **$0.05/day**

**Total OpenAI**: ~$1-2/day (~$30-60/month)

### Firebase Costs

- **Cloud Functions**:
  - 2M invocations/month free
  - Est: 10K invocations/day (well within free tier)
  - **$0/month**

- **Firestore**:
  - Reads/writes for caching
  - Est: **$1-2/month**

### Pinecone Costs

- **Free Tier**: 100K vectors, 1 index
- Enough for ~100K messages
- **$0/month** (free tier sufficient for MVP)

### Total Estimated Costs

- **MVP (10 users)**: $30-80/month
- **Growth (100 users)**: $200-500/month

## Optimization Tips

1. **Cache Aggressively**
   - Thread summaries cached for 1 hour
   - Embeddings never regenerated
   - Rate limiting prevents abuse

2. **Use GPT-3.5 Where Possible**
   - 10x cheaper than GPT-4
   - Use for background tasks (priority, action items)
   - Reserve GPT-4 for user-triggered summaries

3. **Batch Operations**
   - Generate embeddings in batches
   - Reduces API calls

4. **Monitor & Adjust**
   - Set OpenAI spending limits
   - Adjust rate limits if costs spike
   - Consider user quotas for heavy users

## Troubleshooting

### Error: "OpenAI API key not configured"

**Solution**: Set the API key in Firebase config:
```bash
firebase functions:config:set openai.key="your-key"
firebase deploy --only functions
```

### Error: "Pinecone index not found"

**Solution**: Create the index in Pinecone console (see Step 3)

### Error: "Rate limit exceeded"

**Solution**: Wait 60 seconds. Rate limits reset every minute.

### Error: "Insufficient permissions"

**Solution**: Ensure Firebase project is on Blaze plan and Cloud Functions are enabled.

### Function timeout

**Solution**: Increase timeout in function definition:
```typescript
.runWith({ timeoutSeconds: 540 })
```

### High OpenAI costs

**Solutions**:
- Reduce rate limits
- Disable auto-priority detection
- Use GPT-3.5 instead of GPT-4
- Implement user quotas

## Security Checklist

- [ ] API keys stored in Firebase config (not in code)
- [ ] Firebase Security Rules updated for new collections
- [ ] Rate limiting enabled on all functions
- [ ] User authentication required for all functions
- [ ] OpenAI spending limits set
- [ ] No PII sent to OpenAI (strip emails, phone numbers)
- [ ] Error messages don't expose internal details

## Firebase Security Rules

Add these to `firestore.rules`:

```javascript
// AI-related collections
match /threadSummaries/{summaryId} {
  allow read: if request.auth != null;
  allow write: if false; // Only Cloud Functions can write
}

match /actionItems/{itemId} {
  allow read: if request.auth != null && 
    resource.data.conversationId in getConversationIds(request.auth.uid);
  allow update: if request.auth != null && 
    (request.resource.data.diff(resource.data).affectedKeys().hasOnly(['completed']));
}

match /decisions/{decisionId} {
  allow read: if request.auth != null &&
    resource.data.conversationId in getConversationIds(request.auth.uid);
  allow write: if false;
}

match /messagePriorities/{messageId} {
  allow read: if request.auth != null;
  allow write: if false;
}
```

## Next Steps

1. ✅ Backend deployed and working
2. ⏳ Test thread summarization with real data
3. ⏳ Add remaining AI features to frontend:
   - Action Items screen
   - Priority inbox view
   - Semantic search
   - Decisions log
4. ⏳ User testing and feedback
5. ⏳ Optimize prompts based on results
6. ⏳ Add user settings for AI opt-in/opt-out

## Support

For issues or questions:
- Check Firebase Functions logs: `firebase functions:log`
- Review OpenAI dashboard for API errors
- Check Pinecone console for vector storage issues

---

**Status**: Backend complete ✅ | Frontend integration in progress 🚧

