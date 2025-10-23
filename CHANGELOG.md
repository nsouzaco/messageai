# Aligna Changelog

## [Unreleased] - 2025-10-23

### Added ✨
- **Thread Functionality** - Slack-style threaded conversations for group chats 🧵
  - Long press any message in a group chat to open action menu
  - "Reply in thread" option creates focused conversation thread
  - Thread modal slides up showing original message + all replies
  - Reply count indicator ("3 replies →") on messages with threads
  - Tap reply count to view full thread
  - Real-time updates for new thread replies
  - Thread replies don't clutter main chat
  - Optimistic UI for instant thread reply feedback
  - Only available in group chats (keeps 1-on-1 simple)
  - Parent message highlighted in thread view
  - Empty state with friendly prompt for new threads

- **Group Info Screen** - View detailed information about group chats
  - Tap group name in chat header to open group info
  - Shows total number of participants
  - Displays all participant names with profile pictures
  - Shows online/offline status for each participant
  - Highlights current user with "You" label
  - Leave group action (UI ready)
  - Clean, organized layout with participant list
  
- **Group Chat Read Receipts** - Shows specific names of people who read your messages
  - Displays "Read by Alice, Bob" under messages in group chats
  - Smart formatting for different numbers of readers
  - Compact "+N others" format for large groups (5+)
  - Real-time updates as people read messages
  - Only shows on your own messages
  - Only visible in group chats (not 1-on-1)
  - Dark gray italic text styling for clear visibility

### Changed 🔄
- **Simplified Read Receipt Ticks** (BREAKING IMPROVEMENT)
  - Now only two states: Single tick (✓) or Double ticks (✓✓) - both gray
  - **1-on-1 Chat**:
    - ✓ = Sent but not read yet
    - ✓✓ = Read by recipient
  - **Group Chat**:
    - ✓ = Sent but NOT read by all members yet
    - ✓✓ = Read by ALL members (100% read confirmation)
  - Cleaner than WhatsApp (no blue ticks), more visual than Telegram
  - Consistent gray color for all status indicators
  - Better engagement tracking for teams

### Enhanced 🚀
- **Chat Header Made Interactive for Groups**
  - Group name in chat header is now tappable
  - Opens group info screen when tapped
  - Only active for group chats (1-on-1 headers remain non-interactive)
  - Visual feedback on tap with opacity change

- `MessageBubble` component enhanced with thread support
  - Long press handler for opening action menu (group chats only)
  - Thread indicator ("X replies →") displayed below messages with threads
  - Tappable thread indicator to open thread view
  - Reply count updates in real-time
  - New props: `onLongPress`, `onOpenThread`
  - Wrapped in TouchableOpacity for interaction
  - 500ms delay for long press (comfortable UX)
  - Thread indicator styled in blue with bold text
  - Group chat read receipts support
  - New props: `conversationType`, `participants`, `currentUserId`
  - Intelligent "fully read" detection (checks if ALL recipients have read)
  - Shows single gray tick until everyone reads
  - Shows double gray ticks only when last person reads
  - Performance optimized with early returns
  
- `ChatContext` now manages thread state
  - New state: `threadMessages` - stores replies per parent message
  - `sendThreadReply()` - sends reply to thread
  - `listenToThread()` - real-time listener for thread replies
  - Thread listeners automatically cleaned up on unmount
  - Thread state isolated from main chat state
  
- `firestore.ts` enhanced with thread operations
  - `sendThreadReply()` - creates threaded message with parent link
  - `listenToThreadReplies()` - queries messages by threadId
  - `incrementReplyCount()` - updates parent message count
  - `getParentMessage()` - retrieves original message for thread view
  - Thread replies filtered from main chat messages
  - Client-side filtering ensures clean separation
  
- `markMessagesAsRead()` now checks if ALL participants have read
  - Updates `deliveryStatus` to READ only when everyone has read
  - Works for both 1-on-1 and group chats
  - Batch updates for efficiency
  
- Chat screen now supports thread interactions
  - Action menu integration for long press
  - Thread navigation handlers
  - Passes participant data to message bubbles
  - Filters thread replies from main view

### New Screens 📱
- `app/thread/[id].tsx` - Thread view modal screen
  - Modal presentation for focused thread conversations
  - Shows parent message at top with gray background
  - Displays all thread replies chronologically
  - Real-time listener for new replies
  - Message input for sending thread replies
  - Empty state for threads with no replies yet
  - Dynamic route: `/thread/{conversationId}_{messageId}`
  
- `app/group-info/[id].tsx` - Group information modal screen
  - Modal presentation (slides up from bottom, native iOS/Android pattern)
  - Dynamic route for any group conversation
  - Shows group icon, name, and member count
  - Lists all participants with avatars and online status
  - Displays current user with "You" label
  - Leave group action available
  - Automatic modal header with close button
  - Clean, flat file structure (no nested folder)

### New Components 🧩
- `components/MessageActionMenu.tsx` - Bottom sheet action menu for messages
  - Appears on long press of messages
  - "Reply in thread" action for group chats
  - Modal overlay with backdrop
  - Smooth fade animation
  - Cancel button
  - Extensible for future actions (Copy, Delete, etc.)

### Database Schema 💾
- **Message Interface** - Extended with thread support
  - `threadId?: string` - Links reply to parent message
  - `replyCount?: number` - Number of thread replies (parent messages only)
  - `hasThread?: boolean` - Quick check for thread existence
  - Backwards compatible with existing messages
  
### Documentation 📚
- Added `GROUP_CHAT_READ_RECEIPTS.md` - Complete feature documentation
- Added `READ_RECEIPTS_EXAMPLE.md` - Visual examples and use cases
- Added `READ_RECEIPTS_UPDATED.md` - New tick behavior explanation
- Added `TICK_BEHAVIOR.md` - Quick reference guide for tick meanings
- Added `FEATURES.md` - Comprehensive feature list
- Added `CHANGELOG.md` - This file
- Updated `CHANGELOG.md` with thread functionality feature

---

## [1.0.0] - Initial Release

### Core Features ✅

#### Authentication
- Email/password registration
- Secure login
- Session persistence
- Profile setup with display name and profile picture
- User-friendly error messages

#### Messaging
- Real-time one-on-one chat
- Group chat (3+ users)
- Optimistic UI updates
- Message timestamps
- Offline message persistence
- Automatic sync on reconnection

#### Read Receipts & Status
- Four delivery states (sending, sent, delivered, read)
- Visual checkmark indicators
- Real-time status updates
- Read tracking with `readBy` array

#### Presence
- Online/offline indicators
- Last seen timestamps
- Real-time presence updates
- Green dot for online users

#### Typing Indicators
- Real-time typing detection
- Animated "..." indicator
- Works in 1-on-1 and group chats
- Debounced for performance

#### Notifications
- Foreground push notifications
- Shows sender name and message preview
- Tap to open conversation
- Firebase Cloud Messaging integration

#### Media
- Profile picture upload
- Image picker (library/camera)
- Firebase Storage integration

### Technical Stack 🛠
- React Native + Expo SDK 54
- TypeScript
- Firebase (Auth, Firestore, Realtime DB, Storage, FCM)
- React Context API for state management
- Expo Router for navigation

### Branding 🎨
- Rebranded from "MessageAI" to "Aligna"
- Playfair Display font for logo
- Professional, elegant design
- iOS-inspired UI

### Infrastructure ⚙️
- Firebase project setup
- Security rules (Firestore & Storage)
- Environment variable configuration
- Composite indexes for queries
- Proper listener cleanup

### Error Handling 🐛
- Fixed: Firebase Storage rules syntax
- Fixed: Firestore persistence on React Native
- Fixed: Missing Firestore indexes
- Fixed: Undefined values in Firestore documents
- Fixed: Permission denied on conversation creation
- Fixed: Logout errors and listener cleanup
- Fixed: React hooks ordering issues
- User-friendly error messages for all errors

### Documentation 📖
- Complete product requirements (PRD.md)
- Setup guide (SETUP.md)
- Quick start guide (QUICKSTART.md)
- Environment setup (ENV_SETUP.md)
- Error handling guide (ERROR_HANDLING_GUIDE.md)
- All errors fixed log (ERRORS_FIXED.md)
- Firestore index guide (FIRESTORE_INDEX_FIX.md)
- Security rules guide (FIRESTORE_RULES_FIX.md)
- Logout fixes (LOGOUT_FIX.md)
- Rebranding guide (REBRANDING.md)
- Implementation summary (IMPLEMENTATION_SUMMARY.md)

---

## Feature Comparison

### Version 1.0.0 vs Unreleased

| Feature | v1.0.0 | Unreleased |
|---------|--------|------------|
| Basic read receipts | ✅ | ✅ |
| Checkmark indicators | ✅ | ✅ |
| Group chat | ✅ | ✅ |
| **"Read by" names** | ❌ | ✅ NEW |
| **Smart formatting** | ❌ | ✅ NEW |
| **Real-time reader updates** | ✅ | ✅ Enhanced |

---

## Upcoming Features 🔮

### Planned for Next Release
- Media messages (images, videos)
- Voice messages
- File sharing
- Message editing
- Message deletion
- Message search
- Emoji reactions

### Under Consideration
- Read receipt timestamps ("Read by Alice 2m ago")
- Expandable reader list for large groups
- Delivered vs Read status distinction
- Voice/video calls
- End-to-end encryption
- Background push notifications

---

## Breaking Changes

### Unreleased
- None (fully backward compatible)

### v1.0.0
- Initial release

---

## Migration Guide

### Updating to Unreleased Version

No migration needed! The new group read receipts feature is:
- ✅ **Backward compatible** - Works with existing data
- ✅ **Opt-in** - Only shows when props are provided
- ✅ **Non-breaking** - Old MessageBubble usage still works

Simply update your code and the feature activates automatically in group chats.

---

## Bug Fixes

### Unreleased
- None (new feature release)

### v1.0.0
- Fixed Firebase Storage rules syntax error
- Fixed Firestore persistence on React Native
- Fixed missing Firestore composite index
- Fixed undefined values in Firestore documents
- Fixed permission denied on conversation creation
- Fixed logout errors and WebChannel issues
- Fixed notification listener cleanup
- Fixed React hooks ordering (early return issue)

---

## Performance Improvements

### Unreleased
- Optimized MessageBubble with early returns for non-group chats
- Efficient filtering of read receipts
- No additional Firestore queries required

### v1.0.0
- Optimistic UI for instant message display
- Batched Firestore writes
- Debounced typing indicators
- Efficient listener management

---

## Security Updates

### v1.0.0
- Implemented Firestore security rules
- Added Storage security rules
- Environment variables for Firebase config
- User-scoped data access
- Proper permission checking

---

## Known Issues

### Current
- Push notifications only work in foreground (background coming soon)
- Web platform has limited functionality (mobile-first design)
- Large file uploads not yet supported

### Resolved
- ✅ Firebase Storage rules syntax (v1.0.0)
- ✅ Firestore persistence on React Native (v1.0.0)
- ✅ Missing composite indexes (v1.0.0)
- ✅ Undefined Firestore values (v1.0.0)
- ✅ Permission denied errors (v1.0.0)
- ✅ Logout listener cleanup (v1.0.0)
- ✅ React hooks ordering (v1.0.0)

---

## Credits

Built with ❤️ using:
- React Native & Expo
- Firebase
- TypeScript
- Playfair Display font by Claus Eggers Sørensen

---

## Links

- [Repository](https://github.com/nsouzaco/messageai)
- [Documentation](README.md)
- [Group Read Receipts Guide](GROUP_CHAT_READ_RECEIPTS.md)
- [Feature List](FEATURES.md)

---

## Summary

Aligna has grown from a solid MVP to a feature-rich messaging platform with capabilities that exceed many popular apps. The addition of inline group read receipts makes it particularly valuable for team communication and professional use cases.

**Total Development Time**: Built in 24 hours → Enhanced beyond MVP ✨

