export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
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
};

export const DEFAULT_CURRENCY_RATES = {
  USD: 1.0,
  EUR: 0.85,
  GBP: 0.73,
  JPY: 110.0,
  CNY: 6.45,
  MYR: 4.18,
};

export const THEMES = {
  light: {
    name: 'light' as const,
    primary: '#3b82f6',
    secondary: '#64748b',
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#1e293b',
    textSecondary: '#64748b',
  },
  dark: {
    name: 'dark' as const,
    primary: '#60a5fa',
    secondary: '#94a3b8',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
  },
  catppuccin: {
    name: 'catppuccin' as const,
    primary: '#89b4fa',
    secondary: '#a6adc8',
    background: '#1e1e2e',
    surface: '#313244',
    text: '#cdd6f4',
    textSecondary: '#bac2de',
  },
};

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
};