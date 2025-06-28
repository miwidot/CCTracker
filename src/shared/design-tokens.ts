/**
 * Comprehensive Design Token System
 * Centralized theming with semantic colors, spacing, typography, and component tokens
 */

// Removed unused import

// Base color palettes for each theme
export const COLOR_PALETTES = {
  light: {
    primary: '#3b82f6',
    secondary: '#64748b',
    background: '#ffffff',
    surface: '#f8fafc',
    surfaceHover: '#f1f5f9',
    text: '#1e293b',
    textSecondary: '#64748b',
    textMuted: '#94a3b8',
    border: '#e2e8f0',
    borderHover: '#cbd5e1',
    // Semantic colors
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#06b6d4',
    // Interactive states
    focusRing: 'rgba(59, 130, 246, 0.2)',
    hover: 'rgba(59, 130, 246, 0.05)',
    active: 'rgba(59, 130, 246, 0.1)',
  },
  dark: {
    primary: '#60a5fa',
    secondary: '#94a3b8',
    background: '#0f172a',
    surface: '#1e293b',
    surfaceHover: '#334155',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    border: '#334155',
    borderHover: '#475569',
    // Semantic colors
    success: '#34d399',
    warning: '#fbbf24',
    error: '#f87171',
    info: '#22d3ee',
    // Interactive states
    focusRing: 'rgba(96, 165, 250, 0.3)',
    hover: 'rgba(96, 165, 250, 0.1)',
    active: 'rgba(96, 165, 250, 0.15)',
  },
  'catppuccin-latte': {
    primary: '#8839ef',
    secondary: '#1e66f5',
    background: '#eff1f5',
    surface: '#ccd0da',
    surfaceHover: '#bcc0cc',
    text: '#4c4f69',
    textSecondary: '#6c6f85',
    textMuted: '#9ca0b0',
    border: '#acb0be',
    borderHover: '#9ca0b0',
    // Semantic colors
    success: '#40a02b',
    warning: '#df8e1d',
    error: '#d20f39',
    info: '#209fb5',
    // Interactive states
    focusRing: 'rgba(136, 57, 239, 0.2)',
    hover: 'rgba(136, 57, 239, 0.05)',
    active: 'rgba(136, 57, 239, 0.1)',
  },
  'catppuccin-frappe': {
    primary: '#ca9ee6',
    secondary: '#8caaee',
    background: '#303446',
    surface: '#414559',
    surfaceHover: '#51576d',
    text: '#c6d0f5',
    textSecondary: '#a5adce',
    textMuted: '#838ba7',
    border: '#626880',
    borderHover: '#737994',
    // Semantic colors
    success: '#a6d189',
    warning: '#e5c890',
    error: '#e78284',
    info: '#81c8be',
    // Interactive states
    focusRing: 'rgba(202, 158, 230, 0.3)',
    hover: 'rgba(202, 158, 230, 0.1)',
    active: 'rgba(202, 158, 230, 0.15)',
  },
  'catppuccin-macchiato': {
    primary: '#c6a0f6',
    secondary: '#8aadf4',
    background: '#24273a',
    surface: '#363a4f',
    surfaceHover: '#494d64',
    text: '#cad3f5',
    textSecondary: '#a5adcb',
    textMuted: '#8087a2',
    border: '#5b6078',
    borderHover: '#6e738d',
    // Semantic colors
    success: '#a6da95',
    warning: '#eed49f',
    error: '#ed8796',
    info: '#8bd5ca',
    // Interactive states
    focusRing: 'rgba(198, 160, 246, 0.3)',
    hover: 'rgba(198, 160, 246, 0.1)',
    active: 'rgba(198, 160, 246, 0.15)',
  },
  'catppuccin-mocha': {
    primary: '#cba6f7',
    secondary: '#89b4fa',
    background: '#1e1e2e',
    surface: '#313244',
    surfaceHover: '#45475a',
    text: '#cdd6f4',
    textSecondary: '#bac2de',
    textMuted: '#7f849c',
    border: '#585b70',
    borderHover: '#6c7086',
    // Semantic colors
    success: '#a6e3a1',
    warning: '#f9e2af',
    error: '#f38ba8',
    info: '#94e2d5',
    // Interactive states
    focusRing: 'rgba(203, 166, 247, 0.3)',
    hover: 'rgba(203, 166, 247, 0.1)',
    active: 'rgba(203, 166, 247, 0.15)',
  },
} as const;

// Chart color palettes for each theme
export const CHART_PALETTES = {
  light: [
    '#3b82f6', // primary
    '#10b981', // success
    '#f59e0b', // warning
    '#ef4444', // error
    '#8b5cf6', // purple
    '#06b6d4', // info
    '#f97316', // orange
    '#84cc16', // lime
    '#ec4899', // pink
    '#6b7280', // gray
  ],
  dark: [
    '#60a5fa', // primary
    '#34d399', // success
    '#fbbf24', // warning
    '#f87171', // error
    '#a78bfa', // purple
    '#22d3ee', // info
    '#fb923c', // orange
    '#a3e635', // lime
    '#f472b6', // pink
    '#9ca3af', // gray
  ],
  'catppuccin-latte': [
    '#8839ef', '#40a02b', '#df8e1d', '#d20f39', '#8839ef',
    '#209fb5', '#fe640b', '#179299', '#ea76cb', '#7c7f93',
  ],
  'catppuccin-frappe': [
    '#ca9ee6', '#a6d189', '#e5c890', '#e78284', '#ca9ee6',
    '#81c8be', '#ef9f76', '#85c1dc', '#f4b8e4', '#838ba7',
  ],
  'catppuccin-macchiato': [
    '#c6a0f6', '#a6da95', '#eed49f', '#ed8796', '#c6a0f6',
    '#8bd5ca', '#f5a97f', '#7dc4e4', '#f5bde6', '#8087a2',
  ],
  'catppuccin-mocha': [
    '#cba6f7', '#a6e3a1', '#f9e2af', '#f38ba8', '#cba6f7',
    '#94e2d5', '#fab387', '#89dceb', '#f5c2e7', '#7f849c',
  ],
} as const;

// Typography tokens
export const TYPOGRAPHY = {
  fontFamily: {
    sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
    mono: ['JetBrains Mono', 'Consolas', 'Monaco', 'monospace'],
  },
  fontSize: {
    xs: ['0.75rem', '1rem'],
    sm: ['0.875rem', '1.25rem'],
    base: ['1rem', '1.5rem'],
    lg: ['1.125rem', '1.75rem'],
    xl: ['1.25rem', '1.75rem'],
    '2xl': ['1.5rem', '2rem'],
    '3xl': ['1.875rem', '2.25rem'],
    '4xl': ['2.25rem', '2.5rem'],
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

// Spacing tokens
export const SPACING = {
  spacing: {
    0: '0px',
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    8: '2rem',
    10: '2.5rem',
    12: '3rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
  },
  borderRadius: {
    none: '0px',
    sm: '0.125rem',
    base: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    full: '9999px',
  },
} as const;

// Component-specific tokens
export const COMPONENTS = {
  button: {
    height: {
      sm: '2rem',
      md: '2.5rem',
      lg: '3rem',
    },
    padding: {
      sm: '0.5rem 1rem',
      md: '0.75rem 1.5rem',
      lg: '1rem 2rem',
    },
    borderRadius: '0.375rem',
  },
  card: {
    borderRadius: '0.5rem',
    padding: '1.5rem',
    shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    shadowHover: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  },
  input: {
    height: '2.5rem',
    padding: '0.5rem 0.75rem',
    borderRadius: '0.375rem',
    borderWidth: '1px',
  },
  modal: {
    backdropBlur: 'blur(4px)',
    borderRadius: '0.75rem',
    shadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
} as const;

// Animation tokens
export const ANIMATIONS = {
  duration: {
    fast: '150ms',
    normal: '250ms',
    slow: '350ms',
  },
  easing: {
    ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

// Utility function to get chart colors for a theme
export function getChartColors(themeName: keyof typeof CHART_PALETTES): readonly string[] {
  return CHART_PALETTES[themeName];
}

// Utility function to get semantic color
export function getSemanticColor(
  themeName: keyof typeof COLOR_PALETTES,
  semantic: 'success' | 'warning' | 'error' | 'info'
): string {
  return COLOR_PALETTES[themeName][semantic];
}

// Utility function to check if theme is dark
export function isDarkTheme(themeName: string): boolean {
  return ['dark', 'catppuccin-frappe', 'catppuccin-macchiato', 'catppuccin-mocha'].includes(themeName);
}

// Generate CSS variables for a theme
export function generateCSSVariables(themeName: keyof typeof COLOR_PALETTES): Record<string, string> {
  const palette = COLOR_PALETTES[themeName];
  const chartColors = CHART_PALETTES[themeName];
  
  return {
    // Base colors
    '--color-primary': palette.primary,
    '--color-secondary': palette.secondary,
    '--bg-primary': palette.background,
    '--bg-secondary': palette.surface,
    '--bg-tertiary': palette.surfaceHover,
    '--text-primary': palette.text,
    '--text-secondary': palette.textSecondary,
    '--text-muted': palette.textMuted,
    '--border-color': palette.border,
    '--border-hover': palette.borderHover,
    
    // Semantic colors
    '--color-success': palette.success,
    '--color-warning': palette.warning,
    '--color-error': palette.error,
    '--color-info': palette.info,
    
    // Interactive states
    '--color-focus-ring': palette.focusRing,
    '--color-hover': palette.hover,
    '--color-active': palette.active,
    
    // Chart colors
    '--chart-color-1': chartColors[0],
    '--chart-color-2': chartColors[1],
    '--chart-color-3': chartColors[2],
    '--chart-color-4': chartColors[3],
    '--chart-color-5': chartColors[4],
    '--chart-color-6': chartColors[5],
    '--chart-color-7': chartColors[6],
    '--chart-color-8': chartColors[7],
    '--chart-color-9': chartColors[8],
    '--chart-color-10': chartColors[9],
    
    // Component tokens
    '--button-border-radius': COMPONENTS.button.borderRadius,
    '--card-border-radius': COMPONENTS.card.borderRadius,
    '--card-padding': COMPONENTS.card.padding,
    '--input-height': COMPONENTS.input.height,
    '--input-border-radius': COMPONENTS.input.borderRadius,
    
    // Animation
    '--transition-duration': ANIMATIONS.duration.normal,
    '--transition-easing': ANIMATIONS.easing.ease,
  };
}

export type DesignTokens = typeof COLOR_PALETTES;
export type ThemeName = keyof typeof COLOR_PALETTES;