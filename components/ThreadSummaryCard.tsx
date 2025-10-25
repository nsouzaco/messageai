import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface ThreadSummaryCardProps {
  summary: string;
  bulletPoints: string[];
  messageCount: number;
  generatedAt: number;
  cached?: boolean;
  onDismiss?: () => void;
}

export default function ThreadSummaryCard({
  summary,
  bulletPoints,
  messageCount,
  generatedAt,
  cached = false,
  onDismiss,
}: ThreadSummaryCardProps) {
  const [expanded, setExpanded] = useState(false);

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="sparkles" size={18} color="#007AFF" />
          <Text style={styles.title}>AI Summary</Text>
          {cached && (
            <View style={styles.cachedBadge}>
              <Ionicons name="flash" size={12} color="#666" />
              <Text style={styles.cachedText}>Cached</Text>
            </View>
          )}
        </View>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
            <Ionicons name="close" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Meta info */}
      <Text style={styles.meta}>
        {messageCount} messages · Generated {formatTimestamp(generatedAt)}
      </Text>

      {/* Bullet points */}
      <View style={styles.bulletPointsContainer}>
        {bulletPoints.slice(0, expanded ? bulletPoints.length : 3).map((point, index) => (
          <View key={index} style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>{point}</Text>
          </View>
        ))}
      </View>

      {/* Expand/Collapse button */}
      {bulletPoints.length > 3 && (
        <TouchableOpacity
          onPress={() => setExpanded(!expanded)}
          style={styles.expandButton}
        >
          <Text style={styles.expandText}>
            {expanded ? 'Show less' : `Show ${bulletPoints.length - 3} more`}
          </Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color="#007AFF"
          />
        </TouchableOpacity>
      )}

      {/* Full summary (optional) */}
      {expanded && summary && (
        <View style={styles.fullSummary}>
          <Text style={styles.fullSummaryLabel}>Full Summary:</Text>
          <Text style={styles.fullSummaryText}>{summary}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#007AFF20',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  cachedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  cachedText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },
  dismissButton: {
    padding: 4,
  },
  meta: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  bulletPointsContainer: {
    gap: 8,
  },
  bulletPoint: {
    flexDirection: 'row',
    gap: 8,
  },
  bullet: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: 'bold',
    lineHeight: 22,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 12,
    paddingVertical: 8,
  },
  expandText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  fullSummary: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#007AFF20',
  },
  fullSummaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  fullSummaryText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
});

