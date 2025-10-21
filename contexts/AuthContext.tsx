import { User as FirebaseUser } from 'firebase/auth';
import React, { createContext, ReactNode, useContext, useEffect, useReducer } from 'react';
import { AppState } from 'react-native';
import {
    loginUser as firebaseLogin,
    logoutUser as firebaseLogout,
    registerUser as firebaseRegister,
    updateUserProfile as firebaseUpdateProfile,
    getCurrentUser,
    onAuthStateChange,
} from '../services/firebase/auth';
import { setUserOffline, setUserOnline } from '../services/firebase/realtimeDb';
import { AuthState, User } from '../types';

// Action types
type AuthAction =
  | { type: 'AUTH_LOADING' }
  | { type: 'AUTH_SUCCESS'; payload: User }
  | { type: 'AUTH_ERROR'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'UPDATE_USER'; payload: Partial<User> };

// Initial state
const initialState: AuthState = {
  user: null,
  loading: true,
  error: null,
  isAuthenticated: false,
};

// Reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_LOADING':
      return { ...state, loading: true, error: null };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload,
        loading: false,
        error: null,
        isAuthenticated: true,
      };
    case 'AUTH_ERROR':
      return {
        ...state,
        loading: false,
        error: action.payload,
        isAuthenticated: false,
      };
    case 'AUTH_LOGOUT':
      return {
        ...initialState,
        loading: false,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
      };
    default:
      return state;
  }
};

// Context type
interface AuthContextType extends AuthState {
  register: (email: string, password: string, displayName: string, username: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider props
interface AuthProviderProps {
  children: ReactNode;
}

// Provider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Handle app state changes for presence
  useEffect(() => {
    if (!state.user) return;

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        setUserOnline(state.user!.id);
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        setUserOffline(state.user!.id);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [state.user]);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          const user = await getCurrentUser(firebaseUser);
          if (user) {
            dispatch({ type: 'AUTH_SUCCESS', payload: user });
            // Set user online
            await setUserOnline(user.id);
          } else {
            dispatch({ type: 'AUTH_LOGOUT' });
          }
        } catch (error) {
          console.error('Error getting current user:', error);
          dispatch({ type: 'AUTH_LOGOUT' });
        }
      } else {
        dispatch({ type: 'AUTH_LOGOUT' });
      }
    });

    return () => unsubscribe();
  }, []);

  // Register function
  const register = async (
    email: string,
    password: string,
    displayName: string,
    username: string
  ) => {
    try {
      dispatch({ type: 'AUTH_LOADING' });
      const user = await firebaseRegister(email, password, displayName, username);
      dispatch({ type: 'AUTH_SUCCESS', payload: user });
      await setUserOnline(user.id);
    } catch (error: any) {
      dispatch({ type: 'AUTH_ERROR', payload: error.message });
      throw error;
    }
  };

  // Login function
  const login = async (email: string, password: string) => {
    try {
      dispatch({ type: 'AUTH_LOADING' });
      const user = await firebaseLogin(email, password);
      dispatch({ type: 'AUTH_SUCCESS', payload: user });
      await setUserOnline(user.id);
    } catch (error: any) {
      dispatch({ type: 'AUTH_ERROR', payload: error.message });
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      if (state.user) {
        await setUserOffline(state.user.id);
      }
      await firebaseLogout();
      dispatch({ type: 'AUTH_LOGOUT' });
    } catch (error: any) {
      dispatch({ type: 'AUTH_ERROR', payload: error.message });
      throw error;
    }
  };

  // Update profile function
  const updateProfile = async (updates: Partial<User>) => {
    try {
      if (!state.user) throw new Error('No user logged in');
      
      await firebaseUpdateProfile(state.user.id, updates);
      dispatch({ type: 'UPDATE_USER', payload: updates });
    } catch (error: any) {
      dispatch({ type: 'AUTH_ERROR', payload: error.message });
      throw error;
    }
  };

  const value: AuthContextType = {
    ...state,
    register,
    login,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


