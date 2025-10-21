/**
 * Firebase Authentication Error Messages
 * Provides user-friendly error messages for Firebase auth errors
 */

export const getAuthErrorMessage = (error: any): string => {
  const errorCode = error?.code || '';
  
  // Authentication errors
  switch (errorCode) {
    // Login errors
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password. Please check your credentials and try again.';
    
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later or reset your password.';
    
    // Registration errors
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please login or use a different email.';
    
    case 'auth/operation-not-allowed':
      return 'Email/password accounts are not enabled. Please contact support.';
    
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters with a mix of letters and numbers.';
    
    // Network errors
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection and try again.';
    
    // Generic errors
    default:
      // Try to provide the error message if it exists and is user-friendly
      if (error?.message && !error.message.includes('Firebase:')) {
        return error.message;
      }
      return 'An error occurred. Please try again.';
  }
};

/**
 * Firestore Error Messages
 */
export const getFirestoreErrorMessage = (error: any): string => {
  const errorCode = error?.code || '';
  
  switch (errorCode) {
    case 'permission-denied':
      return 'You don\'t have permission to perform this action.';
    
    case 'not-found':
      return 'The requested data was not found.';
    
    case 'already-exists':
      return 'This item already exists.';
    
    case 'resource-exhausted':
      return 'Too many requests. Please try again later.';
    
    case 'failed-precondition':
      return 'Unable to complete this action. Please check your connection.';
    
    case 'aborted':
      return 'The operation was aborted. Please try again.';
    
    case 'unavailable':
      return 'Service temporarily unavailable. Please try again.';
    
    case 'unauthenticated':
      return 'Please login to continue.';
    
    default:
      if (error?.message) {
        return error.message;
      }
      return 'An error occurred. Please try again.';
  }
};

/**
 * Storage Error Messages
 */
export const getStorageErrorMessage = (error: any): string => {
  const errorCode = error?.code || '';
  
  switch (errorCode) {
    case 'storage/unauthorized':
      return 'You don\'t have permission to upload files.';
    
    case 'storage/canceled':
      return 'Upload was cancelled.';
    
    case 'storage/unknown':
      return 'An unknown error occurred during upload.';
    
    case 'storage/object-not-found':
      return 'File not found.';
    
    case 'storage/bucket-not-found':
      return 'Storage not configured properly.';
    
    case 'storage/quota-exceeded':
      return 'Storage quota exceeded.';
    
    case 'storage/unauthenticated':
      return 'Please login to upload files.';
    
    case 'storage/retry-limit-exceeded':
      return 'Upload failed. Please try again.';
    
    default:
      if (error?.message) {
        return error.message;
      }
      return 'Upload failed. Please try again.';
  }
};

/**
 * Generic error message handler
 */
export const getErrorMessage = (error: any, context?: 'auth' | 'firestore' | 'storage'): string => {
  if (!error) return 'An error occurred.';
  
  // Auto-detect context from error code
  const errorCode = error?.code || '';
  
  if (errorCode.startsWith('auth/')) {
    return getAuthErrorMessage(error);
  }
  
  if (errorCode.startsWith('storage/')) {
    return getStorageErrorMessage(error);
  }
  
  // Firestore errors or use context
  if (context === 'firestore' || errorCode.includes('permission') || errorCode.includes('firestore')) {
    return getFirestoreErrorMessage(error);
  }
  
  if (context === 'auth') {
    return getAuthErrorMessage(error);
  }
  
  if (context === 'storage') {
    return getStorageErrorMessage(error);
  }
  
  // Default fallback
  return error?.message || 'An unexpected error occurred. Please try again.';
};

