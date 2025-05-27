
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
// Removed useRouter import as it's no longer used for direct navigation here
import { auth } from '@/lib/firebase'; // Import Firebase auth instance
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type User } from 'firebase/auth';
import { useRouter } from 'next/navigation'; // Still needed for router.pathname checks if those were to be kept, but we're removing them. Let's remove it if not used. Actually, it *was* used for pathname checks, now it is not.

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
  // const router = useRouter(); // No longer needed for push/replace here

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsLoading(false);
      // Redirection logic is removed from here.
      // Pages/layouts will handle redirection based on auth state.
    });

    return () => unsubscribe(); // Cleanup subscription on unmount
  }, []); // Dependencies array is now empty

  const loginWithGoogle = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle setting user.
      // isLoading will be set to false by onAuthStateChanged.
      return true;
    } catch (error) {
      console.error("Google Sign-In failed:", error);
      setIsLoading(false); // Ensure loading is false on error
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    // setIsLoading(true); // Setting isLoading true here can cause a brief flash if onAuthStateChanged is quick.
                         // onAuthStateChanged will set isLoading to false after user becomes null.
                         // If immediate feedback is needed, keep it, but typically not necessary.
    try {
      await signOut(auth);
      // onAuthStateChanged will handle setting user to null and isLoading to false.
    } catch (error) {
      console.error("Sign out failed:", error);
      // If signOut fails, isLoading might remain true if we set it above and don't reset here.
      // It's safer to let onAuthStateChanged handle isLoading uniformly.
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

