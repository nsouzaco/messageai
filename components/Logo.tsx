import { useFonts, PlayfairDisplay_400Regular, PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  variant?: 'light' | 'dark';
}

export default function Logo({ size = 'medium', variant = 'dark' }: LogoProps) {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  const sizeStyles = {
    small: { fontSize: 24 },
    medium: { fontSize: 36 },
    large: { fontSize: 48 },
  };

  const colorStyles = {
    light: { color: '#ffffff' },
    dark: { color: '#000000' },
  };

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.logo,
          sizeStyles[size],
          colorStyles[variant],
        ]}
      >
        Aligna
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontFamily: 'PlayfairDisplay_700Bold',
    letterSpacing: 1,
  },
});


