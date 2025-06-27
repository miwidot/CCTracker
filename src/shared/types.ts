export interface UsageEntry {
  id: string;
  timestamp: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_usd: number;
  session_id?: string;
  project_path?: string;
  conversation_id?: string;
}

export interface SessionStats {
  session_id: string;
  start_time: string;
  end_time: string;
  total_cost: number;
  total_tokens: number;
  message_count: number;
  model: string;
}

export interface DateRangeStats {
  start_date: string;
  end_date: string;
  total_cost: number;
  total_tokens: number;
  entries: UsageEntry[];
  sessions: SessionStats[];
}

export interface ModelPricing {
  input_token_price: number;
  output_token_price: number;
  currency: 'USD';
}

export interface CurrencyRates {
  USD: number;
  EUR: number;
  GBP: number;
  JPY: number;
  CNY: number;
  MYR: number;
}

export interface ThemeConfig {
  name: 'light' | 'dark' | 'catppuccin-latte' | 'catppuccin-frappe' | 'catppuccin-macchiato' | 'catppuccin-mocha';
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
}

export interface AppSettings {
  theme: ThemeConfig['name'];
  language: string;
  currency: keyof CurrencyRates;
  monitoring_enabled: boolean;
  refresh_interval: number;
  data_retention_days: number;
  time_format: '12h' | '24h';
}

export interface FileSystemEvent {
  event_type: 'created' | 'modified' | 'deleted';
  file_path: string;
  timestamp: string;
}

// Business Intelligence Types
export interface ModelEfficiency {
  model: string;
  costPerToken: number;
  averageTokensPerMessage: number;
  totalCost: number;
  totalTokens: number;
  usageCount: number;
  efficiency_score: number; // Lower is better
}

export interface UsageTrend {
  period: string;
  cost: number;
  tokens: number;
  sessions: number;
  growth_rate: number; // Percentage change from previous period
}

export interface UsageAnomaly {
  timestamp: string;
  type: 'cost_spike' | 'unusual_model' | 'high_tokens' | 'session_duration';
  severity: 'low' | 'medium' | 'high';
  description: string;
  actual_value: number;
  expected_value: number;
  deviation_percentage: number;
}

export interface PredictiveAnalytics {
  predicted_monthly_cost: number;
  predicted_monthly_tokens: number;
  cost_trend: 'increasing' | 'decreasing' | 'stable';
  confidence_level: number; // 0-100%
  next_week_forecast: {
    cost: number;
    tokens: number;
  };
  budget_risk: {
    level: 'low' | 'medium' | 'high';
    projected_overage: number;
  };
}

export interface BusinessIntelligence {
  // Core metrics
  total_cost: number;
  total_tokens: number;
  total_sessions: number;
  
  // Advanced metrics
  cost_per_token: number;
  tokens_per_hour: number;
  cost_burn_rate: number; // Cost per hour
  session_efficiency: number; // Tokens per session
  model_diversity: number; // Number of different models used
  
  // Trends and patterns
  trends: {
    daily: UsageTrend[];
    weekly: UsageTrend[];
    monthly: UsageTrend[];
  };
  
  // Model analysis
  model_efficiency: ModelEfficiency[];
  most_expensive_model: string;
  most_efficient_model: string;
  
  // Time analysis
  peak_usage_hours: number[];
  busiest_day_of_week: string;
  usage_patterns: {
    morning: number; // 6-12
    afternoon: number; // 12-18
    evening: number; // 18-24
    night: number; // 0-6
  };
  
  // Predictive insights
  predictions: PredictiveAnalytics;
  
  // Quality metrics
  anomalies: UsageAnomaly[];
  data_quality_score: number; // 0-100%
  
  // Performance metadata
  calculation_time_ms: number;
  data_points_analyzed: number;
  last_updated: string;
}

export interface AdvancedUsageStats extends BusinessIntelligence {
  // Legacy compatibility
  totalEntries: number;
  totalCost: number;
  totalTokens: number;
  uniqueModels: string[];
  uniqueSessions: number;
  dateRange: { earliest: string | null; latest: string | null };
}

// Project Analytics Types (matching original Rust ProjectUsage)
export interface ProjectAnalytics {
  project_path: string;
  project_name: string;
  total_cost: number;
  total_tokens: number;
  session_count: number;
  last_used: string;
}

export interface ProjectSession {
  session_id: string;
  project_name: string;
  start_time: string;
  end_time: string;
  total_cost: number;
  total_tokens: number;
  message_count: number;
  models_used: string[];
  efficiency: number;
}

export interface ProjectComparison {
  projects: ProjectAnalytics[];
  total_projects: number;
  most_expensive_project: string;
  most_efficient_project: string;
  cost_distribution: {
    project_name: string;
    cost: number;
    percentage: number;
  }[];
  activity_timeline: {
    date: string;
    projects_active: number;
    total_cost: number;
  }[];
}

export interface IPCChannels {
  // Usage data
  'usage:get-stats': () => Promise<UsageEntry[]>;
  'usage:get-advanced-stats': () => Promise<AdvancedUsageStats>;
  'usage:get-business-intelligence': () => Promise<BusinessIntelligence>;
  'usage:get-by-date-range': (start: string, end: string) => Promise<DateRangeStats>;
  'usage:get-session-stats': (sessionId: string) => Promise<SessionStats>;
  'usage:detect-anomalies': () => Promise<UsageAnomaly[]>;
  'usage:get-predictions': () => Promise<PredictiveAnalytics>;
  'usage:get-model-efficiency': () => Promise<ModelEfficiency[]>;
  
  // Project analytics
  'usage:get-project-breakdown': () => Promise<ProjectAnalytics[]>;
  'usage:get-project-comparison': () => Promise<ProjectComparison>;
  'usage:get-project-sessions': (projectName: string) => Promise<ProjectSession[]>;
  
  // File monitoring
  'monitor:start': (path: string) => Promise<void>;
  'monitor:stop': () => Promise<void>;
  'monitor:status': () => Promise<boolean>;
  
  // Settings
  'settings:get': () => Promise<AppSettings>;
  'settings:update': (settings: Partial<AppSettings>) => Promise<void>;
  
  // Export
  'export:csv': (data: UsageEntry[]) => Promise<string>;
  'export:json': (data: UsageEntry[]) => Promise<string>;
  'export:business-report': (data: BusinessIntelligence) => Promise<string>;
  
  // Currency
  'currency:get-rates': () => Promise<CurrencyRates>;
  'currency:convert': (amount: number, from: keyof CurrencyRates, to: keyof CurrencyRates) => Promise<number>;
}