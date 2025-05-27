
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';

type ThemePreference = "light" | "dark" | "system";
type AppliedTheme = "light" | "dark";

interface ThemeContextType {
  themePreference: ThemePreference;
  appliedTheme: AppliedTheme;
  setThemePreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "passkeep-theme-preference";

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>("system");
  const [appliedTheme, setAppliedTheme] = useState<AppliedTheme>("light");

  // Initialize themePreference from localStorage or default to "system"
  useEffect(() => {
    const storedPreference = localStorage.getItem(THEME_STORAGE_KEY) as ThemePreference | null;
    if (storedPreference) {
      setThemePreferenceState(storedPreference);
    } else {
      setThemePreferenceState("system");
    }
  }, []);

  // Determine and set appliedTheme based on preference and system settings
  useEffect(() => {
    let currentTheme: AppliedTheme;
    if (themePreference === 'system') {
      currentTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      currentTheme = themePreference;
    }
    setAppliedTheme(currentTheme);
  }, [themePreference]);

  // Apply the 'dark' or 'light' class to the HTML element and save preference
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(appliedTheme);
    localStorage.setItem(THEME_STORAGE_KEY, themePreference);
  }, [appliedTheme, themePreference]);

  // Listen for system theme changes if preference is "system"
  useEffect(() => {
    if (themePreference !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setAppliedTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themePreference]);

  const setThemePreference = useCallback((preference: ThemePreference) => {
    setThemePreferenceState(preference);
  }, []);

  return (
    <ThemeContext.Provider value={{ themePreference, appliedTheme, setThemePreference }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
