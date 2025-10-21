# Firestore Index Fix

## Issue

You're seeing this error:
```
The query requires an index. You can create it here: https://console.firebase.google.com/...
```

## What's Happening

Firestore requires composite indexes for queries that:
- Filter on multiple fields
- Combine filters with sorting
- Use array-contains with ordering

Our app queries conversations filtered by `participants` (array-contains) and ordered by `lastActivity`, which requires a composite index.

## Quick Fix (Option 1: Use the Link)

1. **Click the link from the error** - It will take you directly to Firebase Console
2. Click **"Create Index"**
3. Wait 2-5 minutes for the index to build
4. Restart your app

The link looks like:
```
https://console.firebase.google.com/v1/r/project/messageai-84669/firestore/indexes?create_composite=...
```

## Manual Fix (Option 2: Create Manually)

If the link doesn't work:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **messageai-84669**
3. Go to **Firestore Database** → **Indexes** tab
4. Click **Create Index**
5. Configure the index:
   - **Collection ID**: `conversations`
   - **Fields to index**:
     - Field: `participants` | Query Scope: `Collection` | Mode: `Array-contains`
     - Field: `lastActivity` | Query Scope: `Collection` | Mode: `Descending`
6. Click **Create Index**
7. Wait for "Building" to complete (2-5 minutes)

## Why This Index is Needed

The query in `services/firebase/firestore.ts`:

```typescript
const q = query(
  collection(firestore, 'conversations'),
  where('participants', 'array-contains', userId),  // Filter by array
  orderBy('lastActivity', 'desc')                    // Then order
);
```

This combination requires a composite index because:
- `array-contains` queries need special indexing
- Combining with `orderBy` requires a composite index

## Verification

After creating the index:

1. Wait for status to change from "Building" to "Enabled"
2. Restart your Expo development server:
   ```bash
   npm start -- --clear
   ```
3. Force quit and restart your app
4. Try logging in again

The error should be gone and conversations will load properly.

## Future Indexes You Might Need

As you develop, you may need additional indexes for:

### Messages Query (if you add pagination)
- Collection: `conversations/{conversationId}/messages`
- Fields:
  - `timestamp` (Ascending or Descending)

### User Search
- Collection: `users`
- Fields:
  - `displayName` (Ascending)

Firebase will tell you when these are needed via error messages with creation links.

## Troubleshooting

### Index Still Building
- Indexes can take 2-5 minutes (sometimes up to 15 minutes for large datasets)
- Check status in Firebase Console → Firestore Database → Indexes
- Wait for "Enabled" status before testing

### Error Persists After Index Creation
1. Clear Metro bundler cache:
   ```bash
   npm start -- --clear
   ```
2. Force quit the app completely
3. Reopen the app
4. If still failing, check the index is "Enabled" (not "Building")

### Multiple Index Errors
If you see errors for other queries:
- Each query combination needs its own index
- Follow the same process for each unique query
- Firebase provides a direct creation link for each

## Pro Tip

You can create indexes proactively:

1. Review all queries in your codebase
2. Create indexes before deploying
3. This prevents runtime errors for users

## Firebase Console Quick Links

- **Your Project**: https://console.firebase.google.com/project/messageai-84669
- **Firestore Indexes**: https://console.firebase.google.com/project/messageai-84669/firestore/indexes
- **Firestore Data**: https://console.firebase.google.com/project/messageai-84669/firestore/data

## Note on Development vs Production

- Indexes are environment-specific
- Create indexes in your development Firebase project
- Create the same indexes in production when deploying
- Use Firebase CLI to export/import index configurations:
  ```bash
  firebase firestore:indexes > firestore.indexes.json
  ```

