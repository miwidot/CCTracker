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

  // Auto-updater methods
  checkForUpdates: () => ipcRenderer.invoke('updater:check-for-updates'),
  checkForUpdatesManually: () => ipcRenderer.invoke('updater:check-manually'),
  downloadUpdate: () => ipcRenderer.invoke('updater:download-update'),
  installUpdate: () => ipcRenderer.invoke('updater:install-update'),
  getUpdateStatus: () => ipcRenderer.invoke('updater:get-status'),

  // Event listeners
  onUsageUpdate: (callback: (data: UsageEntry[]) => void) => {
    ipcRenderer.on('usage-updated', (_, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('usage-updated');
  },

  onFileSystemEvent: (callback: (event: FileSystemEvent) => void) => {
    ipcRenderer.on('file-system-event', (_, event) => callback(event));
    return () => ipcRenderer.removeAllListeners('file-system-event');
  },

  onUpdateProgress: (callback: (progressInfo: { percent: number; transferred: number; total: number }) => void) => {
    ipcRenderer.on('update-download-progress', (_, progressInfo) => callback(progressInfo));
    return () => ipcRenderer.removeAllListeners('update-download-progress');
  },

  // File system permission methods
  checkPermissions: (filePath: string) => ipcRenderer.invoke('permissions:check-path', filePath),
  checkClaudeAccess: () => ipcRenderer.invoke('permissions:check-claude-access'),
  getFileSystemHealthReport: () => ipcRenderer.invoke('permissions:get-health-report'),
  ensureDirectory: (dirPath: string) => ipcRenderer.invoke('permissions:ensure-directory', dirPath),
  testFileOperations: (dirPath: string) => ipcRenderer.invoke('permissions:test-file-operations', dirPath),

  // Backup methods
  createBackup: (options: { includeSettings: boolean; includeUsageData: boolean; includeExports: boolean; description?: string; compress: boolean }) => 
    ipcRenderer.invoke('backup:create', options),
  restoreFromBackup: (options: { backupId: string; restoreSettings: boolean; restoreUsageData: boolean; restoreExports: boolean; createBackupBeforeRestore: boolean }) => 
    ipcRenderer.invoke('backup:restore', options),
  getAvailableBackups: () => ipcRenderer.invoke('backup:list'),
  deleteBackup: (backupId: string) => ipcRenderer.invoke('backup:delete', backupId),
  getBackupStatus: () => ipcRenderer.invoke('backup:status'),
  cleanupOldBackups: (maxBackups?: number) => ipcRenderer.invoke('backup:cleanup', maxBackups),
  enableAutoBackup: (intervalHours?: number) => ipcRenderer.invoke('backup:enable-auto', intervalHours),
  disableAutoBackup: () => ipcRenderer.invoke('backup:disable-auto'),

  // Billing block methods
  getBillingBlocksSummary: (entries: UsageEntry[]) => ipcRenderer.invoke('billing:get-blocks-summary', entries),
  getCurrentBlockStatus: () => ipcRenderer.invoke('billing:get-current-block-status'),
  getProjectTokenStats: () => ipcRenderer.invoke('billing:get-project-token-stats'),

  // General invoke method for flexibility
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
};

contextBridge.exposeInMainWorld('electronAPI', api);

export type ElectronAPI = typeof api;