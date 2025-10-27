import { ConversationType, Message } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface MessageActionMenuProps {
  visible: boolean;
  message: Message | null;
  conversationType?: ConversationType;
  onClose: () => void;
  onReplyInThread: (message: Message) => void;
}

export default function MessageActionMenu({
  visible,
  message,
  conversationType,
  onClose,
  onReplyInThread,
}: MessageActionMenuProps) {
  if (!message) return null;

  const isGroupChat = conversationType === ConversationType.GROUP;

  const handleReplyInThread = () => {
    onReplyInThread(message);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <BlurView intensity={80} tint="light" style={styles.menuContainer}>
          <View style={styles.menuContent}>
            {isGroupChat && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleReplyInThread}
              >
                <Ionicons name="chatbox-outline" size={20} color="#007AFF" />
                <Text style={styles.menuText}>Reply in thread</Text>
              </TouchableOpacity>
            )}

            {/* Placeholder for future actions */}
            {/* <TouchableOpacity style={styles.menuItem}>
              <Ionicons name="copy-outline" size={20} color="#666" />
              <Text style={styles.menuText}>Copy</Text>
            </TouchableOpacity> */}

            <TouchableOpacity
              style={[styles.menuItem, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  menuContent: {
    paddingTop: 8,
    paddingBottom: 34, // Safe area padding
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  menuText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  cancelButton: {
    borderBottomWidth: 0,
    justifyContent: 'center',
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  cancelText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    textAlign: 'center',
  },
});

