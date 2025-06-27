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
  name: 'light' | 'dark' | 'catppuccin';
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
}

export interface FileSystemEvent {
  event_type: 'created' | 'modified' | 'deleted';
  file_path: string;
  timestamp: string;
}

export interface IPCChannels {
  // Usage data
  'usage:get-stats': () => Promise<UsageEntry[]>;
  'usage:get-by-date-range': (start: string, end: string) => Promise<DateRangeStats>;
  'usage:get-session-stats': (sessionId: string) => Promise<SessionStats>;
  
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
  
  // Currency
  'currency:get-rates': () => Promise<CurrencyRates>;
  'currency:convert': (amount: number, from: keyof CurrencyRates, to: keyof CurrencyRates) => Promise<number>;
}