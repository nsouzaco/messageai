import { useAuth } from '@/contexts/AuthContext';
import { SearchResult, semanticSearch } from '@/services/firebase/ai';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function SearchScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim() || !user) return;

    setLoading(true);
    setSearched(true);

    try {
      const searchResults = await semanticSearch(query.trim());
      setResults(searchResults);
    } catch (error: any) {
      console.error('Search error:', error);
      // Handle error - maybe show a toast
    } finally {
      setLoading(false);
    }
  };

  const highlightText = (text: string, query: string) => {
    // Simple highlighting - in production, use a proper highlighting library
    return text;
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderResult = ({ item }: { item: SearchResult }) => {
    const scorePercentage = Math.round(item.score * 100);
    const relevanceColor =
      item.score > 0.9 ? '#34C759' : item.score > 0.8 ? '#FF9500' : '#999';

    return (
      <View style={styles.resultCardWrapper}>
        <BlurView intensity={30} tint="light" style={styles.glassCard}>
          <TouchableOpacity
            style={styles.resultCard}
            onPress={() => {
              // Navigate to conversation/message
              router.push(`/chat/${item.conversationId}`);
            }}
          >
        <View style={styles.resultHeader}>
          <View style={styles.resultMeta}>
            <Ionicons name="person-circle-outline" size={16} color="#666" />
            <Text style={styles.senderName}>{item.senderName}</Text>
            <Text style={styles.timestamp}>• {formatTimestamp(item.timestamp)}</Text>
          </View>
          <View style={styles.scoreContainer}>
            <View
              style={[styles.scoreIndicator, { backgroundColor: relevanceColor }]}
            />
            <Text style={styles.scoreText}>{scorePercentage}%</Text>
          </View>
        </View>

        <Text style={styles.resultText} numberOfLines={3}>
          {item.text}
        </Text>

        {item.threadId && (
          <View style={styles.threadBadge}>
            <Ionicons name="chatbox-outline" size={12} color="#007AFF" />
            <Text style={styles.threadBadgeText}>In thread</Text>
          </View>
        )}
          </TouchableOpacity>
        </BlurView>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    
    if (!searched) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={64} color="#000" />
          <Text style={styles.emptyText}>Smart Search</Text>
          <Text style={styles.emptySubtext}>
            Search messages using natural language{'\n'}
            Try: "Where did we discuss the API?"
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="search-outline" size={64} color="#000" />
        <Text style={styles.emptyText}>No results found</Text>
        <Text style={styles.emptySubtext}>
          Try a different search query
        </Text>
      </View>
    );
  };

  return (
    <LinearGradient
      colors={['#FFF5F7', '#F5E6FF', '#FFFFFF']}
      style={styles.container}
    >
      <View style={styles.headerWrapper}>
        <BlurView intensity={30} tint="light" style={styles.headerGlass}>
          <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Smart Search</Text>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <BlurView intensity={30} tint="light" style={styles.searchInputGlass}>
              <View style={styles.searchInputContainer}>
                <Ionicons name="search" size={20} color="#999" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Ask a question or describe what you're looking for..."
                  value={query}
                  onChangeText={setQuery}
                  onSubmitEditing={handleSearch}
                  returnKeyType="search"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {query.length > 0 && (
                  <TouchableOpacity onPress={() => setQuery('')}>
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>
            </BlurView>
          </View>
          <TouchableOpacity
            style={[styles.searchButton, !query.trim() && styles.searchButtonDisabled]}
            onPress={handleSearch}
            disabled={!query.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="search" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.examplesContainer}>
          <Text style={styles.examplesLabel}>Try:</Text>
          <View style={styles.examplesRow}>
            <View style={styles.exampleChipWrapper}>
              <BlurView intensity={30} tint="light" style={styles.exampleChipGlass}>
                <TouchableOpacity
                  style={styles.exampleChip}
                  onPress={() => setQuery('Where did we discuss the API refactor?')}
                >
                  <Text style={styles.exampleChipText}>API refactor</Text>
                </TouchableOpacity>
              </BlurView>
            </View>
            <View style={styles.exampleChipWrapper}>
              <BlurView intensity={30} tint="light" style={styles.exampleChipGlass}>
                <TouchableOpacity
                  style={styles.exampleChip}
                  onPress={() => setQuery('What decisions did we make about the database?')}
                >
                  <Text style={styles.exampleChipText}>Database decisions</Text>
                </TouchableOpacity>
              </BlurView>
            </View>
          </View>
        </View>
          </View>
        </BlurView>
      </View>

      <FlatList
        data={results}
        renderItem={renderResult}
        keyExtractor={(item) => item.messageId}
        contentContainerStyle={
          results.length === 0 ? styles.emptyListContent : styles.listContent
        }
        ListEmptyComponent={renderEmpty}
        ListHeaderComponent={
          results.length > 0 ? (
            <Text style={styles.resultsHeader}>
              Found {results.length} {results.length === 1 ? 'result' : 'results'}
            </Text>
          ) : null
        }
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerWrapper: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  headerGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  header: {
    backgroundColor: 'transparent',
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
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
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  searchInputWrapper: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  searchInputGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
  },
  searchButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 56,
  },
  searchButtonDisabled: {
    opacity: 0.5,
  },
  examplesContainer: {
    paddingHorizontal: 16,
  },
  examplesLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  examplesRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  exampleChipWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  exampleChipGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  exampleChip: {
    backgroundColor: 'transparent',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  exampleChipText: {
    fontSize: 13,
    color: '#666',
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
    color: '#000',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#000',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  resultsHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  resultCardWrapper: {
    marginBottom: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  resultCard: {
    backgroundColor: 'transparent',
    padding: 16,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  senderName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  timestamp: {
    fontSize: 13,
    color: '#999',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scoreIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  scoreText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  resultText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  threadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#E3F2FD',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  threadBadgeText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
});

