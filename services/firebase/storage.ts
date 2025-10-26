import * as ImageManipulator from 'expo-image-manipulator';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../../firebaseConfig';

/**
 * Upload profile picture to Firebase Storage
 */
export const uploadProfilePicture = async (
  userId: string,
  imageUri: string
): Promise<string> => {
  try {
    // Resize image to reduce file size
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 400, height: 400 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );

    // Convert to blob
    const response = await fetch(manipulatedImage.uri);
    const blob = await response.blob();

    // Upload to Firebase Storage
    const filename = `profile_pictures/${userId}_${Date.now()}.jpg`;
    const storageRef = ref(storage, filename);
    
    await uploadBytes(storageRef, blob);

    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
  } catch (error: any) {
    console.error('Error uploading profile picture:', error);
    throw new Error(error.message || 'Failed to upload profile picture');
  }
};

/**
 * Upload group picture to Firebase Storage
 */
export const uploadGroupPicture = async (
  conversationId: string,
  imageUri: string
): Promise<string> => {
  try {
    // Resize image to reduce file size
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 400, height: 400 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );

    // Convert to blob
    const response = await fetch(manipulatedImage.uri);
    const blob = await response.blob();

    // Upload to Firebase Storage
    const filename = `group_pictures/${conversationId}_${Date.now()}.jpg`;
    const storageRef = ref(storage, filename);
    
    await uploadBytes(storageRef, blob);

    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
  } catch (error: any) {
    console.error('Error uploading group picture:', error);
    throw new Error(error.message || 'Failed to upload group picture');
  }
};

/**
 * Delete profile picture from Firebase Storage
 */
export const deleteProfilePicture = async (imageUrl: string): Promise<void> => {
  try {
    // Extract path from URL
    const storageRef = ref(storage, imageUrl);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting profile picture:', error);
    // Don't throw error, as the image might already be deleted
  }
};

/**
 * Upload image message
 */
export const uploadImageMessage = async (
  conversationId: string,
  senderId: string,
  imageUri: string
): Promise<string> => {
  try {
    // Resize image
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 1024 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );

    // Convert to blob
    const response = await fetch(manipulatedImage.uri);
    const blob = await response.blob();

    // Upload to Firebase Storage
    const filename = `message_images/${conversationId}/${senderId}_${Date.now()}.jpg`;
    const storageRef = ref(storage, filename);
    
    await uploadBytes(storageRef, blob);

    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
  } catch (error: any) {
    console.error('Error uploading image message:', error);
    throw new Error(error.message || 'Failed to upload image');
  }
};

/**
 * Upload audio message
 */
export const uploadAudioMessage = async (
  conversationId: string,
  senderId: string,
  audioUri: string
): Promise<string> => {
  try {
    // Convert to blob
    const response = await fetch(audioUri);
    const blob = await response.blob();

    // Upload to Firebase Storage
    const filename = `message_audio/${conversationId}/${senderId}_${Date.now()}.m4a`;
    const storageRef = ref(storage, filename);
    
    await uploadBytes(storageRef, blob);

    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
  } catch (error: any) {
    console.error('Error uploading audio message:', error);
    throw new Error(error.message || 'Failed to upload audio');
  }
};


