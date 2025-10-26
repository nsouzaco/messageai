# AI Functions - messageLimit Parameter Fix

## Date: October 26, 2025

## Issue
Action item extraction (and other AI functions) were failing with error:
```
Error: Value for argument "limit" is not a valid integer.
```

## Root Cause

### The Problem
Firestore's `.limit()` method requires a valid integer. When the frontend called functions without passing `messageLimit`, it was `undefined` in the request data.

The default parameter syntax in TypeScript:
```typescript
const { conversationId, threadId, messageLimit = 20 } = data;
```

This doesn't work as expected when `messageLimit` is `undefined` in the Firebase function call. The destructuring default only applies when the property doesn't exist, but Firebase sends all properties (even if undefined).

### Affected Functions
1. **extractActionItems** - Default: 20 messages
2. **detectDecisions** - Default: 20 messages  
3. **detectScheduling** - Default: 10 messages

## Solution

Changed parameter handling from:
```typescript
const { conversationId, threadId, messageLimit = 20 } = data;
// ...
.limit(messageLimit)
```

To:
```typescript
const { conversationId, threadId, messageLimit } = data;

// Ensure messageLimit is a valid integer
const limit = messageLimit && typeof messageLimit === 'number' ? messageLimit : 20;

// ...
.limit(limit)
```

This explicitly checks:
1. If `messageLimit` exists (truthy)
2. If it's a number type
3. Otherwise, uses the default value

## Files Modified

### functions/src/features/extractActionItems.ts
- Lines 57-61: Added explicit messageLimit validation
- Line 67: Log the actual limit being used
- Line 91: Use validated `limit` instead of `messageLimit`

### functions/src/features/detectDecisions.ts
- Lines 56-60: Added explicit messageLimit validation
- Line 66: Log the actual limit being used
- Line 90: Use validated `limit` instead of `messageLimit`

### functions/src/features/detectScheduling.ts
- Lines 60-64: Added explicit messageLimit validation (default: 10)
- Line 69: Log the actual limit being used
- Line 94: Use validated `limit` instead of `messageLimit`

## Testing

After deployment, test by:

1. **Go to Test tab** in the app
2. **Tap "Tasks" button** for any conversation
3. **Should succeed** with alert: "Found X action items!"
4. **Check logs:**
```bash
firebase functions:log --only extractActionItems --lines 20
```

Should see:
```
"messageLimit": 20  (or whatever value was passed)
```

## Why This Matters

- **Frontend flexibility:** Frontend can call without passing `messageLimit`
- **Type safety:** Ensures Firestore always gets a valid integer
- **Better logging:** Shows the actual limit being used
- **Prevents crashes:** No more "not a valid integer" errors

## Related Files

- **Frontend caller:** `services/firebase/ai.ts`
  - `extractActionItems()` - line 115
  - `detectDecisions()` - line 195
  - `detectScheduling()` - line 221

## Deployment

```bash
cd /Users/nat/messageai/functions && npm run build
firebase deploy --only functions:extractActionItems,functions:detectDecisions,functions:detectScheduling
```

## Status: ✅ Fixed & Deployed

All three functions now handle `messageLimit` correctly and should work without errors.

