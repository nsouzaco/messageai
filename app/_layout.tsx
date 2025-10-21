import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ChatProvider } from '@/contexts/ChatContext';
import { requestNotificationPermissions } from '@/services/firebase/notifications';

export {
    // Catch any errors thrown by the Layout component.
    ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <ChatProvider>
        <RootLayoutNav />
      </ChatProvider>
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Request notification permissions
  useEffect(() => {
    if (isAuthenticated) {
      requestNotificationPermissions();
    }
  }, [isAuthenticated]);

  // Handle notifications
  useEffect(() => {
    let notifListener: any;
    let respListener: any;

    // Listen to notifications received while app is foregrounded
    notifListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Listen to notification taps
    respListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
      
      // Navigate to the conversation if conversationId is provided
      const conversationId = response.notification.request.content.data?.conversationId;
      if (conversationId && typeof conversationId === 'string') {
        router.push(`/chat/${conversationId}`);
      }
    });

    return () => {
      // Properly remove notification listeners
      if (notifListener) {
        notifListener.remove();
      }
      if (respListener) {
        respListener.remove();
      }
    };
  }, [router]);

  // Handle auth routing
  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to tabs if authenticated
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, loading, segments]);

  if (loading) {
    return null; // Show splash screen while loading
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="create-conversation" options={{ presentation: 'modal', title: 'New Chat' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
