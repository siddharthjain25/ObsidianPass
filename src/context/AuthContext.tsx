
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { auth } from '@/lib/firebase'; // Import Firebase auth instance
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type User } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = onAuthStateChanged(auth, 
        (firebaseUser) => {
          setUser(firebaseUser);
          setIsLoading(false);
        },
        (error) => {
          // This error callback is for the observer itself.
          console.error("Firebase Auth state listener error:", error);
          setUser(null); // On listener error, assume not authenticated
          setIsLoading(false); // Ensure loading state is resolved
        }
      );
    } catch (e) {
      // Catch synchronous errors if onAuthStateChanged itself throws during setup (very rare)
      console.error("Error setting up Firebase Auth state listener:", e);
      setUser(null);
      setIsLoading(false);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe(); // Cleanup subscription on unmount
      }
    };
  }, []); 

  const loginWithGoogle = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle setting user and updating isLoading.
      return true;
    } catch (error) {
      console.error("Google Sign-In failed:", error);
      setIsLoading(false); // Ensure loading is false on explicit login error
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    // setIsLoading(true); // Usually not needed, onAuthStateChanged handles it.
    try {
      await signOut(auth);
      // onAuthStateChanged will handle setting user to null and isLoading to false.
    } catch (error) {
      console.error("Sign out failed:", error);
      // If signOut fails, onAuthStateChanged might not fire or user might not change.
      // Setting isLoading false here could be an option, but better to rely on onAuthStateChanged if possible.
      // For now, we assume onAuthStateChanged will eventually reflect the state or an error.
    }
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      isLoading, 
      loginWithGoogle, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
