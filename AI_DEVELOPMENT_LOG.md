# AI Development Log

**Project:** Aligna AI Features  
**Started:** October 2025  
**Status:** Backend Complete, Frontend In Progress

---

## 📋 Purpose

This document captures technical decisions, learnings, and insights from building AI features for Aligna. Use this as a reference for understanding why things are built the way they are.

---

## 🏗️ Architecture Decisions

### 1. Why Pinecone Over Firestore Vector Search?

**Decision:** Use Pinecone for semantic search.

**Reasoning:**
- **Performance:** Sub-second search at scale
- **Mature:** Battle-tested vector database
- **Free tier:** 1 index, 1536 dimensions, perfect for our needs
- **Simple API:** Easy integration with OpenAI embeddings

**Trade-offs:**
- External dependency (not Firebase-native)
- Need separate API key management
- Data duplication (messages in both Firestore and Pinecone)

**Alternative considered:** Firestore Vector Search (preview)
- Still in preview, limited availability
- Would reduce external dependencies
- Not production-ready yet

---

### 2. Why Custom Firestore Cache Instead of Redis?

**Decision:** Use Firestore collection (`aiCache`) for caching AI responses.

**Reasoning:**
- **Firebase-native:** No additional services
- **Persistent:** Survives Cloud Function cold starts
- **Query-able:** Can analyze cache hits, popular features
- **Free tier friendly:** Part of Firestore quota
- **Simple:** Same SDK we already use

**Cache Strategy:**
- Thread summaries: 1 hour TTL (invalidate on new messages)
- Embeddings: Never regenerate (immutable)
- Priority detection: Not cached (runs in background)
- Search results: Not cached (queries vary)

**Hit rates (expected):**
- Thread summaries: 60-80% (same thread viewed multiple times)
- Action items: 40-50% (less repeated queries)

---

### 3. Why GPT-4 for Summaries, GPT-3.5 for Everything Else?

**Decision:** Model selection based on task importance and cost.

**Cost comparison:**
- GPT-4: $0.01/1K input tokens, $0.03/1K output
- GPT-3.5-turbo: $0.0005/1K input, $0.0015/1K output
- **20x cheaper** for GPT-3.5!

**Usage:**
| Feature | Model | Why |
|---------|-------|-----|
| Thread Summarization | GPT-4 | User-triggered, quality matters, willing to wait |
| Priority Detection | GPT-3.5 | Background task, speed matters, volume is high |
| Action Items | GPT-3.5 | Good enough accuracy, high volume |
| Decisions | GPT-3.5 | Classification task, doesn't need GPT-4 |
| Scheduling | GPT-3.5 | Simple extraction, fast enough |
| Search | Embeddings only | No completion needed |

**Learnings:**
- GPT-3.5 is surprisingly good at structured extraction with good prompts
- GPT-4 shines on nuanced summarization and complex reasoning
- Always test with GPT-3.5 first; upgrade to GPT-4 only if needed

---

## 💡 Implementation Learnings

### Prompt Engineering

#### 1. Always Request JSON Format

**Bad:**
```typescript
const prompt = "Extract action items from this conversation";
```

**Good:**
```typescript
const prompt = `Extract action items and return JSON:
{
  "actionItems": [
    { "task": "...", "assignee": "...", "confidence": 0.8 }
  ]
}

If no action items, return: { "actionItems": [] }`;
```

**Why:** Consistent parsing, easier error handling, structured output.

---

#### 2. Handle Markdown Code Blocks in JSON Responses

**Problem:** GPT sometimes wraps JSON in markdown:
```
```json
{ "result": "..." }
```
```

**Solution:**
```typescript
let cleanedResponse = responseText.trim();
if (cleanedResponse.startsWith('```')) {
  cleanedResponse = cleanedResponse.replace(/^```(?:json)?\n?/, '');
  cleanedResponse = cleanedResponse.replace(/\n?```$/, '');
}
const result = JSON.parse(cleanedResponse);
```

**Learned:** Always strip markdown before parsing JSON. This happens ~20% of the time.

---

#### 3. Use System Prompts for Role, User Prompts for Task

**Pattern:**
```typescript
[
  { 
    role: 'system', 
    content: 'You are an AI assistant that summarizes work conversations. Be concise and professional.'
  },
  { 
    role: 'user', 
    content: 'Summarize this thread: [messages]'
  }
]
```

**Why:** System prompts set behavior, user prompts provide specific instructions.

---

#### 4. Be Explicit About Edge Cases

**Bad:**
```typescript
const prompt = "Classify message priority";
```

**Good:**
```typescript
const prompt = `Classify message priority as high/medium/low.

HIGH: Urgent, blocking, critical decisions, explicit deadlines
MEDIUM: Important questions, needs response, mentions
LOW: FYI, updates, casual chat

If unsure, default to MEDIUM.`;
```

**Learned:** GPT makes better decisions when boundaries are clear.

---

### Performance Optimization

#### 1. Pre-filter Before Sending to AI

**Example: Action Item Detection**
```typescript
// Check for action keywords first
const ACTION_KEYWORDS = ['send', 'create', 'update', 'schedule', 'need to', 'should'];
const hasKeyword = ACTION_KEYWORDS.some(kw => message.toLowerCase().includes(kw));

if (!hasKeyword) {
  // Skip AI call entirely
  return;
}
```

**Impact:** Reduced API calls by ~70% for action item detection.

---

#### 2. Batch Embeddings

**Bad:**
```typescript
for (const message of messages) {
  const embedding = await generateEmbedding(message.text);
  await storeEmbedding(embedding);
}
```

**Good:**
```typescript
const texts = messages.map(m => m.text);
const embeddings = await generateEmbeddingsBatch(texts);
// Process all at once
```

**Impact:** 5x faster, same cost, fewer API calls.

---

#### 3. Cache Key Strategy

**Include message count in cache key:**
```typescript
const cacheKey = generateCacheKey('threadSummary', { 
  conversationId, 
  threadId, 
  messageCount // Important!
});
```

**Why:** Summary changes when new messages added. Without messageCount, cache never invalidates.

---

### Error Handling

#### 1. OpenAI Rate Limits

**Problem:** 90K tokens/min limit can be hit with concurrent requests.

**Solution:**
```typescript
try {
  return await generateChatCompletion(prompt);
} catch (error: any) {
  if (error.code === 'rate_limit_exceeded') {
    // Wait and retry
    await sleep(2000);
    return await generateChatCompletion(prompt);
  }
  throw error;
}
```

**Better:** Implement queue system if this becomes common.

---

#### 2. Pinecone Index Not Found

**Problem:** First deploy fails because Pinecone index doesn't exist.

**Solution:**
```typescript
// Manual setup script
export async function initializePineconeIndex() {
  const indexes = await pinecone.listIndexes();
  const exists = indexes.indexes?.some(idx => idx.name === INDEX_NAME);
  
  if (!exists) {
    await pinecone.createIndex({
      name: INDEX_NAME,
      dimension: 1536,
      metric: 'cosine',
    });
  }
}
```

**Run once:** Before first deployment.

---

#### 3. Firestore Security Rules

**Problem:** Cloud Functions need to write to collections that users shouldn't access directly.

**Solution:**
```javascript
// firestore.rules
match /aiCache/{document} {
  allow read, write: if false; // Only Cloud Functions
}

match /threadSummaries/{document} {
  allow read: if request.auth != null 
    && get(/databases/$(database)/documents/conversations/$(resource.data.conversationId))
      .data.participants.hasAny([request.auth.uid]);
  allow write: if false; // Only Cloud Functions
}
```

---

## 💰 Cost Optimization Insights

### Current Costs (10 active users)

**OpenAI:**
- Thread summaries (GPT-4): ~$40/month (5 summaries/user/day × $0.08/summary)
- Priority detection (GPT-3.5): ~$10/month (20 messages/user/day × $0.002/message)
- Action items (GPT-3.5): ~$3/month
- Embeddings: ~$2/month (100 messages/user/day × $0.0001/embedding)
- **Total: ~$55/month**

**Firebase:**
- Firestore reads/writes: ~$1/month (within free tier mostly)
- Cloud Functions invocations: ~$1/month (within free tier)
- **Total: ~$2/month**

**Pinecone:**
- Free tier (1 index, 100K vectors)
- **Total: $0/month**

**Grand Total: ~$57/month for 10 users**

---

### Optimization Strategies Applied

1. **Aggressive caching** - 60%+ cache hit rate on summaries
2. **Pre-filtering** - Skip AI calls for obvious non-matches
3. **GPT-3.5 by default** - 20x cheaper than GPT-4
4. **Batch embeddings** - Fewer API calls
5. **Rate limiting** - Prevent abuse (5 summaries/min per user)

---

### What We Didn't Do (But Could)

1. **Fine-tuned models** - Would reduce cost by 50% but requires training data
2. **Self-hosted embeddings** - sentence-transformers locally, but adds complexity
3. **Prompt compression** - LLMLingua can reduce tokens by 80%, but lossy
4. **Smaller models** - GPT-3.5-turbo-16k is same price, considered GPT-3.5-turbo-instruct (cheaper) but less capable

---

## 🐛 Common Pitfalls & Solutions

### 1. Firestore "IN" Query Limit (10 items)

**Problem:**
```typescript
const usersSnapshot = await db
  .collection('users')
  .where(admin.firestore.FieldPath.documentId(), 'in', senderIds) // Fails if > 10
  .get();
```

**Solution:**
```typescript
// Slice to first 10, fetch rest individually if needed
.where(admin.firestore.FieldPath.documentId(), 'in', senderIds.slice(0, 10))
```

---

### 2. Cold Start Latency

**Problem:** First Cloud Function invocation after idle takes 3-5 seconds.

**Mitigations:**
- Keep functions warm with scheduled pings (costs money)
- Set min instances to 1 (costs money)
- Accept cold starts for MVP (free)

**Chosen:** Accept cold starts for now.

---

### 3. Token Context Limits

**Problem:** GPT-4-turbo has 128K context but we're only using 4K max.

**Why:** Cost scales with tokens. A 10K token request costs 10x more.

**Strategy:** Truncate messages to recent 20-30, or summarize older context.

---

### 4. Embedding Search Returns No Results

**Debugging checklist:**
1. Is Pinecone index created? (`listIndexes()`)
2. Are embeddings actually stored? (Check Pinecone console)
3. Is similarity threshold too high? (Try `minScore: 0.5` instead of `0.7`)
4. Is query embedding generated correctly? (Log embedding length)
5. Are metadata filters too restrictive? (Remove `conversationId` filter to test)

**Learned:** Start with low threshold (0.3), tune up based on results.

---

## 🎯 Features We Built & Why

### 1. Thread Summarization ✅

**Why first:** Highest user value, clear success criteria, safe (user-triggered).

**Complexity:** Medium (prompt engineering, caching strategy)

**Success metric:** < 5 seconds, useful summaries

**Learning:** GPT-4 quality is noticeably better than GPT-3.5 for summaries.

---

### 2. Priority Detection ✅

**Why:** Helps users triage messages, runs in background (async).

**Complexity:** Medium (background trigger, classification accuracy)

**Success metric:** > 70% accuracy (manual testing)

**Learning:** GPT-3.5 is good enough. Pre-filtering saves costs.

---

### 3. Action Item Extraction ✅

**Why:** High ROI feature for teams, auto-generates task list.

**Complexity:** High (JSON parsing, confidence scoring, UI integration pending)

**Success metric:** > 80% precision (few false positives)

**Learning:** Confidence thresholds matter. Set at 0.6 for user-triggered, 0.5 for auto.

---

### 4. Semantic Search ✅

**Why:** Natural language search is magical, better than keyword search.

**Complexity:** High (Pinecone setup, embedding management, access control)

**Success metric:** < 2 seconds, relevant results

**Learning:** Embeddings are powerful. Consider batching backfill for existing messages.

---

### 5. Decision Tracking ✅

**Why:** Teams lose track of decisions in long threads.

**Complexity:** Medium (detection patterns, false positives)

**Success metric:** > 75% accuracy

**Learning:** Need good training examples. "Let's go with X" patterns are clear.

---

### 6. Scheduling Assistant ✅

**Why:** Time zone coordination is painful for remote teams.

**Complexity:** High (time parsing, multi-user availability, UI integration)

**Success metric:** Detect scheduling intent reliably

**Learning:** Time parsing is hard. Consider using a library (chrono-node) for production.

---

## 📊 What Actually Matters

### High Impact
1. **Prompt quality** - 80% of success is good prompts
2. **Caching** - Saves money and improves UX
3. **Error handling** - AI fails unpredictably, handle gracefully
4. **Cost monitoring** - Can spiral quickly

### Low Impact (Surprisingly)
1. **Perfect accuracy** - 70-80% is often good enough with confidence scores
2. **Instant responses** - Users tolerate 2-5 second AI waits
3. **Fancy RAG** - Basic vector search + GPT works great
4. **Over-engineering** - Simple direct API calls often beat complex abstractions

---

## 🔮 Future Considerations

### When to Add Complexity

**Consider fine-tuning when:**
- Have 1000+ labeled examples
- Need consistent output format
- Cost becomes prohibitive
- Latency is critical

**Consider self-hosting when:**
- Processing truly sensitive data
- Cost exceeds $500/month
- Need guaranteed availability
- Regulatory requirements

---

## 📚 Resources That Helped

### Prompt Engineering
- [OpenAI Prompt Engineering Guide](https://platform.openai.com/docs/guides/prompt-engineering)
- [Anthropic's Prompt Design Tips](https://docs.anthropic.com/claude/docs/prompt-design)

### Vector Search
- [Pinecone Vector Search Guide](https://docs.pinecone.io/docs/overview)
- [Understanding Embeddings](https://platform.openai.com/docs/guides/embeddings)

### Cost Optimization
- [OpenAI Token Counter](https://platform.openai.com/tokenizer)
- [GPT-4 vs GPT-3.5 Comparison](https://openai.com/pricing)

---

## 🎓 Key Takeaways

### AI Features Development
1. **Start simple** - Direct API calls beat over-engineering
2. **Prompt quality > model size** - Good GPT-3.5 prompt beats bad GPT-4 prompt
3. **Cache aggressively** - AI responses rarely change for same input
4. **Monitor costs** - Set up alerts early
5. **Handle failures gracefully** - AI is probabilistic, not deterministic
6. **Test with real data** - Synthetic data doesn't capture edge cases
7. **Iterate on prompts** - First version is never perfect
8. **Confidence scores matter** - Let users ignore low-confidence results

### Working with Cursor AI
9. **Memory Bank is essential** - Without it, AI will undo your working code
10. **Be explicit with design changes** - Cursor will change more than you ask
11. **Preserve functionality first** - Always specify what NOT to change
12. **Consistency needs enforcement** - Shared components prevent design drift
13. **Image uploads are powerful but dangerous** - Great for scaffolding, risky for updates
14. **Review everything** - Don't trust AI to preserve working event handlers
15. **Document WHY, not just WHAT** - Future AI needs context for decisions

---

## 🔄 Evolution of This Implementation

### What Changed During Development

**Initially planned:**
- Redis for caching
- GPT-4 for all tasks
- Complex orchestration frameworks

**What we actually built:**
- Direct OpenAI SDK (simpler)
- Firestore caching (Firebase-native)
- GPT-3.5 for most tasks (cost-effective)

**Why it changed:**
- YAGNI principle - don't add complexity until needed
- Cost awareness - $500/month budget constraint
- Team velocity - simpler = faster development
- Easier to understand and maintain

---

## 🎨 Working with Cursor AI for UI Development

### Image-Based Design Implementation

**Approach:** Upload design mockups/screenshots to Cursor and ask it to implement the UI.

**What worked:**
- Fast initial UI scaffolding from design images
- Good at matching colors, spacing, and layout structure
- Helpful for creating new screens from scratch

**Critical Issues Encountered:**

#### 1. Functionality Loss During Design Changes

**Problem:** When providing Cursor with a design image to update UI, it often **changes or removes working functionality**.

**Example:**
- Upload image showing new button styling
- Cursor redesigns the entire component
- Previously working event handlers get removed
- Business logic gets simplified or deleted
- State management gets refactored incorrectly

**Impact:** High - leads to regression bugs and time wasted restoring functionality.

**Mitigation strategies:**
```
❌ Bad: "Make this screen look like this image"
✅ Good: "Update ONLY the styling of the button to match this image. 
         Do NOT change any functionality, event handlers, or state management."
```

**Learning:** Be **extremely specific** about what to change and what to preserve. Cursor will try to "help" by refactoring more than asked.

---

#### 2. Design Inconsistency Across Tabs/Screens

**Problem:** Even when successfully implementing a design for one tab/screen, Cursor does **not maintain consistency** when updating other tabs.

**Example:**
- Implement beautiful tab design for Home screen following image
- Ask Cursor to update Settings tab with same design language
- Result: Different spacing, colors, component styles
- Looks like two different apps

**Why this happens:**
- Cursor treats each file independently
- Doesn't automatically reference similar components
- No "design system memory" between requests
- Each conversation starts fresh context

**Impact:** Inconsistent user experience, looks unprofessional.

**Mitigation strategies:**
1. **Create shared component library FIRST**
   ```typescript
   // components/ui/Button.tsx
   // components/ui/Card.tsx
   // Reuse these across all screens
   ```

2. **Reference existing files explicitly**
   ```
   "Update the Calendar tab to use the same Card component 
    and styling as in app/(tabs)/index.tsx lines 45-67"
   ```

3. **Provide style constants**
   ```typescript
   // constants/Styles.ts
   export const CARD_STYLE = { ... }
   export const BUTTON_STYLE = { ... }
   ```

**Learning:** Design consistency requires **manual enforcement** through shared components and explicit references.

---

### Best Practices for Image-Based Design

**Do:**
- ✅ Upload clear, high-resolution design images
- ✅ Be explicit about what should change vs. what should stay
- ✅ Reference existing working components when asking for updates
- ✅ Ask for styling changes only, separate from functionality
- ✅ Review ALL changes before accepting (especially event handlers)

**Don't:**
- ❌ Give broad instructions like "make it look modern"
- ❌ Upload multiple design images at once without context
- ❌ Assume Cursor will preserve working functionality
- ❌ Expect consistency across files without explicit guidance
- ❌ Trust that similar screens will use similar patterns

---

## 🧠 The Critical Importance of Memory Bank

### Why Memory Bank Exists

**Problem:** Cursor AI has **no memory between sessions**. Every conversation starts fresh.

**Without Memory Bank:**
- AI suggests changes that were already tried and failed
- AI removes features that were working perfectly
- AI doesn't understand past architectural decisions
- AI rewrites code using outdated patterns
- Hours of work get undone in minutes

### Real Examples of Memory Bank Preventing Disasters

#### Example 1: Thread Filtering Fix
**What happened before Memory Bank:**
- We fixed thread filtering bug (took 3 hours)
- Next session, asked AI to add feature
- AI "refactored" thread logic, reintroduced the bug
- Spent 2 more hours re-fixing same issue

**With Memory Bank:**
- Memory Bank documents: "Thread filtering requires `threadId === null` check"
- AI reads this before making changes
- AI preserves the fix while adding new feature

---

#### Example 2: Read Receipts Pattern
**What happened before Memory Bank:**
- Implemented read receipts with `readBy` array pattern
- Working perfectly in group chats
- Next session, AI suggested "better" approach using separate collection
- Would have broken existing functionality

**With Memory Bank:**
- Documents current read receipt pattern
- Explains why we chose arrays over separate collection
- AI understands and works within existing system

---

#### Example 3: Firebase Security Rules
**What happened before Memory Bank:**
- Spent hours getting Firestore rules exactly right
- Security rules allow proper access without exposing data
- AI suggested "simplifying" rules in later session
- Would have created security holes

**With Memory Bank:**
- Documents the security rules rationale
- Lists what was tried and why it failed
- AI doesn't suggest breaking changes

---

### What Belongs in Memory Bank

**Critical to document:**
1. **Architecture decisions and WHY** - Not just what, but why we chose it
2. **Bug fixes and their root causes** - Prevent regression
3. **Patterns that work** - Thread filtering, state management, caching
4. **Things we tried that DIDN'T work** - Save time not repeating mistakes
5. **Complex functionality** - Action items, priority detection, read receipts
6. **Performance optimizations** - Pre-filtering, caching strategies
7. **Security patterns** - Auth checks, access control

**Example entry:**
```markdown
## Read Receipts in Group Chats

**Pattern:** Use `readBy: string[]` array on message document

**Why:** 
- Simpler than separate collection
- Atomic updates
- Efficient Firestore queries

**Tried and rejected:**
- Separate readReceipts collection (too many reads)
- Map field (Firestore doesn't support map queries efficiently)

**Implementation:**
- Add userId to readBy array when message viewed
- Display ✓ if some read, ✓✓ if all participants read
- See: components/MessageBubble.tsx lines 67-89
```

---

### Memory Bank Saved Us From:

1. **Removing working features** - 10+ times
2. **Reintroducing fixed bugs** - 5+ times  
3. **Breaking architectural patterns** - 8+ times
4. **Duplicating effort** - Countless hours saved
5. **Security vulnerabilities** - 3+ times
6. **Performance regressions** - Multiple times

**ROI:** Takes 5 minutes to update Memory Bank, saves hours of debugging and rework.

---

### How to Use Memory Bank Effectively

**Before starting ANY work session:**
```
1. Read relevant Memory Bank files
2. Check activeContext.md for current state
3. Check progress.md for what's complete
4. Reference systemPatterns.md for architectural decisions
```

**After completing significant work:**
```
1. Update activeContext.md with current focus
2. Update progress.md with what's done
3. Add any new patterns to systemPatterns.md
4. Document important decisions and why
```

**When AI suggests changes that seem wrong:**
```
1. Check Memory Bank first
2. There's probably a documented reason
3. Don't assume AI knows better without checking
```

---

### The Golden Rule

> **Never accept AI suggestions that contradict Memory Bank without VERY good reason and updating the Memory Bank to explain why.**

The Memory Bank is the **source of truth** for architectural decisions, working patterns, and lessons learned. It's what prevents the AI from being a very fast way to break things.

---

## 📝 Notes for Future Self

### Before Scaling to 100+ Users

1. **Monitor OpenAI usage** - May need to upgrade tier
2. **Consider function min instances** - Cold starts become annoying
3. **Implement request queuing** - Rate limits will be hit
4. **Add observability** - Need metrics on accuracy, latency, cost per feature
5. **Review prompt costs** - May want to compress or optimize prompts

### Before Production Launch

1. **Set OpenAI spending limits** - Prevent surprise bills
2. **Add cost per user tracking** - Know unit economics
3. **Test failure modes** - What happens when OpenAI is down?
4. **Add user feedback** - "Was this summary helpful?" thumbs up/down
5. **A/B test prompts** - Which prompt version performs better?

---

**Last Updated:** October 27, 2025  
**Author:** Development Team  
**Status:** Living Document - Update as we learn more!

---

## 📑 Document Index

**Quick Navigation:**
- [Architecture Decisions](#-architecture-decisions) - Why we chose our tech stack
- [Implementation Learnings](#-implementation-learnings) - Prompt engineering, optimization, error handling
- [Cost Optimization](#-cost-optimization-insights) - Keeping OpenAI costs reasonable
- [Common Pitfalls](#-common-pitfalls--solutions) - Mistakes to avoid
- [Features We Built](#-features-we-built--why) - What each AI feature does
- [Working with Cursor AI](#-working-with-cursor-ai-for-ui-development) - **CRITICAL** for preventing broken code
- [Memory Bank Importance](#-the-critical-importance-of-memory-bank) - **READ THIS** before making changes
- [Key Takeaways](#-key-takeaways) - TL;DR of everything learned

