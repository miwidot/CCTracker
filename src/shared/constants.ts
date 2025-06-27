export const MODEL_PRICING: Record<string, { input: number; output: number; cache_write?: number; cache_read?: number }> = {
  // Claude 3.5 Models
  'claude-3-5-sonnet-20241022': {
    input: 3.00 / 1_000_000,
    output: 15.00 / 1_000_000,
  },
  'claude-3-5-sonnet-20240620': {
    input: 3.00 / 1_000_000,
    output: 15.00 / 1_000_000,
  },
  'claude-3-5-haiku-20241022': {
    input: 1.00 / 1_000_000,
    output: 5.00 / 1_000_000,
  },
  
  // Claude 3 Models
  'claude-3-opus-20240229': {
    input: 15.00 / 1_000_000,
    output: 75.00 / 1_000_000,
  },
  'claude-3-sonnet-20240229': {
    input: 3.00 / 1_000_000,
    output: 15.00 / 1_000_000,
  },
  'claude-3-haiku-20240307': {
    input: 0.25 / 1_000_000,
    output: 1.25 / 1_000_000,
  },
  
  // Claude 4 Models (with cache pricing)
  'claude-sonnet-4-20250514': {
    input: 3.0 / 1_000_000,
    output: 15.0 / 1_000_000,
    cache_write: 3.75 / 1_000_000,
    cache_read: 0.30 / 1_000_000,
  },
  'claude-opus-4-20250514': {
    input: 15.0 / 1_000_000,
    output: 75.0 / 1_000_000,
    cache_write: 18.75 / 1_000_000,
    cache_read: 1.50 / 1_000_000,
  },
  // Also support the model names as they appear in JSONL
  'claude-opus-4': {
    input: 15.0 / 1_000_000,
    output: 75.0 / 1_000_000,
    cache_write: 18.75 / 1_000_000,
    cache_read: 1.50 / 1_000_000,
  },
  'claude-sonnet-4': {
    input: 3.0 / 1_000_000,
    output: 15.0 / 1_000_000,
    cache_write: 3.75 / 1_000_000,
    cache_read: 0.30 / 1_000_000,
  },
};

export const DEFAULT_CURRENCY_RATES = {
  USD: 1.0,
  EUR: 0.85,
  GBP: 0.73,
  JPY: 110.0,
  CNY: 6.45,
  MYR: 4.18,
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CNY: '¥',
  MYR: 'RM',
};

// Export design token utilities for component use
export { COLOR_PALETTES, CHART_PALETTES, generateCSSVariables } from './design-tokens';
import { COLOR_PALETTES } from './design-tokens';

// Helper function to get theme configuration for backward compatibility
export function getThemeConfig(themeName: keyof typeof COLOR_PALETTES) {
  const palette = COLOR_PALETTES[themeName];
  return {
    name: themeName,
    primary: palette.primary,
    secondary: palette.secondary,
    background: palette.background,
    surface: palette.surface,
    text: palette.text,
    textSecondary: palette.textSecondary,
  };
}

// Available theme names for settings
export const THEME_NAMES = Object.keys(COLOR_PALETTES) as (keyof typeof COLOR_PALETTES)[];

export const SUPPORTED_LANGUAGES = {
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  ja: '日本語',
  zh: '中文',
};

export const DEFAULT_SETTINGS = {
  theme: 'dark' as const,
  language: 'en',
  currency: 'USD' as const,
  monitoring_enabled: true,
  refresh_interval: 1000,
  data_retention_days: 90,
  time_format: '12h' as const,
};