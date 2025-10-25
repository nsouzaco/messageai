import { useAuth } from '@/contexts/AuthContext';
import { uploadProfilePicture } from '@/services/firebase/storage';
import { getStorageErrorMessage } from '@/utils/errorMessages';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function ProfileSetupScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { user, updateProfile } = useAuth();
  const router = useRouter();

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleContinue = async () => {
    if (!imageUri) {
      // Skip profile picture setup
      router.replace('/(tabs)');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'User not found');
      return;
    }

    setUploading(true);

    try {
      const profilePictureUrl = await uploadProfilePicture(user.id, imageUri);
      await updateProfile({ profilePicture: profilePictureUrl });
      router.replace('/(tabs)');
    } catch (error: any) {
      const errorMessage = getStorageErrorMessage(error);
      Alert.alert('Upload Failed', errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleSkip = () => {
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Add Profile Picture</Text>
        <Text style={styles.subtitle}>Help others recognize you</Text>

        <TouchableOpacity
          style={styles.imageContainer}
          onPress={pickImage}
          disabled={uploading}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} contentFit="cover" />
          ) : (
            <View style={styles.placeholderContainer}>
              <Text style={styles.placeholderText}>Tap to select image</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, uploading && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {imageUri ? 'Continue' : 'Skip for now'}
            </Text>
          )}
        </TouchableOpacity>

        {imageUri && (
          <TouchableOpacity
            style={styles.linkButton}
            onPress={handleSkip}
            disabled={uploading}
          >
            <Text style={styles.linkText}>Skip for now</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  imageContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    overflow: 'hidden',
    marginBottom: 40,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  placeholderText: {
    color: '#999',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
});


