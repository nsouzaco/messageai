import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

interface TypingIndicatorProps {
  userNames: string[];
}

export default function TypingIndicator({ userNames }: TypingIndicatorProps) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animation1 = animate(dot1, 0);
    const animation2 = animate(dot2, 200);
    const animation3 = animate(dot3, 400);

    animation1.start();
    animation2.start();
    animation3.start();

    return () => {
      animation1.stop();
      animation2.stop();
      animation3.stop();
    };
  }, []);

  const getText = () => {
    if (userNames.length === 0) return '';
    if (userNames.length === 1) return `${userNames[0]} is typing`;
    if (userNames.length === 2) return `${userNames[0]} and ${userNames[1]} are typing`;
    return `${userNames[0]} and ${userNames.length - 1} others are typing`;
  };

  if (userNames.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        <Text style={styles.text}>{getText()}</Text>
        <View style={styles.dotsContainer}>
          <Animated.View
            style={[
              styles.dot,
              {
                opacity: dot1,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              {
                opacity: dot2,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              {
                opacity: dot3,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  bubble: {
    backgroundColor: '#E8E8E8',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#666',
  },
});


