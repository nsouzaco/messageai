import { Image } from 'expo-image';
import React from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';

interface CachedImageProps {
  uri: string;
  style?: StyleProp<ViewStyle>;
  placeholder?: React.ReactNode;
  borderRadius?: number;
}

/**
 * Optimized image component with built-in caching
 * Uses expo-image for better performance and automatic disk/memory caching
 */
export default function CachedImage({ uri, style, placeholder, borderRadius }: CachedImageProps) {
  return (
    <Image
      source={{ uri }}
      style={[style, borderRadius ? { borderRadius } : undefined]}
      placeholder={placeholder as any}
      contentFit="cover"
      transition={200}
      cachePolicy="memory-disk"
      recyclingKey={uri}
      placeholderContentFit="cover"
    />
  );
}

const styles = StyleSheet.create({});


