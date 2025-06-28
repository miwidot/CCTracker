import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useSettings } from './SettingsContext';
import { getThemeConfig, COLOR_PALETTES } from '@shared/constants';
import type { CHART_PALETTES } from '@shared/constants';
import { getSemanticColor, isDarkTheme, getChartColors } from '@shared/design-tokens';
import type { ThemeConfig } from '@shared/types';

interface ThemeContextType {
  theme: ThemeConfig;
  setTheme: (theme: ThemeConfig['name']) => void;
  // Enhanced utilities
  getSemanticColor: (semantic: 'success' | 'warning' | 'error' | 'info') => string;
  getChartColors: () => readonly string[];
  isDark: boolean;
  // Additional theme data
  fullPalette: typeof COLOR_PALETTES[keyof typeof COLOR_PALETTES];
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
  
  // Safe theme validation with fallback
  const validateTheme = (themeValue: any): keyof typeof COLOR_PALETTES => {
    // Check if theme value is a valid key in COLOR_PALETTES
    if (typeof themeValue === 'string' && themeValue in COLOR_PALETTES) {
      return themeValue as keyof typeof COLOR_PALETTES;
    }
    
    console.warn(`Invalid theme value: ${themeValue}, falling back to 'light'`);
    return 'light'; // Safe fallback
  };
  
  const validatedTheme = validateTheme(settings.theme);
  const theme = getThemeConfig(validatedTheme);

  const setTheme = (themeName: ThemeConfig['name']) => {
    // Fire and forget - don't block UI
    updateSettings({ theme: themeName }).catch(console.error);
  };

  // Enhanced theme utilities with safe type assertions
  const themeUtilities = useMemo(() => {
    const safeTheme = validateTheme(settings.theme);
    
    return {
      getSemanticColor: (semantic: 'success' | 'warning' | 'error' | 'info') => 
        getSemanticColor(safeTheme, semantic),
      
      getChartColors: () => 
        getChartColors(safeTheme as keyof typeof CHART_PALETTES),
      
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
      ...themeUtilities
    }}>
      {children}
    </ThemeContext.Provider>
  );
};