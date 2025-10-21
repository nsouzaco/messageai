import { OnlineStatus } from '@/types';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface PresenceIndicatorProps {
  status: OnlineStatus;
  size?: number;
}

export default function PresenceIndicator({ status, size = 12 }: PresenceIndicatorProps) {
  if (status !== OnlineStatus.ONLINE) return null;

  return (
    <View
      style={[
        styles.indicator,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  indicator: {
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#fff',
  },
});


