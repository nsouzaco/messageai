import { debounce } from '@/utils/helpers';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface MessageInputProps {
  onSend: (text: string) => void;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
}

export default function MessageInput({
  onSend,
  onTyping,
  disabled = false,
}: MessageInputProps) {
  const [text, setText] = useState('');

  // Debounced typing indicator
  const debouncedStopTyping = useCallback(
    debounce(() => {
      onTyping?.(false);
    }, 2000),
    [onTyping]
  );

  const handleChangeText = (newText: string) => {
    setText(newText);

    if (onTyping) {
      if (newText.length > 0) {
        onTyping(true);
        debouncedStopTyping();
      } else {
        onTyping(false);
      }
    }
  };

  const handleSend = () => {
    const trimmedText = text.trim();
    if (trimmedText.length === 0) return;

    onSend(trimmedText);
    setText('');
    onTyping?.(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.container}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Message"
            placeholderTextColor="#999"
            value={text}
            onChangeText={handleChangeText}
            multiline
            maxLength={1000}
            editable={!disabled}
          />
          <TouchableOpacity
            style={[styles.sendButton, text.trim().length === 0 && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={disabled || text.trim().length === 0}
          >
            <Ionicons
              name="send"
              size={20}
              color={text.trim().length > 0 ? '#007AFF' : '#999'}
            />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f5f5f5',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 40,
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: 4,
  },
  sendButton: {
    marginLeft: 8,
    padding: 4,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});


