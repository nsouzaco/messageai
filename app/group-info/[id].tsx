import CachedImage from '@/components/CachedImage';
import PresenceIndicator from '@/components/PresenceIndicator';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { uploadGroupPicture } from '@/services/firebase/storage';
import { ConversationType, OnlineStatus } from '@/types';
import { getInitials } from '@/utils/helpers';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getFirestore, updateDoc } from 'firebase/firestore';
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

export default function GroupInfoScreen() {
  const { id } = useLocalSearchParams();
  const conversationId = id as string;
  const router = useRouter();
  const { user } = useAuth();
  const { conversations } = useChat();
  const [uploading, setUploading] = useState(false);

  const conversation = conversations.find((c) => c.id === conversationId);

  if (!conversation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (conversation.type !== ConversationType.GROUP) {
    router.back();
    return null;
  }

  const participants = conversation.participantDetails || [];
  const groupName = conversation.name || 'Group Chat';
  const groupPicture = conversation.groupPicture;

  const handleChangeGroupPicture = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant access to your photos to change the group picture.');
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) return;

      setUploading(true);

      // Upload to Firebase Storage
      const imageUri = result.assets[0].uri;
      const downloadURL = await uploadGroupPicture(conversationId, imageUri);

      // Update conversation in Firestore
      const firestore = getFirestore();
      const conversationRef = doc(firestore, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        groupPicture: downloadURL,
      });

      Alert.alert('Success', 'Group picture updated!');
    } catch (error: any) {
      console.error('Error updating group picture:', error);
      Alert.alert('Error', error.message || 'Failed to update group picture');
    } finally {
      setUploading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#FFF5F7', '#F5E6FF', '#FFFFFF']}
      style={styles.container}
    >
      {/* Header with Glass Effect */}
      <BlurView intensity={80} tint="light" style={styles.modalHeaderBlur}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#000" />
          </TouchableOpacity>
          <Text style={styles.modalHeaderTitle}>Group Info</Text>
          <View style={styles.headerSpacer} />
        </View>
      </BlurView>

      <ScrollView style={styles.scrollView}>
      {/* Group Name Section */}
      <View style={styles.groupSectionWrapper}>
        <BlurView intensity={30} tint="light" style={styles.glassCard}>
          <View style={styles.groupSection}>
        <TouchableOpacity 
          style={styles.groupIconContainer}
          onPress={handleChangeGroupPicture}
          disabled={uploading}
        >
          {groupPicture ? (
            <CachedImage
              uri={groupPicture}
              style={styles.groupPictureImage}
              borderRadius={50}
            />
          ) : (
            <View style={styles.groupIcon}>
              <Ionicons name="people" size={40} color="#007AFF" />
            </View>
          )}
          <View style={styles.editIconContainer}>
            {uploading ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Ionicons name="camera" size={18} color="#fff" />
            )}
          </View>
        </TouchableOpacity>
        <Text style={styles.groupName}>{groupName}</Text>
        <Text style={styles.groupSubtitle}>
          {participants.length} {participants.length === 1 ? 'member' : 'members'}
        </Text>
        <Text style={styles.changePhotoHint}>Tap to change group picture</Text>
          </View>
        </BlurView>
      </View>

      {/* Participants Section */}
      <View style={styles.sectionTitleWrapper}>
        <BlurView intensity={30} tint="light" style={styles.sectionTitleGlass}>
          <Text style={styles.sectionTitle}>
            {participants.length} {participants.length === 1 ? 'Participant' : 'Participants'}
          </Text>
        </BlurView>
      </View>
      
      <View style={styles.sectionWrapper}>
        <BlurView intensity={30} tint="light" style={styles.glassCard}>
          <View style={styles.section}>
        
        {participants.map((participant) => {
          const isCurrentUser = participant.id === user?.id;
          const isOnline = participant.onlineStatus === OnlineStatus.ONLINE;

          return (
            <View key={participant.id} style={styles.participantItem}>
              <View style={styles.participantLeft}>
                {participant.profilePicture ? (
                  <CachedImage
                    uri={participant.profilePicture}
                    style={styles.participantAvatar}
                    borderRadius={24}
                  />
                ) : (
                  <View style={styles.participantAvatarPlaceholder}>
                    <Text style={styles.participantAvatarText}>
                      {getInitials(participant.displayName)}
                    </Text>
                  </View>
                )}
                
                {isOnline && (
                  <View style={styles.participantPresence}>
                    <PresenceIndicator status={OnlineStatus.ONLINE} size={12} />
                  </View>
                )}
              </View>

              <View style={styles.participantInfo}>
                <View style={styles.participantNameRow}>
                  <Text style={styles.participantName}>
                    {participant.displayName}
                  </Text>
                  {isCurrentUser && (
                    <Text style={styles.youLabel}>You</Text>
                  )}
                </View>
                <Text style={styles.participantStatus}>
                  {isOnline ? 'Online' : 'Offline'}
                </Text>
              </View>
            </View>
          );
        })}
          </View>
        </BlurView>
      </View>

      {/* Group Actions Section */}
      <View style={styles.actionButtonWrapper}>
        <BlurView intensity={30} tint="light" style={styles.actionButtonGlass}>
          <TouchableOpacity style={styles.leaveGroupButton}>
            <Text style={styles.leaveGroupButtonText}>Leave Group</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </BlurView>
      </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalHeaderBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    paddingTop: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  groupSectionWrapper: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  sectionWrapper: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  groupSection: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    paddingVertical: 32,
  },
  groupIconContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  groupIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupPictureImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  editIconContainer: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  changePhotoHint: {
    fontSize: 13,
    color: '#999',
    marginTop: 8,
  },
  groupName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  groupSubtitle: {
    fontSize: 15,
    color: '#666',
  },
  section: {
    backgroundColor: 'transparent',
    paddingVertical: 8,
  },
  sectionTitleWrapper: {
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionTitleGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  participantLeft: {
    position: 'relative',
    marginRight: 12,
  },
  participantAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  participantAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  participantPresence: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 2,
  },
  participantInfo: {
    flex: 1,
  },
  participantNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  youLabel: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '500',
  },
  participantStatus: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  actionButtonWrapper: {
    marginHorizontal: 'auto',
    marginTop: 8,
    marginBottom: 24,
    borderRadius: 30,
    overflow: 'hidden',
    width: '70%',
    alignSelf: 'center',
  },
  actionButtonGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  leaveGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
    gap: 8,
  },
  leaveGroupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

