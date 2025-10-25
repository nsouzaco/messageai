import { useAuth } from '@/contexts/AuthContext';
import { firestore } from '@/firebaseConfig';
import { ActionItem } from '@/services/firebase/ai';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function ActionItemsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active');

  useEffect(() => {
    if (!user) return;

    // Listen to action items from Firestore
    const q = query(
      collection(firestore, 'actionItems'),
      where('conversationId', '!=', null) // Get all items user has access to
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: ActionItem[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as ActionItem);
      });
      
      // Sort by due date, then by created date
      items.sort((a, b) => {
        if (a.dueDate && b.dueDate) return a.dueDate - b.dueDate;
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return b.createdAt - a.createdAt;
      });

      setActionItems(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleToggleComplete = async (item: ActionItem) => {
    try {
      const itemRef = doc(firestore, 'actionItems', item.id);
      await updateDoc(itemRef, {
        completed: !item.completed,
      });
    } catch (error) {
      console.error('Error updating action item:', error);
      Alert.alert('Error', 'Failed to update action item');
    }
  };

  const filteredItems = actionItems.filter((item) => {
    if (filter === 'active') return !item.completed;
    if (filter === 'completed') return item.completed;
    return true;
  });

  const renderActionItem = ({ item }: { item: ActionItem }) => {
    const isOverdue = item.dueDate && item.dueDate < Date.now() && !item.completed;
    const dueDateText = item.dueDate
      ? new Date(item.dueDate).toLocaleDateString()
      : null;

    return (
      <TouchableOpacity
        style={[styles.itemContainer, item.completed && styles.itemCompleted]}
        onPress={() => handleToggleComplete(item)}
      >
        <View style={styles.itemCheckbox}>
          <Ionicons
            name={item.completed ? 'checkmark-circle' : 'ellipse-outline'}
            size={28}
            color={item.completed ? '#34C759' : '#007AFF'}
          />
        </View>
        <View style={styles.itemContent}>
          <Text
            style={[styles.itemText, item.completed && styles.itemTextCompleted]}
          >
            {item.text}
          </Text>
          <View style={styles.itemMeta}>
            {item.assignee && (
              <View style={styles.metaItem}>
                <Ionicons name="person-outline" size={14} color="#666" />
                <Text style={styles.metaText}>{item.assignee}</Text>
              </View>
            )}
            {dueDateText && (
              <View style={[styles.metaItem, isOverdue && styles.metaOverdue]}>
                <Ionicons
                  name="calendar-outline"
                  size={14}
                  color={isOverdue ? '#FF3B30' : '#666'}
                />
                <Text style={[styles.metaText, isOverdue && styles.metaOverdueText]}>
                  {dueDateText}
                </Text>
              </View>
            )}
            {item.confidence && (
              <View style={styles.metaItem}>
                <Ionicons name="analytics-outline" size={14} color="#666" />
                <Text style={styles.metaText}>
                  {Math.round(item.confidence * 100)}% confident
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
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
            <Text style={styles.headerTitle}>Action Items</Text>
            <Text style={styles.headerSubtitle}>
              {filteredItems.length} {filter === 'all' ? 'total' : filter}
            </Text>
          </View>
        </View>
        <Ionicons name="checkbox-outline" size={32} color="#007AFF" />
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'active' && styles.filterButtonActive]}
          onPress={() => setFilter('active')}
        >
          <Text
            style={[
              styles.filterButtonText,
              filter === 'active' && styles.filterButtonTextActive,
            ]}
          >
            Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === 'completed' && styles.filterButtonActive,
          ]}
          onPress={() => setFilter('completed')}
        >
          <Text
            style={[
              styles.filterButtonText,
              filter === 'completed' && styles.filterButtonTextActive,
            ]}
          >
            Completed
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text
            style={[
              styles.filterButtonText,
              filter === 'all' && styles.filterButtonTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="checkbox-outline" size={64} color="#ccc" />
      <Text style={styles.emptyText}>No action items yet</Text>
      <Text style={styles.emptySubtext}>
        AI will automatically extract action items from your conversations
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
        data={filteredItems}
        renderItem={renderActionItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          filteredItems.length === 0 ? styles.emptyListContent : styles.listContent
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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterButtonTextActive: {
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
  itemContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  itemCompleted: {
    opacity: 0.6,
  },
  itemCheckbox: {
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemText: {
    fontSize: 16,
    color: '#000',
    lineHeight: 22,
  },
  itemTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  itemMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaOverdue: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#666',
  },
  metaOverdueText: {
    color: '#FF3B30',
    fontWeight: '500',
  },
});

