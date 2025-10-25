import { useAuth } from '@/contexts/AuthContext';
import { firestore } from '@/firebaseConfig';
import { Decision } from '@/services/firebase/ai';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function DecisionsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    // Listen to decisions from Firestore
    const q = query(
      collection(firestore, 'decisions'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Decision[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Decision);
      });

      setDecisions(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Get unique tags
  const allTags = Array.from(
    new Set(decisions.flatMap((d) => d.tags || []))
  ).sort();

  const filteredDecisions = selectedTag
    ? decisions.filter((d) => d.tags?.includes(selectedTag))
    : decisions;

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const renderDecision = ({ item }: { item: Decision }) => {
    return (
      <View style={styles.decisionCard}>
        <View style={styles.decisionHeader}>
          <Ionicons name="bulb" size={20} color="#FF9500" />
          <Text style={styles.decisionDate}>{formatDate(item.timestamp)}</Text>
        </View>

        <Text style={styles.decisionText}>{item.decision}</Text>

        {item.participants && item.participants.length > 0 && (
          <View style={styles.participantsContainer}>
            <Ionicons name="people-outline" size={14} color="#666" />
            <Text style={styles.participantsText}>
              {item.participants.join(', ')}
            </Text>
          </View>
        )}

        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {item.tags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {item.confidence && (
          <View style={styles.confidenceContainer}>
            <View
              style={[
                styles.confidenceBar,
                { width: `${item.confidence * 100}%` },
              ]}
            />
            <Text style={styles.confidenceText}>
              {Math.round(item.confidence * 100)}% confidence
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Decisions</Text>
            <Text style={styles.headerSubtitle}>
              {filteredDecisions.length} tracked
            </Text>
          </View>
        </View>
        <Ionicons name="bulb-outline" size={32} color="#FF9500" />
      </View>

      {allTags.length > 0 && (
        <View style={styles.tagsFilter}>
          <TouchableOpacity
            style={[
              styles.filterTag,
              selectedTag === null && styles.filterTagActive,
            ]}
            onPress={() => setSelectedTag(null)}
          >
            <Text
              style={[
                styles.filterTagText,
                selectedTag === null && styles.filterTagTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          {allTags.map((tag) => (
            <TouchableOpacity
              key={tag}
              style={[
                styles.filterTag,
                selectedTag === tag && styles.filterTagActive,
              ]}
              onPress={() => setSelectedTag(tag)}
            >
              <Text
                style={[
                  styles.filterTagText,
                  selectedTag === tag && styles.filterTagTextActive,
                ]}
              >
                {tag}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="bulb-outline" size={64} color="#ccc" />
      <Text style={styles.emptyText}>No decisions yet</Text>
      <Text style={styles.emptySubtext}>
        AI will automatically detect and log team decisions from conversations
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      <FlatList
        data={filteredDecisions}
        renderItem={renderDecision}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          filteredDecisions.length === 0
            ? styles.emptyListContent
            : styles.listContent
        }
        ListEmptyComponent={renderEmpty}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
  },
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  tagsFilter: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    flexWrap: 'wrap',
  },
  filterTag: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterTagActive: {
    backgroundColor: '#FF9500',
    borderColor: '#FF9500',
  },
  filterTagText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  filterTagTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#ccc',
    marginTop: 8,
    textAlign: 'center',
  },
  decisionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  decisionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  decisionDate: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  decisionText: {
    fontSize: 16,
    color: '#000',
    lineHeight: 24,
    marginBottom: 12,
  },
  participantsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  participantsText: {
    fontSize: 13,
    color: '#666',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  tag: {
    backgroundColor: '#FFF3E0',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    color: '#FF9500',
    fontWeight: '500',
  },
  confidenceContainer: {
    marginTop: 8,
  },
  confidenceBar: {
    height: 4,
    backgroundColor: '#FF9500',
    borderRadius: 2,
    marginBottom: 4,
  },
  confidenceText: {
    fontSize: 11,
    color: '#999',
  },
});

