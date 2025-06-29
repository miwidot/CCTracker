import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useSettings } from './SettingsContext';
import { getThemeConfig, COLOR_PALETTES } from '@shared/constants';
import { getSemanticColor, isDarkTheme, getChartColors } from '@shared/design-tokens';
import type { ThemeConfig } from '@shared/types';
import { log } from '@shared/utils/logger';

interface ThemeContextType {
  theme: ThemeConfig;
  setTheme: (theme: ThemeConfig['name']) => void;
  // Enhanced utilities
  getSemanticColor: (semantic: 'success' | 'warning' | 'error' | 'info') => string;
  getChartColors: () => readonly string[];
  isDark: boolean;
  // Additional theme data
  fullPalette: typeof COLOR_PALETTES[keyof typeof COLOR_PALETTES];
  // System theme detection
  systemTheme: 'light' | 'dark' | null;
  followsSystemTheme: boolean;
  setFollowSystemTheme: (follow: boolean) => void;
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
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark' | null>(null);
  const [followsSystemTheme, setFollowsSystemTheme] = useState(false);
  
  // Detect system theme preference
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const updateSystemTheme = (e: MediaQueryListEvent | MediaQueryList) => {
        setSystemTheme(e.matches ? 'dark' : 'light');
      };
      
      // Set initial value
      updateSystemTheme(mediaQuery);
      
      // Listen for changes
      mediaQuery.addEventListener('change', updateSystemTheme);
      
      return () => {
        mediaQuery.removeEventListener('change', updateSystemTheme);
      };
    }
  }, []);
  
  // Check if current theme setting indicates following system theme
  useEffect(() => {
    const themeValue = String(settings.theme);
    const isFollowingSystem = themeValue === 'system';
    setFollowsSystemTheme(isFollowingSystem);
  }, [settings.theme]);

  // Safe theme validation with fallback and system theme support
  const validateTheme = (themeValue: unknown): keyof typeof COLOR_PALETTES => {
    // Handle system theme following
    if (followsSystemTheme && systemTheme) {
      return systemTheme;
    }
    
    // Handle 'system' theme setting
    const themeStr = String(themeValue);
    if (themeStr === 'system') {
      return systemTheme || 'light';
    }
    
    // Check if theme value is a valid key in COLOR_PALETTES
    if (typeof themeValue === 'string' && themeValue in COLOR_PALETTES) {
      return themeValue as keyof typeof COLOR_PALETTES;
    }
    
    log.warn(`Invalid theme value: ${themeValue}, falling back to system or light`, 'ThemeContext');
    return systemTheme || 'light'; // Safe fallback to system or light
  };
  
  const validatedTheme = validateTheme(settings.theme);
  const theme = getThemeConfig(validatedTheme);

  const setTheme = (themeName: ThemeConfig['name']) => {
    // Fire and forget - don't block UI
    updateSettings({ theme: themeName }).catch((error) => {
      log.error('Failed to update theme setting', error as Error, 'ThemeContext');
    });
  };
  
  const setFollowSystemTheme = (follow: boolean) => {
    if (follow) {
      // Set theme to 'system' to indicate following system preference
      updateSettings({ theme: 'system' }).catch((error) => {
        log.error('Failed to set system theme following', error as Error, 'ThemeContext');
      });
    } else {
      // Set to current actual theme
      const currentTheme = systemTheme || 'light';
      updateSettings({ theme: currentTheme }).catch((error) => {
        log.error('Failed to disable system theme following', error as Error, 'ThemeContext');
      });
    }
  };

  // Enhanced theme utilities with safe type assertions
  const themeUtilities = useMemo(() => {
    const safeTheme = validateTheme(settings.theme);
    
    return {
      getSemanticColor: (semantic: 'success' | 'warning' | 'error' | 'info') => 
        getSemanticColor(safeTheme, semantic),
      
      getChartColors: () => 
        getChartColors(safeTheme),
      
      isDark: isDarkTheme(safeTheme),
      
      fullPalette: COLOR_PALETTES[safeTheme],
    };
  }, [settings.theme]);

  useEffect(() => {
    // Apply theme class to document root
    document.documentElement.className = `theme-${String(theme.name)} theme-transition`;
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      setTheme,
      systemTheme,
      followsSystemTheme,
      setFollowSystemTheme,
      ...themeUtilities
    }}>
      {children}
    </ThemeContext.Provider>
  );
};