import { debounce } from '@/utils/helpers';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
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
  const [isTyping, setIsTyping] = useState(false);

  // Debounced typing indicator - stops typing after 3 seconds of inactivity
  const debouncedStopTyping = useCallback(
    debounce(() => {
      setIsTyping(false);
      onTyping?.(false);
    }, 3000), // Increased to 3 seconds for smoother experience
    [onTyping]
  );

  const handleChangeText = (newText: string) => {
    setText(newText);

    if (onTyping) {
      if (newText.length > 0) {
        // Only trigger onTyping(true) if not already typing
        if (!isTyping) {
          setIsTyping(true);
          onTyping(true);
        }
        // Reset the stop typing timer on each keystroke
        debouncedStopTyping();
      } else {
        // Immediately stop typing when text is cleared
        setIsTyping(false);
        onTyping(false);
      }
    }
  };

  const handleSend = () => {
    const trimmedText = text.trim();
    if (trimmedText.length === 0) return;

    onSend(trimmedText);
    setText('');
    setIsTyping(false);
    onTyping?.(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <BlurView intensity={80} tint="light" style={styles.containerBlur}>
        <View style={styles.container}>
          <View style={styles.inputWrapper}>
            <View style={styles.inputBorder}>
              <BlurView intensity={30} tint="light" style={styles.inputGlass}>
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
              </BlurView>
            </View>
          </View>
        </View>
      </BlurView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  containerBlur: {
    borderTopWidth: 0,
    backgroundColor: 'transparent',
  },
  container: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 12,
    paddingBottom: 24,
    alignItems: 'center',
  },
  inputWrapper: {
    width: '90%',
  },
  inputBorder: {
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  },
  inputGlass: {
    backgroundColor: 'rgba(255, 255, 255, 1)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 40,
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: 8,
    paddingTop: Platform.OS === 'ios' ? 8 : 6,
    paddingBottom: Platform.OS === 'ios' ? 8 : 6,
    textAlignVertical: 'center',
  },
  sendButton: {
    marginLeft: 8,
    padding: 4,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});


