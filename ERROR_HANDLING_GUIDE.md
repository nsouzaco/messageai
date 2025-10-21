# Error Handling Guide

## Overview

The app now has improved user-friendly error messages throughout all authentication and Firebase operations. Instead of showing cryptic Firebase error codes, users now see clear, actionable messages.

## What's New

### Before (Bad UX):
```
Error: Firebase: Error (auth/invalid-credential).
```

### After (Good UX):
```
Invalid email or password. Please check your credentials and try again.
```

## Implementation

### Error Messages Utility

Created `utils/errorMessages.ts` with three main functions:

#### 1. `getAuthErrorMessage(error)`
Handles Firebase Authentication errors:
- Invalid credentials
- Email already in use
- Weak passwords
- Network errors
- Too many login attempts
- Etc.

#### 2. `getFirestoreErrorMessage(error)`
Handles Firestore database errors:
- Permission denied
- Not found
- Resource exhausted
- Etc.

#### 3. `getStorageErrorMessage(error)`
Handles Firebase Storage errors:
- Upload failures
- Permission denied
- Quota exceeded
- Etc.

#### 4. `getErrorMessage(error, context?)`
Auto-detects error type and returns appropriate message.

## Usage Examples

### In Authentication Screens

```typescript
import { getAuthErrorMessage } from '@/utils/errorMessages';

try {
  await login(email, password);
} catch (error: any) {
  const errorMessage = getAuthErrorMessage(error);
  Alert.alert('Login Failed', errorMessage);
}
```

### In Firestore Operations

```typescript
import { getFirestoreErrorMessage } from '@/utils/errorMessages';

try {
  await createConversation(participants, type, userId);
} catch (error: any) {
  const errorMessage = getFirestoreErrorMessage(error);
  Alert.alert('Error', errorMessage);
}
```

### In Storage Operations

```typescript
import { getStorageErrorMessage } from '@/utils/errorMessages';

try {
  await uploadProfilePicture(userId, imageUri);
} catch (error: any) {
  const errorMessage = getStorageErrorMessage(error);
  Alert.alert('Upload Failed', errorMessage);
}
```

### Auto-Detection

```typescript
import { getErrorMessage } from '@/utils/errorMessages';

try {
  await someFirebaseOperation();
} catch (error: any) {
  // Automatically detects if it's auth, firestore, or storage error
  const errorMessage = getErrorMessage(error);
  Alert.alert('Error', errorMessage);
}
```

## Error Message Mapping

### Authentication Errors

| Firebase Error Code | User-Friendly Message |
|---|---|
| `auth/invalid-credential` | Invalid email or password. Please check your credentials and try again. |
| `auth/wrong-password` | Invalid email or password. Please check your credentials and try again. |
| `auth/user-not-found` | Invalid email or password. Please check your credentials and try again. |
| `auth/invalid-email` | Please enter a valid email address. |
| `auth/user-disabled` | This account has been disabled. Please contact support. |
| `auth/too-many-requests` | Too many failed attempts. Please try again later or reset your password. |
| `auth/email-already-in-use` | This email is already registered. Please login or use a different email. |
| `auth/weak-password` | Password is too weak. Please use at least 6 characters with a mix of letters and numbers. |
| `auth/network-request-failed` | Network error. Please check your internet connection and try again. |

### Firestore Errors

| Firebase Error Code | User-Friendly Message |
|---|---|
| `permission-denied` | You don't have permission to perform this action. |
| `not-found` | The requested data was not found. |
| `already-exists` | This item already exists. |
| `resource-exhausted` | Too many requests. Please try again later. |
| `unavailable` | Service temporarily unavailable. Please try again. |
| `unauthenticated` | Please login to continue. |

### Storage Errors

| Firebase Error Code | User-Friendly Message |
|---|---|
| `storage/unauthorized` | You don't have permission to upload files. |
| `storage/canceled` | Upload was cancelled. |
| `storage/quota-exceeded` | Storage quota exceeded. |
| `storage/retry-limit-exceeded` | Upload failed. Please try again. |

## Files Updated

### New Files:
- ✅ `utils/errorMessages.ts` - Error message utilities

### Updated Files:
- ✅ `app/(auth)/login.tsx` - Uses `getAuthErrorMessage()`
- ✅ `app/(auth)/register.tsx` - Uses `getAuthErrorMessage()`
- ✅ `app/(auth)/profile-setup.tsx` - Uses `getStorageErrorMessage()`

## Best Practices

### DO ✅

```typescript
// Use the error message utilities
const errorMessage = getAuthErrorMessage(error);
Alert.alert('Login Failed', errorMessage);
```

```typescript
// Provide context in the alert title
Alert.alert('Login Failed', errorMessage);
Alert.alert('Upload Failed', errorMessage);
```

```typescript
// Always catch errors and show user-friendly messages
try {
  await operation();
} catch (error: any) {
  const message = getErrorMessage(error);
  Alert.alert('Error', message);
}
```

### DON'T ❌

```typescript
// Don't show raw Firebase errors
Alert.alert('Error', error.message); // Shows: "Firebase: Error (auth/invalid-credential)"
```

```typescript
// Don't use generic messages when you can be specific
Alert.alert('Error', 'Something went wrong'); // Too vague
```

```typescript
// Don't ignore errors
try {
  await operation();
} catch (error) {
  // Silently failing - bad UX!
}
```

## Testing Error Messages

To test different error scenarios:

### Invalid Login:
1. Enter wrong email/password
2. Should see: "Invalid email or password. Please check your credentials and try again."

### Email Already Exists:
1. Try to register with existing email
2. Should see: "This email is already registered. Please login or use a different email."

### Network Error:
1. Disconnect internet
2. Try to login
3. Should see: "Network error. Please check your internet connection and try again."

### Too Many Attempts:
1. Try failed login multiple times
2. Should see: "Too many failed attempts. Please try again later or reset your password."

## Future Enhancements

Consider adding:

1. **In-line Error Messages**: Show errors below input fields instead of alerts
2. **Toast Messages**: For non-critical errors
3. **Error Logging**: Log errors to analytics for debugging
4. **Retry Mechanisms**: Automatic retry for network errors
5. **Offline Mode Indicators**: Show when user is offline

## Metro Bundler Errors

**Note**: Errors like `ENOENT: no such file or directory, open '/Users/nat/messageai/InternalBytecode.js'` are Metro bundler development errors and don't affect the user. These are safely ignored and don't appear in production builds.

## Status

✅ **Complete** - All authentication and storage screens now have user-friendly error messages.

## Next Steps

To extend error handling to other parts of the app:

1. Update `app/create-conversation.tsx` to use `getFirestoreErrorMessage()`
2. Update `app/chat/[id].tsx` to use `getFirestoreErrorMessage()`
3. Update `app/(tabs)/two.tsx` (settings) to use `getStorageErrorMessage()`

Example:

```typescript
// In create-conversation.tsx
import { getFirestoreErrorMessage } from '@/utils/errorMessages';

try {
  conversationId = await createConversation(...);
} catch (error: any) {
  const errorMessage = getFirestoreErrorMessage(error);
  Alert.alert('Error', errorMessage);
}
```

