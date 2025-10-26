# Automatic Action Item Extraction

## Date: October 26, 2025

## What's New

Action items are now **automatically extracted** from conversations as you send messages! No need to manually trigger extraction.

## How It Works

### Automatic Detection
When you send a message:
1. The system checks for **action keywords** like:
   - send, create, update, review, check, schedule, meeting
   - deadline, by, need to, should, must, have to
   - can you, please, remind, follow up
   - tomorrow, today, this week, next, before, after
   - asap, urgent

2. If keywords are found, the AI analyzes the **last 10 messages** for context

3. **High-confidence action items** (>50%) are automatically saved to Firestore

4. You can view them in the **Tasks** screen (Chats → Tasks button)

### Example Messages That Trigger Auto-Extraction

✅ **Will automatically extract:**
```
"Can you send me the report by Friday?"
"Let's schedule a meeting tomorrow at 3pm"
"I need to review the code before deployment"
"Please update the documentation by end of week"
"We should deploy this to production next Monday"
"Remind me to follow up with John about the proposal"
```

❌ **Won't trigger (no keywords):**
```
"I already finished that"
"How was your weekend?"
"Looking good!"
```

## Features

### Smart Filtering
- **Only analyzes main conversations** (skips thread replies)
- **Keyword pre-filtering** reduces unnecessary API calls
- **Confidence threshold** ensures quality (only saves items >50% confidence)

### Rich Metadata Extraction
The AI automatically detects:
- **Task description**: What needs to be done
- **Assignee**: @mentions or implied assignments
- **Due dates**: "by Friday", "tomorrow", "next week"
- **Confidence score**: How certain the AI is about the action item

### Real-time Updates
- Action items appear instantly in the Tasks screen
- Live updates via Firestore listeners
- No manual refresh needed

## Testing

### Test the Auto-Extraction

1. **Send a test message** in any conversation:
   ```
   "Can you send me the design mockups by tomorrow?"
   ```

2. **Wait 2-3 seconds** for processing

3. **Go to Tasks screen:**
   - Tap "Chats" tab
   - Tap "Tasks" button in header
   - You should see the extracted action item!

4. **Check the details:**
   - ✅ Task: "send me the design mockups"
   - ✅ Due date: Tomorrow's date
   - ✅ Confidence: Usually 70-90%

### Check the Logs

To see what the AI is doing:
```bash
firebase functions:log --only autoExtractActionItems --lines 30
```

You should see:
```
"Action keyword detected, analyzing messages"
"Action items AI response parsed"
"Auto-extracted action items stored"
```

## Manual Extraction Still Available

You can still manually extract action items via the **Test tab**:
- Useful for bulk extraction from old conversations
- Analyzes more messages (20 vs 10)
- Good for testing

## Performance & Costs

### Optimization Strategies
1. **Keyword filtering**: Only processes messages with action-related words
2. **Limited context**: Analyzes only 10 recent messages (vs 20 manual)
3. **Confidence threshold**: Only stores high-quality items
4. **Skip threads**: Focuses on main conversations only

### Estimated Usage
- **Trigger rate**: ~20-30% of messages (depends on keyword usage)
- **Processing time**: 1-3 seconds per extraction
- **OpenAI cost**: ~$0.001 per extraction (GPT-3.5-turbo)

## Configuration

### Adjust Sensitivity

Edit `/functions/src/features/extractActionItems.ts`:

**Add more keywords:**
```typescript
const ACTION_KEYWORDS = [
  // ... existing keywords
  'task', 'todo', 'action', // Add your own
];
```

**Change confidence threshold:**
```typescript
if (item.confidence < 0.5) { // Lower = more permissive (0.3-0.7 recommended)
  continue;
}
```

**Change context size:**
```typescript
.limit(10) // Increase for more context (costs more)
```

## Architecture

### Flow Diagram
```
New Message Sent
     ↓
Check for action keywords?
     ↓ YES
Fetch last 10 messages
     ↓
Call OpenAI GPT-3.5
     ↓
Parse action items
     ↓
Filter by confidence (>50%)
     ↓
Save to Firestore
     ↓
Update UI (real-time)
```

### Firebase Functions
- **autoExtractActionItems**: Background trigger on message creation
- **extractActionItems**: Manual callable function (still works)

### Firestore Structure
```
/actionItems/{itemId}
  - conversationId: string
  - text: string (task description)
  - assignee?: string
  - dueDate?: number (timestamp)
  - completed: boolean
  - confidence: number (0-1)
  - createdAt: number
  - extractedFrom: string (conversationId)
```

## Troubleshooting

### No Action Items Appearing

1. **Check keywords**: Does your message contain action-related words?
2. **Check confidence**: Items below 50% confidence are not saved
3. **Check logs**:
   ```bash
   firebase functions:log --only autoExtractActionItems
   ```
4. **Verify Firestore rules**: Ensure users can read `actionItems` collection

### Too Many False Positives

Lower sensitivity by:
1. **Increase confidence threshold** (0.5 → 0.7)
2. **Remove common keywords** that cause false triggers
3. **Add negative filters** for specific conversation types

### Not Detecting Obvious Actions

Increase sensitivity by:
1. **Lower confidence threshold** (0.5 → 0.3)
2. **Add more keywords** to ACTION_KEYWORDS
3. **Increase context** (10 → 15 messages)

## Comparison: Manual vs Auto

| Feature | Manual (Test Tab) | Auto (Background) |
|---------|------------------|-------------------|
| **Trigger** | Button click | New message sent |
| **Context** | 20 messages | 10 messages |
| **Threshold** | 50% confidence | 50% confidence |
| **Speed** | On-demand | 1-3 seconds after message |
| **Use Case** | Bulk extraction, old conversations | Real-time, new messages |
| **Cost** | Pay per click | Pay per keyword match |

## Next Steps

1. ✅ **Test it!** Send messages with action keywords
2. ✅ **Monitor** the Tasks screen for new items
3. ✅ **Adjust** keywords and thresholds based on your needs
4. ✅ **Provide feedback** on accuracy and usefulness

## Files Modified

- `/functions/src/features/extractActionItems.ts`
  - Added `ACTION_KEYWORDS` constant
  - Added `autoExtractActionItems` function
  - Fixed message filtering (removed `threadId == null` query)
  
- `/functions/src/index.ts`
  - Exported `autoExtractActionItems`

## Status: ✅ Live & Working

Auto-extraction is now active. Send a test message with action keywords to see it in action!

