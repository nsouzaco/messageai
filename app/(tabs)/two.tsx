import CachedImage from '@/components/CachedImage';
import { useAuth } from '@/contexts/AuthContext';
import { uploadProfilePicture } from '@/services/firebase/storage';
import { OnlineStatus } from '@/types';
import { getInitials } from '@/utils/helpers';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function SettingsScreen() {
  const { user, updateProfile, logout } = useAuth();
  const [uploading, setUploading] = useState(false);

  const handleChangeProfilePicture = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0] && user) {
        setUploading(true);
        const profilePictureUrl = await uploadProfilePicture(user.id, result.assets[0].uri);
        await updateProfile({ profilePicture: profilePictureUrl });
        Alert.alert('Success', 'Profile picture updated');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile picture');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          },
        },
      ]
    );
  };

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <View style={styles.profileSection}>
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={handleChangeProfilePicture}
          disabled={uploading}
        >
          {uploading ? (
            <View style={styles.avatarPlaceholder}>
              <ActivityIndicator color="#fff" />
            </View>
          ) : user.profilePicture ? (
            <CachedImage uri={user.profilePicture} style={styles.avatar} borderRadius={50} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{getInitials(user.displayName)}</Text>
            </View>
          )}
          <View style={styles.cameraIcon}>
            <Ionicons name="camera" size={16} color="#fff" />
          </View>
        </TouchableOpacity>

        <Text style={styles.displayName}>{user.displayName}</Text>
        <Text style={styles.username}>@{user.username}</Text>
        <View style={styles.statusBadge}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: user.onlineStatus === OnlineStatus.ONLINE ? '#4CAF50' : '#999' },
            ]}
          />
          <Text style={styles.statusText}>
            {user.onlineStatus === OnlineStatus.ONLINE ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Information</Text>

        <View style={styles.infoItem}>
          <Ionicons name="mail-outline" size={20} color="#666" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user.email}</Text>
          </View>
        </View>

        <View style={styles.infoItem}>
          <Ionicons name="person-outline" size={20} color="#666" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Username</Text>
            <Text style={styles.infoValue}>@{user.username}</Text>
          </View>
        </View>

        <View style={styles.infoItem}>
          <Ionicons name="time-outline" size={20} color="#666" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Member Since</Text>
            <Text style={styles.infoValue}>
              {new Date(user.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>

        <TouchableOpacity style={styles.actionButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
          <Text style={[styles.actionText, styles.actionTextDanger]}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>MessageAI v1.0.0</Text>
        <Text style={styles.footerSubtext}>Built with React Native, Expo, and Firebase</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
  },
  profileSection: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '600',
  },
  cameraIcon: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  displayName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#fff',
    marginBottom: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#000',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  actionText: {
    fontSize: 16,
    color: '#000',
  },
  actionTextDanger: {
    color: '#FF3B30',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  footerText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#ccc',
  },
});
