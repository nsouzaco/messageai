import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApps, initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration loaded from environment variables
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Auth with AsyncStorage persistence
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  // Auth already initialized
  auth = getAuth(app);
}

// Initialize Firestore with offline persistence for React Native
let firestore;
try {
  // For React Native, we don't need to configure persistence explicitly
  // Firestore automatically uses AsyncStorage for offline persistence
  firestore = initializeFirestore(app, {
    experimentalForceLongPolling: true, // Better for React Native
  });
} catch (error) {
  // Firestore already initialized
  firestore = getFirestore(app);
}

// Initialize Realtime Database (for presence and typing indicators)
const realtimeDb = getDatabase(app);

// Initialize Storage
const storage = getStorage(app);

export { app, auth, firestore, realtimeDb, storage };

