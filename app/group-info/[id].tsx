import CachedImage from '@/components/CachedImage';
import PresenceIndicator from '@/components/PresenceIndicator';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { ConversationType, OnlineStatus } from '@/types';
import { getInitials } from '@/utils/helpers';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
    ActivityIndicator,
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

  return (
    <ScrollView style={styles.container}>
      {/* Group Name Section */}
      <View style={styles.groupSection}>
        <View style={styles.groupIconContainer}>
          <View style={styles.groupIcon}>
            <Ionicons name="people" size={40} color="#007AFF" />
          </View>
        </View>
        <Text style={styles.groupName}>{groupName}</Text>
        <Text style={styles.groupSubtitle}>
          {participants.length} {participants.length === 1 ? 'member' : 'members'}
        </Text>
      </View>

      {/* Participants Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {participants.length} {participants.length === 1 ? 'Participant' : 'Participants'}
        </Text>
        
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

      {/* Group Actions Section */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.actionItem}>
          <Ionicons name="exit-outline" size={24} color="#FF3B30" />
          <Text style={[styles.actionText, styles.actionTextDanger]}>
            Leave Group
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  groupSection: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  groupIconContainer: {
    marginBottom: 16,
  },
  groupIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: '#fff',
    marginTop: 20,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9f9f9',
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
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  actionText: {
    fontSize: 16,
    color: '#000',
  },
  actionTextDanger: {
    color: '#FF3B30',
  },
});

