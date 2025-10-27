import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface PriorityBadgeProps {
  priority: 'high' | 'medium' | 'low';
  score?: number;
  size?: 'small' | 'medium';
  showLabel?: boolean;
}

export default function PriorityBadge({
  priority,
  score,
  size = 'small',
  showLabel = false,
}: PriorityBadgeProps) {
  const getConfig = () => {
    switch (priority) {
      case 'high':
        return {
          icon: 'alert-circle' as keyof typeof Ionicons.glyphMap,
          color: '#FF3B30',
          label: 'High Priority',
          bgColor: '#FFEBEE',
        };
      case 'medium':
        return {
          icon: 'information-circle' as keyof typeof Ionicons.glyphMap,
          color: '#FF9500',
          label: 'Medium Priority',
          bgColor: '#FFF3E0',
        };
      case 'low':
        return {
          icon: 'checkmark-circle' as keyof typeof Ionicons.glyphMap,
          color: '#34C759',
          label: 'Low Priority',
          bgColor: '#E8F5E9',
        };
    }
  };

  const config = getConfig();
  const iconSize = size === 'small' ? 14 : 18;
  const fontSize = size === 'small' ? 11 : 13;

  if (showLabel) {
    return (
      <View style={[styles.labelContainer, { backgroundColor: config.bgColor }]}>
        <Ionicons name={config.icon} size={iconSize} color={config.color} />
        <Text style={[styles.labelText, { color: config.color, fontSize }]}>
          {config.label}
        </Text>
        {score !== undefined && (
          <Text style={[styles.scoreText, { fontSize: fontSize - 2 }]}>
            ({Math.round(score)})
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
      <Ionicons name={config.icon} size={iconSize} color={config.color} />
    </View>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  labelText: {
    fontWeight: '600',
  },
  scoreText: {
    color: '#666',
    fontWeight: '500',
  },
});


