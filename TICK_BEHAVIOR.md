# Tick Behavior - Quick Reference 📋

## Visual Guide

### 1-on-1 Chat

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  You: "Hey, are you free tomorrow?"            │
│                                                 │
│  Status progression:                            │
│                                                 │
│  ⏰  Sending... (uploading to server)          │
│  ↓                                              │
│  ✓   Sent (they haven't read it yet)          │
│  ↓                                              │
│  ✓✓  Read (they opened the chat)              │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Group Chat (4 people total: You + 3 others)

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  You: "Team meeting moved to 3pm"              │
│                                                 │
│  Status progression:                            │
│                                                 │
│  ⏰  Sending...                                 │
│  ↓                                              │
│  ✓   Sent (0/3 read)                           │
│      Read by: (none)                            │
│  ↓                                              │
│  ✓   Still single tick (1/3 read)              │
│      Read by Bob                                │
│  ↓                                              │
│  ✓   Still single tick (2/3 read)              │
│      Read by Bob, Charlie                       │
│  ↓                                              │
│  ✓✓  Double blue ticks (3/3 read) ✨          │
│      Read by Bob, Charlie, David                │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Simple Rules

### Rule #1: One Tick vs Two Ticks

**Single Tick (✓)**
- Message is sent but NOT fully read
- **1-on-1**: Recipient hasn't opened it yet
- **Group**: Not everyone has opened it yet

**Double Ticks (✓✓)**
- Message is FULLY read
- **1-on-1**: Recipient has read it
- **Group**: ALL members have read it
- Same gray color as single tick for consistency

### Rule #2: Consistent Gray Color
- All ticks are gray for consistency
- Single gray (✓) or double gray (✓✓)
- Simpler and cleaner than WhatsApp!

### Rule #3: Group Chat = Strict
- Message stays ✓ until the LAST person reads
- Even if 99% read it, still shows ✓
- Only shows ✓✓ when 100% have read

---

## Real Examples

### Example 1: Quick 1-on-1
```
You: "Coffee?" ✓
     ↓ (5 seconds later)
You: "Coffee?" ✓✓
Friend: "Sure!"
```

### Example 2: Group Chat (5 people)
```
You: "Proposal is ready!" ✓
     Read by Alice

(2 minutes later)
You: "Proposal is ready!" ✓
     Read by Alice, Bob

(5 minutes later)
You: "Proposal is ready!" ✓
     Read by Alice, Bob, Charlie

(10 minutes later)
You: "Proposal is ready!" ✓
     Read by Alice, Bob, Charlie, David

(15 minutes later)
You: "Proposal is ready!" ✓✓
     Read by Alice, Bob, Charlie, David, Eve

NOW you know everyone has seen it! ✨
```

### Example 3: Mixed Speed Readers
```
Fast reader: Opens chat after 10 seconds
Medium reader: Opens after 5 minutes
Slow reader: Opens after 2 hours

Your message shows ✓ for 2 hours until the
slow reader finally opens it, then it changes to ✓✓
```

---

## What You See vs What It Means

| What You See | 1-on-1 Chat | Group Chat |
|--------------|-------------|------------|
| ⏰ | Sending to server | Sending to server |
| ✓ | Sent, they haven't read | Sent, not everyone read |
| ✓✓ | They read it | EVERYONE read it |

---

## Pro Tips

### Tip 1: Follow Up Strategy
```
If you see ✓ for a long time:
- 1-on-1: They might be busy, give them time
- Group: Check "Read by" to see who hasn't read
         → Follow up with specific people
```

### Tip 2: Urgent Messages
```
Sent urgent message?
- ✓ = Someone might have missed it
- ✓✓ = Everyone knows, you're good
```

### Tip 3: Meeting Confirmations
```
"Meeting in 10 minutes!"
- ✓ = Not everyone confirmed they saw it
- ✓✓ = Everyone acknowledged, start meeting
```

---

## Common Questions

### Q: Why does my group message stay at ✓ for so long?
**A:** Because not everyone has read it yet. Check the "Read by" text to see who's missing.

### Q: Does ✓ mean delivered or sent?
**A:** Sent to server. We don't distinguish "delivered to device" - just sent vs read.

### Q: Can someone read without showing ✓✓?
**A:** No. When they open the chat, it automatically marks as read and changes the tick.

### Q: What if someone is offline?
**A:** Message shows ✓ until they come online and open the chat.

### Q: Do I need to scroll to the message for it to count as read?
**A:** Currently, opening the chat marks all messages as read. (Future: might require scrolling)

---

## Icon Reference

### All Possible States

| Icon | Color | Name | When |
|------|-------|------|------|
| ⏰ | Gray | Clock | Sending to server |
| ✓ | Gray | Single tick | Sent but not fully read |
| ✓✓ | Gray | Double ticks | Read by all recipients |

### What We DON'T Use

| Icon | What It Means in Other Apps | Why We Don't Use It |
|------|---------------------------|-------------------|
| ✓✓ (gray) | Delivered to device | Too confusing, simplified to just ✓ |
| ✗ | Failed to send | Not implemented yet |
| ○ | Pending | Not implemented yet |

---

## Comparison Chart

### Aligna vs Others

| App | Sent | Delivered | Read (1-on-1) | Read (Group) |
|-----|------|-----------|--------------|--------------|
| **Aligna** | ✓ gray | *(same)* | ✓✓ gray | ✓✓ gray (when ALL read) |
| WhatsApp | ✓ gray | ✓✓ gray | ✓✓ blue | ✓✓ blue (when ALL read) |
| Telegram | ✓ | ✓✓ | Shows count | Tap to see details |
| iMessage | "Delivered" | *(same)* | "Read" | Doesn't show group reads |

**Aligna advantage**: Simpler than WhatsApp (consistent gray, no blue), clearer than Telegram (shows names immediately)

---

## Technical Notes

### How It Works Behind the Scenes

**1-on-1:**
```javascript
// Message sent
readBy: ["you"]
deliveryStatus: "sent"
Display: ✓

// Recipient opens chat
readBy: ["you", "them"]
deliveryStatus: "read"
Display: ✓✓
```

**Group (3 people):**
```javascript
// Message sent
readBy: ["you"]
deliveryStatus: "sent"
Display: ✓

// First person reads
readBy: ["you", "person1"]
deliveryStatus: "sent" ← Still "sent"
Display: ✓

// Second person reads (LAST ONE)
readBy: ["you", "person1", "person2"]
deliveryStatus: "read" ← NOW "read"
Display: ✓✓
```

---

## Summary

**Remember these 3 things:**

1. **⏰ = Sending** (wait a second)
2. **✓ = Sent, not fully read** (be patient)
3. **✓✓ = Everyone read it** (you're good!)

*All ticks are gray for consistency*

**For groups:**
- Check "Read by" text to see exactly who has read
- Message only gets ✓✓ when the LAST person reads

**Simple!** 🎉

