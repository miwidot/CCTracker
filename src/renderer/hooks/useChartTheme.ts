import { useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface ChartColors {
  // Primary chart colors
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Data visualization palette (10 colors for variety)
  dataColors: string[];
  
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
    
    // Fallback colors if CSS variables aren't available
    const fallbackDataColors = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
      '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#6b7280'
    ];
    
    return {
      primary: getCSSVariable('--color-primary') || '#3b82f6',
      secondary: getCSSVariable('--color-secondary') || '#64748b',
      success: getCSSVariable('--color-success') || '#10b981',
      warning: getCSSVariable('--color-warning') || '#f59e0b',
      error: getCSSVariable('--color-error') || '#ef4444',
      info: getCSSVariable('--color-info') || '#06b6d4',
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

  const getContrastColor = (backgroundColor: string): string => {
    // Simple contrast calculation - in a real app you might want to use a proper color library
    const isDark = theme.name === 'dark' || (theme.name.includes('catppuccin') && theme.name !== 'catppuccin-latte');
    return isDark ? '#ffffff' : '#000000';
  };

  const adjustOpacity = (color: string, opacity: number): string => {
    // Convert hex to rgba if needed
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
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