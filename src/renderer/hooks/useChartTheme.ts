import { useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { getChartColors } from '@shared/design-tokens';

interface ChartColors {
  // Primary chart colors
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Data visualization palette (10 colors for variety)
  dataColors: readonly string[];
  
  // Chart infrastructure colors
  grid: string;
  axis: string;
  text: string;
  textSecondary: string;
  tooltipBackground: string;
  tooltipBorder: string;
}

interface ChartThemeUtils {
  getDataColor: (index: number) => string;
  getContrastColor: (backgroundColor: string) => string;
  adjustOpacity: (color: string, opacity: number) => string;
}

interface ChartTheme extends ChartColors, ChartThemeUtils {}

// Helper function to get CSS variable value
const getCSSVariable = (name: string): string => {
  if (typeof window !== 'undefined') {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  return '';
};

export const useChartTheme = (): ChartTheme => {
  const { theme } = useTheme();
  
  const chartColors = useMemo(() => {
    // Get chart colors from CSS variables
    const dataColors: string[] = [];
    for (let i = 1; i <= 10; i++) {
      const color = getCSSVariable(`--chart-color-${i}`);
      if (color) {
        dataColors.push(color);
      }
    }
    
    // Fallback colors from design tokens if CSS variables aren't available
    const fallbackDataColors = getChartColors(theme.name as 'light' | 'dark' | 'catppuccin-latte' | 'catppuccin-frappe' | 'catppuccin-macchiato' | 'catppuccin-mocha');
    
    return {
      primary: getCSSVariable('--color-primary') || fallbackDataColors[0],
      secondary: getCSSVariable('--color-secondary') || fallbackDataColors[1],
      success: getCSSVariable('--color-success') || fallbackDataColors[1],
      warning: getCSSVariable('--color-warning') || fallbackDataColors[2],
      error: getCSSVariable('--color-error') || fallbackDataColors[3],
      info: getCSSVariable('--color-info') || fallbackDataColors[5],
      dataColors: dataColors.length === 10 ? dataColors : fallbackDataColors,
      grid: getCSSVariable('--border-color') || '#e2e8f0',
      axis: getCSSVariable('--text-secondary') || '#64748b',
      text: getCSSVariable('--text-primary') || '#1e293b',
      textSecondary: getCSSVariable('--text-secondary') || '#64748b',
      tooltipBackground: getCSSVariable('--bg-primary') || '#ffffff',
      tooltipBorder: getCSSVariable('--border-color') || '#e2e8f0',
    };
  }, [theme.name]);

  const getDataColor = (index: number): string => {
    return chartColors.dataColors[index % chartColors.dataColors.length];
  };

  const getContrastColor = (_backgroundColor: string): string => {
    // Simple contrast calculation - in a real app you might want to use a proper color library
    const isDark = theme.name === 'dark' || (theme.name.includes('catppuccin') && theme.name !== 'catppuccin-latte');
    return isDark ? '#ffffff' : '#000000';
  };

  const adjustOpacity = (color: string, opacity: number): string => {
    // Convert hex to rgba if needed
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    
    // If already rgba, adjust opacity
    if (color.startsWith('rgba')) {
      return color.replace(/,\s*[\d.]+\)$/, `, ${opacity})`);
    }
    
    // If rgb, convert to rgba
    if (color.startsWith('rgb')) {
      return color.replace('rgb', 'rgba').replace(')', `, ${opacity})`);
    }
    
    return color;
  };

  return {
    ...chartColors,
    getDataColor,
    getContrastColor,
    adjustOpacity,
  };
};

// CSS variables helper for direct CSS variable access in Recharts
export const getChartCSSVariables = () => {
  return {
    primary: 'var(--color-primary)',
    secondary: 'var(--color-secondary)',
    success: 'var(--color-success)',
    warning: 'var(--color-warning)',
    error: 'var(--color-error)',
    info: 'var(--color-info)',
    grid: 'var(--border-color)',
    axis: 'var(--text-secondary)',
    text: 'var(--text-primary)',
    textSecondary: 'var(--text-secondary)',
    tooltipBackground: 'var(--bg-primary)',
    tooltipBorder: 'var(--border-color)',
    // Data colors using CSS variables
    dataColor1: 'var(--chart-color-1)',
    dataColor2: 'var(--chart-color-2)',
    dataColor3: 'var(--chart-color-3)',
    dataColor4: 'var(--chart-color-4)',
    dataColor5: 'var(--chart-color-5)',
    dataColor6: 'var(--chart-color-6)',
    dataColor7: 'var(--chart-color-7)',
    dataColor8: 'var(--chart-color-8)',
    dataColor9: 'var(--chart-color-9)',
    dataColor10: 'var(--chart-color-10)',
  };
};

// Pre-defined chart color sets for common use cases
export const CHART_COLOR_SETS = {
  status: {
    success: 'var(--color-success)',
    warning: 'var(--color-warning)', 
    error: 'var(--color-error)',
    info: 'var(--color-info)',
  },
  traffic: {
    high: 'var(--color-error)',
    medium: 'var(--color-warning)',
    low: 'var(--color-success)',
  },
  performance: {
    excellent: 'var(--color-success)',
    good: 'var(--chart-color-8)', // Lime
    average: 'var(--color-warning)',
    poor: 'var(--chart-color-7)', // Orange
    critical: 'var(--color-error)',
  },
} as const;

// Utility to get a specific chart color by index
export const getChartColorByIndex = (index: number): string => {
  return `var(--chart-color-${(index % 10) + 1})`;
};