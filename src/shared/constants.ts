export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
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
  
  // Claude 4 Models (Sonnet 4)
  'claude-sonnet-4-20250514': {
    input: 3.00 / 1_000_000,  // Assuming same pricing as 3.5 Sonnet
    output: 15.00 / 1_000_000,
  },
  'claude-opus-4-20250514': {
    input: 15.00 / 1_000_000,  // Assuming same pricing as 3 Opus
    output: 75.00 / 1_000_000,
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
  'catppuccin-latte': {
    name: 'catppuccin-latte' as const,
    primary: '#8839ef',
    secondary: '#1e66f5',
    background: '#eff1f5',
    surface: '#ccd0da',
    text: '#4c4f69',
    textSecondary: '#6c6f85',
  },
  'catppuccin-frappe': {
    name: 'catppuccin-frappe' as const,
    primary: '#ca9ee6',
    secondary: '#8caaee',
    background: '#303446',
    surface: '#414559',
    text: '#c6d0f5',
    textSecondary: '#a5adce',
  },
  'catppuccin-macchiato': {
    name: 'catppuccin-macchiato' as const,
    primary: '#c6a0f6',
    secondary: '#8aadf4',
    background: '#24273a',
    surface: '#363a4f',
    text: '#cad3f5',
    textSecondary: '#a5adcb',
  },
  'catppuccin-mocha': {
    name: 'catppuccin-mocha' as const,
    primary: '#cba6f7',
    secondary: '#89b4fa',
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
  time_format: '12h' as const,
};