import { ConversationType, Message } from '@/types';
import { Ionicons } from '@expo/vector-icons';
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
        <View style={styles.menuContainer}>
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
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
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
    borderBottomColor: '#f0f0f0',
  },
  menuText: {
    fontSize: 16,
    color: '#000',
  },
  cancelButton: {
    borderBottomWidth: 0,
    justifyContent: 'center',
    marginTop: 8,
  },
  cancelText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    textAlign: 'center',
  },
});

