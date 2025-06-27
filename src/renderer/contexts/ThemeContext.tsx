import React, { createContext, useContext, useEffect } from 'react';
import { useSettings } from './SettingsContext';
import { THEMES } from '@shared/constants';
import type { ThemeConfig } from '@shared/types';

interface ThemeContextType {
  theme: ThemeConfig;
  setTheme: (theme: ThemeConfig['name']) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { settings, updateSettings } = useSettings();
  const theme = THEMES[settings.theme];

  const setTheme = async (themeName: ThemeConfig['name']) => {
    await updateSettings({ theme: themeName });
  };

  useEffect(() => {
    // Apply theme class to document root
    document.documentElement.className = `theme-${theme.name} theme-transition`;
    
    // Apply CSS custom properties
    const root = document.documentElement;
    root.style.setProperty('--theme-primary', theme.primary);
    root.style.setProperty('--theme-secondary', theme.secondary);
    root.style.setProperty('--theme-background', theme.background);
    root.style.setProperty('--theme-surface', theme.surface);
    root.style.setProperty('--theme-text', theme.text);
    root.style.setProperty('--theme-text-secondary', theme.textSecondary);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};