import { contextBridge, ipcRenderer } from 'electron';
import type { 
  UsageEntry, 
  AppSettings, 
  CurrencyRates,
  FileSystemEvent,
  BusinessIntelligence
} from '@shared/types';

const api = {
  // Usage data methods
  getUsageStats: () => ipcRenderer.invoke('usage:get-stats'),
  getAdvancedUsageStats: () => ipcRenderer.invoke('usage:get-advanced-stats'),
  getBusinessIntelligence: () => ipcRenderer.invoke('usage:get-business-intelligence'),
  getUsageByDateRange: (start: string, end: string) => 
    ipcRenderer.invoke('usage:get-by-date-range', start, end),
  getSessionStats: (sessionId: string) => 
    ipcRenderer.invoke('usage:get-session-stats', sessionId),
  
  // Advanced analytics methods
  detectAnomalies: () => ipcRenderer.invoke('usage:detect-anomalies'),
  getPredictions: () => ipcRenderer.invoke('usage:get-predictions'),
  getModelEfficiency: () => ipcRenderer.invoke('usage:get-model-efficiency'),

  // Project analytics methods
  getProjectBreakdown: () => ipcRenderer.invoke('usage:get-project-breakdown'),
  getProjectComparison: () => ipcRenderer.invoke('usage:get-project-comparison'),
  getProjectSessions: (projectName: string) => 
    ipcRenderer.invoke('usage:get-project-sessions', projectName),

  // File monitoring methods
  startMonitoring: (path: string) => ipcRenderer.invoke('monitor:start', path),
  stopMonitoring: () => ipcRenderer.invoke('monitor:stop'),
  getMonitoringStatus: () => ipcRenderer.invoke('monitor:status'),

  // Settings methods
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (settings: AppSettings) => ipcRenderer.invoke('settings:update', settings),

  // Export methods
  exportCsv: (data: UsageEntry[]) => ipcRenderer.invoke('export:csv', data),
  exportJson: (data: UsageEntry[]) => ipcRenderer.invoke('export:json', data),
  exportBusinessReport: (data: BusinessIntelligence) => ipcRenderer.invoke('export:business-report', data),

  // Currency methods
  getCurrencyRates: () => ipcRenderer.invoke('currency:get-rates'),
  convertCurrency: (amount: number, from: string, to: string) => 
    ipcRenderer.invoke('currency:convert', amount, from, to),
  getCurrencyStatus: () => ipcRenderer.invoke('currency:get-status'),
  forceUpdateCurrency: () => ipcRenderer.invoke('currency:force-update'),

  // Centralized cost calculation methods with currency support
  calculateDashboardMetrics: (currentPeriodData: UsageEntry[], previousPeriodData: UsageEntry[]) => 
    ipcRenderer.invoke('cost-calculator:dashboard-metrics', currentPeriodData, previousPeriodData),
  calculateDashboardMetricsWithCurrency: (currentPeriodData: UsageEntry[], previousPeriodData: UsageEntry[], targetCurrency: string, rates: CurrencyRates) => 
    ipcRenderer.invoke('cost-calculator:dashboard-metrics-with-currency', currentPeriodData, previousPeriodData, targetCurrency, rates),
  calculateProjectCosts: (entries: UsageEntry[], targetCurrency: string, rates: CurrencyRates) => 
    ipcRenderer.invoke('cost-calculator:project-costs', entries, targetCurrency, rates),
  calculateTotalCost: (entries: UsageEntry[], targetCurrency?: string) => 
    ipcRenderer.invoke('cost-calculator:total-cost', entries, targetCurrency),
  calculateModelBreakdown: (entries: UsageEntry[]) => 
    ipcRenderer.invoke('cost-calculator:model-breakdown', entries),

  // Event listeners
  onUsageUpdate: (callback: (data: UsageEntry[]) => void) => {
    ipcRenderer.on('usage-updated', (_, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('usage-updated');
  },

  onFileSystemEvent: (callback: (event: FileSystemEvent) => void) => {
    ipcRenderer.on('file-system-event', (_, event) => callback(event));
    return () => ipcRenderer.removeAllListeners('file-system-event');
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);

export type ElectronAPI = typeof api;