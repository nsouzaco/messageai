# Semantic Search Fixes & Improvements

## Date: October 26, 2025

## Issue
Semantic search was returning no results even when relevant messages existed in Pinecone.

## Root Cause Analysis

### Investigation Steps
1. Added debug logging to track embedding generation and Pinecone responses
2. Discovered Pinecone was returning 10 matches with scores ranging from 0.259 to 0.587
3. Found that all results were being filtered out despite having reasonable similarity scores

### The Bug
**File:** `functions/src/ai/embeddings.ts` line 145

**Original Code:**
```typescript
const minScore = options.minScore || 0.7;
```

**Problem:** 
- The function call passed `minScore=0.1` to be more permissive
- However, the `||` operator logic meant the hardcoded default of `0.7` was still being used
- All search results with scores below 0.7 were filtered out
- The highest scoring match (0.587) was below the threshold, so no results returned

## Solution

### Code Changes

**File:** `functions/src/ai/embeddings.ts`

1. **Fixed minScore threshold logic:**
```typescript
// Before
const minScore = options.minScore || 0.7;

// After
const minScore = options.minScore !== undefined ? options.minScore : 0.7;
```

2. **Adjusted default parameters in semanticSearch:**
```typescript
const { query, conversationId, topK = 30, minScore = 0.1 } = data;
```

3. **Removed unnecessary pattern matching:**
- Initially tried to preprocess queries by removing question words
- Realized AI embeddings handle semantic meaning naturally
- Removed all preprocessing - queries now pass directly to embedding API

4. **Added comprehensive debug logging:**
```typescript
functions.logger.info('Pinecone raw response', {
  totalMatches: queryResponse.matches?.length || 0,
  allScores: queryResponse.matches?.map(m => m.score) || [],
  hasFilter: Object.keys(filter).length > 0,
  filter,
  minScore, // Shows actual threshold being used
});
```

## Results

### Before Fix
- Query: "who mentioned react native?" → 0 results
- Pinecone found 10 matches but all were filtered out

### After Fix
- Query: "who mentioned react native?" → Returns relevant results
- Top match score: 0.587 (now correctly included)
- Semantic search works with natural language questions

## Configuration

### Current Settings
- **minScore:** 0.1 (default, can be overridden)
- **topK:** 30 (returns up to 30 results)
- **Embedding Model:** text-embedding-3-small (1536 dimensions)
- **Vector Database:** Pinecone (cosine similarity)

## Key Learnings

1. **Trust AI embeddings** - They handle semantic meaning without manual pattern matching
2. **Test with debug logs** - Essential for debugging vector search issues
3. **Check default values carefully** - The `||` operator can be tricky with numeric values
4. **Lower thresholds are okay** - 0.587 is a good semantic match, 0.7 was too strict

## Testing Recommendations

1. Test with various query formats:
   - Questions: "who mentioned X?"
   - Keywords: "react native"
   - Phrases: "discussed database options"

2. Monitor score distributions to optimize minScore threshold

3. Consider adjusting minScore based on use case:
   - Strict matching: 0.7+
   - Balanced: 0.5-0.7
   - Permissive: 0.3-0.5
   - Very permissive: 0.1-0.3

## Files Modified
- `functions/src/ai/embeddings.ts`
- `functions/src/features/semanticSearch.ts`

## Deployment
```bash
cd /Users/nat/messageai/functions && npm run build
firebase deploy --only functions:semanticSearch
```

