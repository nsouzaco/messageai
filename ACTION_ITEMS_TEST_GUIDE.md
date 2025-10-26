# Action Items Testing Guide

## Overview
Action Items are automatically extracted from conversations using AI to identify tasks, assignments, and deadlines.

## How It Works

### Backend (`extractActionItems` Cloud Function)
- Analyzes recent messages (default: last 20)
- Uses GPT-3.5 to detect action items
- Extracts: task description, assignee, due date, confidence score
- Stores in Firestore `actionItems` collection

### Frontend (`app/action-items.tsx`)
- Displays all action items from accessible conversations
- Filters: Active, Completed, All
- Toggle completion status
- Shows assignee, due date, confidence
- Highlights overdue items

## Testing Steps

### 1. Send Messages with Action Items

In any conversation, send messages like:

**Examples:**
```
"Can you send the report by Friday?"
"Let's schedule a meeting tomorrow at 3pm"
"I need to review the design by end of day"
"@John, please update the documentation"
"We should deploy this to production next week"
"Remember to backup the database before the update"
```

### 2. Extract Action Items

**Option A: Manual Extraction (Recommended for Testing)**
You can add a button in the chat UI to manually trigger extraction:

```typescript
import { extractActionItems } from '@/services/firebase/ai';

const handleExtractActionItems = async () => {
  try {
    const result = await extractActionItems(conversationId);
    Alert.alert('Success', `Found ${result.count} action items`);
  } catch (error) {
    Alert.alert('Error', error.message);
  }
};
```

**Option B: Cloud Function Direct Call**
From terminal (for testing):
```bash
# This requires setting up a test script or using Firebase Console
```

### 3. View Action Items

1. Go to the main chat list (Chats tab)
2. Tap **"Tasks"** button in the header
3. You should see the Action Items screen with:
   - List of extracted action items
   - Filter tabs: Active / Completed / All
   - Each item shows:
     - ☑️ Checkbox to mark complete
     - Task description
     - Assignee (if detected)
     - Due date (if detected)
     - Confidence score

### 4. Test Functionality

**Mark as Complete:**
- Tap any action item to toggle completion
- Completed items get a checkmark and strikethrough
- Switch to "Completed" filter to see them

**Filter:**
- Tap "Active" to see only pending tasks
- Tap "Completed" to see finished tasks
- Tap "All" to see everything

**Overdue Indicators:**
- Items with past due dates show in red
- Red calendar icon and background highlight

## Expected Behavior

### AI Detection
The AI should detect:
- ✅ Direct tasks: "Send the report"
- ✅ Scheduled items: "Meeting tomorrow"
- ✅ Assignments: "@Person do X"
- ✅ Reminders: "Don't forget to..."
- ✅ Due dates: "by Friday", "tomorrow", "next week"

### What It Might Miss
- ❌ Vague statements: "We should think about that"
- ❌ Questions without intent: "Should we do X?" (unless context is clear)
- ❌ Past tense: "I already sent the report"

### Confidence Scores
- **High (>80%):** Clear action items with explicit language
- **Medium (50-80%):** Implied tasks or less direct phrasing
- **Low (<50%):** Uncertain, might be filtered out

## Current Configuration

### Rate Limits
- Extraction calls: Limited per user (check `ratelimit.ts`)
- Prevents abuse of OpenAI API

### Message Context
- Default: Last 20 messages
- Can be adjusted via `messageLimit` parameter

### Firestore Structure
```
/actionItems/{itemId}
  - conversationId: string
  - threadId?: string
  - text: string
  - assignee?: string
  - dueDate?: number (timestamp)
  - completed: boolean
  - extractedFrom: string (message context)
  - confidence: number
  - createdAt: number (timestamp)
```

## Troubleshooting

### No Action Items Showing

1. **Check Firestore Security Rules:**
   - Ensure authenticated users can read `actionItems`
   - Rules should allow read if user has conversation access

2. **Check Cloud Function Logs:**
```bash
firebase functions:log --only extractActionItems --lines 50
```

3. **Verify Extraction Was Triggered:**
   - Action items must be manually extracted (no auto-trigger yet)
   - Or add auto-extraction on new messages (similar to decisions)

### Permission Errors

If you see "Missing or insufficient permissions":
```bash
# Deploy updated Firestore rules
firebase deploy --only firestore:rules
```

### Empty State

If you see "No action items yet":
- This is normal - send messages and extract them
- AI will only find items in messages with clear action language

## Adding Auto-Extraction (Optional)

To automatically extract action items when messages are sent, create a background function:

```typescript
// In extractActionItems.ts
export const autoExtractActionItems = functions.firestore
  .document('conversations/{conversationId}/messages/{messageId}')
  .onCreate(async (snapshot, context) => {
    // Check if message contains action keywords
    // If yes, extract action items from recent messages
    // Store in Firestore
  });
```

## Next Steps

1. ✅ Send test messages with clear action items
2. ✅ Manually trigger extraction (add button or use function directly)
3. ✅ View in Action Items screen
4. ✅ Test marking complete/incomplete
5. ✅ Test filters (Active/Completed/All)
6. ⏭️ Consider adding auto-extraction trigger
7. ⏭️ Add "Extract Action Items" button in chat UI for convenience

## Files Involved

- **Backend:** `functions/src/features/extractActionItems.ts`
- **Frontend:** `app/action-items.tsx`
- **Service Layer:** `services/firebase/ai.ts`
- **Prompts:** `functions/src/ai/prompts.ts` (buildActionItemPrompt)
- **Security:** `firestore.rules` (actionItems collection)

