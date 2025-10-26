import CachedImage from '@/components/CachedImage';
import { useAuth } from '@/contexts/AuthContext';
import { createConversation, getAllUsers, getOrCreateConversation } from '@/services/firebase/firestore';
import { ConversationType, User } from '@/types';
import { getInitials } from '@/utils/helpers';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function CreateConversationScreen() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const fetchedUsers = await getAllUsers(currentUser.id);
      setUsers(fetchedUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreate = async () => {
    if (!currentUser) return;

    if (selectedUsers.length === 0) {
      Alert.alert('Error', 'Please select at least one user');
      return;
    }

    if (selectedUsers.length > 1 && !groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    setCreating(true);

    try {
      let conversationId: string;

      if (selectedUsers.length === 1) {
        // Create or get one-on-one conversation
        conversationId = await getOrCreateConversation(currentUser.id, selectedUsers[0]);
      } else {
        // Create group conversation
        const participants = [currentUser.id, ...selectedUsers];
        conversationId = await createConversation(
          participants,
          ConversationType.GROUP,
          currentUser.id,
          groupName.trim()
        );
      }

      router.replace(`/chat/${conversationId}`);
    } catch (error: any) {
      console.error('Error creating conversation:', error);
      Alert.alert('Error', error.message || 'Failed to create conversation');
    } finally {
      setCreating(false);
    }
  };

  const filteredUsers = users.filter((user) =>
    user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderUser = ({ item }: { item: User }) => {
    const isSelected = selectedUsers.includes(item.id);

    return (
      <View style={styles.userItemWrapper}>
        <BlurView intensity={30} tint="light" style={styles.glassCard}>
          <TouchableOpacity
            style={[styles.userItem, isSelected && styles.userItemSelected]}
            onPress={() => toggleUserSelection(item.id)}
          >
        <View style={styles.userInfo}>
          {item.profilePicture ? (
            <CachedImage uri={item.profilePicture} style={styles.avatar} borderRadius={24} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{getInitials(item.displayName)}</Text>
            </View>
          )}

          <View style={styles.userDetails}>
            <Text style={styles.userName}>{item.displayName}</Text>
            <Text style={styles.userUsername}>@{item.username}</Text>
          </View>
        </View>

        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
        )}
          </TouchableOpacity>
        </BlurView>
      </View>
    );
  };

  if (loading) {
    return (
      <LinearGradient
        colors={['#FFF5F7', '#F5E6FF', '#FFFFFF']}
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" color="#007AFF" />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#FFF5F7', '#F5E6FF', '#FFFFFF']}
      style={styles.container}
    >
      <View style={styles.headerWrapper}>
        <BlurView intensity={30} tint="light" style={styles.headerGlass}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>New Chat</Text>
            <TouchableOpacity onPress={handleCreate} disabled={creating || selectedUsers.length === 0}>
              <Text
                style={[
                  styles.createButton,
                  (creating || selectedUsers.length === 0) && styles.createButtonDisabled,
                ]}
              >
                {creating ? 'Creating...' : 'Create'}
              </Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </View>

      {selectedUsers.length > 0 && (
        <View style={styles.selectedContainer}>
          <Text style={styles.selectedText}>
            {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected
          </Text>
        </View>
      )}

      {selectedUsers.length > 1 && (
        <View style={styles.groupNameContainer}>
          <TextInput
            style={styles.groupNameInput}
            placeholder="Group Name (required)"
            placeholderTextColor="#999"
            value={groupName}
            onChangeText={setGroupName}
            maxLength={50}
          />
        </View>
      )}

      <View style={styles.searchWrapper}>
        <BlurView intensity={30} tint="light" style={styles.searchGlass}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search users"
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </BlurView>
      </View>

      <FlatList
        data={filteredUsers}
        renderItem={renderUser}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.usersList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        }
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: 'transparent',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  cancelButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  createButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  selectedContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  selectedText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  groupNameContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  groupNameInput: {
    fontSize: 16,
    color: '#000',
    padding: 0,
  },
  searchWrapper: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  searchGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  usersList: {
    paddingBottom: 20,
    paddingHorizontal: 12,
  },
  userItemWrapper: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  userItemSelected: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});


