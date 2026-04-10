import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme, type AppTheme } from '../theme';

const ThemeContext = createContext<AppTheme>(lightTheme);
const ThemeToggleContext = createContext<() => void>(() => {});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('theme_dark').then(val => {
      if (val === 'true') setIsDark(true);
    });
  }, []);

  const toggleTheme = async () => {
    const next = !isDark;
    setIsDark(next);
    await AsyncStorage.setItem('theme_dark', String(next));
  };

  return (
    <ThemeToggleContext.Provider value={toggleTheme}>
      <ThemeContext.Provider value={isDark ? darkTheme : lightTheme}>
        {children}
      </ThemeContext.Provider>
    </ThemeToggleContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
export const useThemeToggle = () => useContext(ThemeToggleContext);
