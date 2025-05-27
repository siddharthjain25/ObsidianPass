
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { auth } from '@/lib/firebase'; // Import Firebase auth instance
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type User, setPersistence, browserLocalPersistence } from 'firebase/auth';

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

    const setupAuthListener = () => {
      unsubscribe = onAuthStateChanged(auth,
        (firebaseUser) => {
          setUser(firebaseUser);
          setIsLoading(false);
        },
        (error) => {
          console.error("Firebase Auth state listener error:", error);
          setUser(null);
          setIsLoading(false);
        }
      );
    };

    // Try to set persistence first.
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        // If persistence is set successfully, then set up the auth state listener.
        setupAuthListener();
      })
      .catch((error) => {
        console.error("Error setting Firebase auth persistence:", error);
        // If setting persistence fails, still attempt to set up the listener.
        // Auth state might not persist across sessions/tabs as expected.
        // Also ensure isLoading is set to false to avoid getting stuck.
        setupAuthListener(); // Or, you might decide to set user to null and isLoading to false immediately.
        // For now, we still try to listen, but acknowledge persistence might be an issue.
        // If persistence is critical and fails, you might want a different error handling strategy.
        // However, we must ensure isLoading is eventually false.
        // If setupAuthListener also fails, its own error handler should set isLoading to false.
        // If onAuthStateChanged never fires after a persistence error, isLoading might remain true.
        // So, if persistence fails, we might consider not even trying to listen or setting a default state.
        // For now, let's ensure isLoading is false if THIS catch block is hit and listener wasn't setup properly.
        if (!unsubscribe) { // Check if listener was setup by the .then() block
            setUser(null);
            setIsLoading(false);
        }
      });

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
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign out failed:", error);
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
