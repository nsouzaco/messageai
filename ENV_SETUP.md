# Environment Variables Setup

## Overview

Firebase configuration is now stored securely in environment variables instead of being hardcoded in the codebase.

## Setup Instructions

### 1. Environment File Already Created

The `.env` file has been created with your Firebase credentials. This file is **not tracked by Git** to keep your credentials secure.

### 2. Verify .gitignore

The `.gitignore` file has been updated to exclude:
- `.env`
- `.env.local`
- `.env*.local`

This ensures your Firebase credentials are never committed to version control.

### 3. How It Works

Expo supports environment variables with the `EXPO_PUBLIC_` prefix:

- Variables prefixed with `EXPO_PUBLIC_` are accessible via `process.env`
- They are available in both development and production builds
- They are embedded in the JavaScript bundle at build time

### 4. Available Environment Variables

```bash
EXPO_PUBLIC_FIREBASE_API_KEY              # Firebase API Key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN          # Auth domain
EXPO_PUBLIC_FIREBASE_DATABASE_URL         # Realtime Database URL
EXPO_PUBLIC_FIREBASE_PROJECT_ID           # Project ID
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET       # Storage bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID  # FCM Sender ID
EXPO_PUBLIC_FIREBASE_APP_ID               # App ID
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID       # Analytics Measurement ID
```

### 5. For New Team Members

1. Copy the `.env.example` file:
   ```bash
   cp .env.example .env
   ```

2. Fill in the values from Firebase Console:
   - Go to Firebase Console > Project Settings > General
   - Scroll to "Your apps" section
   - Copy each value to the corresponding variable in `.env`

### 6. Restart Development Server

After creating or modifying the `.env` file, restart your development server:

```bash
# Stop the current server (Ctrl+C)
# Then restart
npm start
```

Or clear cache and restart:

```bash
npm start -- --clear
```

## Security Notes

### ✅ Safe Practices

- ✅ `.env` is in `.gitignore` (not committed)
- ✅ `.env.example` is committed (template only, no real values)
- ✅ Firebase security rules protect your data (not API keys)
- ✅ Environment variables are loaded at build time

### ⚠️ Important Notes

1. **API Keys in Client Apps**: Firebase API keys in client applications (React Native, web) are meant to identify your project, not to provide security. Security is handled by Firebase Security Rules.

2. **Security Rules**: The real security comes from your Firestore/Realtime Database/Storage security rules, which you've already configured.

3. **Never Commit**: Never commit `.env` to version control. Always use `.env.example` as a template.

4. **Production Builds**: For production builds with EAS Build, you'll need to configure environment variables in `eas.json` or EAS Secrets.

## Troubleshooting

### Environment Variables Not Loading

If you see `undefined` for Firebase config:

1. **Restart the dev server** (required after .env changes)
   ```bash
   npm start -- --clear
   ```

2. **Check the prefix**: Expo only recognizes variables with `EXPO_PUBLIC_` prefix

3. **Check the file location**: `.env` must be in the project root

4. **Check for typos**: Variable names must match exactly

### Firebase Connection Errors

If you get Firebase initialization errors:

1. Verify all environment variables are set correctly in `.env`
2. Check that there are no extra spaces or quotes around values
3. Restart the development server
4. Clear Metro bundler cache: `npm start -- --clear`

## Example .env File Structure

```bash
# ✅ Correct format
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyBffvgUqdzFAzNyapWPTMM0sT-BEo1pOG0

# ❌ Wrong - no quotes needed
EXPO_PUBLIC_FIREBASE_API_KEY="AIzaSyBffvgUqdzFAzNyapWPTMM0sT-BEo1pOG0"

# ❌ Wrong - no spaces around =
EXPO_PUBLIC_FIREBASE_API_KEY = AIzaSyBffvgUqdzFAzNyapWPTMM0sT-BEo1pOG0
```

## For Production Deployment

When deploying with EAS Build:

1. **Option 1**: Use EAS Secrets (recommended)
   ```bash
   eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value your_value
   ```

2. **Option 2**: Configure in `eas.json`
   ```json
   {
     "build": {
       "production": {
         "env": {
           "EXPO_PUBLIC_FIREBASE_API_KEY": "your_value"
         }
       }
     }
   }
   ```

## References

- [Expo Environment Variables](https://docs.expo.dev/guides/environment-variables/)
- [Firebase Security Best Practices](https://firebase.google.com/docs/rules)
- [EAS Build Secrets](https://docs.expo.dev/build-reference/variables/)


