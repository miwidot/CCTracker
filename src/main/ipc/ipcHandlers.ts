import { ipcMain } from 'electron';
import type { UsageService } from '../services/UsageService';
import type { FileMonitorService } from '../services/FileMonitorService';
import type { SettingsService } from '../services/SettingsService';
import type { CurrencyService } from '../services/CurrencyService';
import type { ExportService } from '../services/ExportService';
import type { CurrencyRates, UsageEntry } from '@shared/types';
import { log } from '@shared/utils/logger';

// Type guards for runtime type checking
function isUsageEntry(obj: unknown): obj is UsageEntry {
  if (typeof obj !== 'object' || obj === null) return false;
  const record = obj as Record<string, unknown>;
  return typeof record.id === 'string' &&
    typeof record.timestamp === 'string' &&
    typeof record.model === 'string' &&
    typeof record.input_tokens === 'number' &&
    typeof record.output_tokens === 'number' &&
    typeof record.total_tokens === 'number' &&
    typeof record.cost_usd === 'number';
}

function isUsageEntryArray(arr: unknown): arr is UsageEntry[] {
  return Array.isArray(arr) && arr.every(isUsageEntry);
}

function isCurrencyRates(obj: unknown): obj is CurrencyRates {
  if (typeof obj !== 'object' || obj === null) return false;
  const record = obj as Record<string, unknown>;
  return typeof record.USD === 'number' &&
    typeof record.EUR === 'number' &&
    typeof record.GBP === 'number' &&
    typeof record.JPY === 'number' &&
    typeof record.CNY === 'number' &&
    typeof record.MYR === 'number';
}

interface Services {
  usageService: UsageService;
  fileMonitorService: FileMonitorService;
  settingsService: SettingsService;
  currencyService: CurrencyService;
  exportService: ExportService;
}

// Valid currency codes (excluding monthlyBudget which is not a currency)
type CurrencyCode = keyof Omit<CurrencyRates, 'monthlyBudget'>;

/**
 * Validates if a given string is a valid currency code
 */
function isValidCurrencyCode(code: string): code is CurrencyCode {
  const validCurrencies: CurrencyCode[] = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'MYR'];
  return validCurrencies.includes(code as CurrencyCode);
}

export function setupIpcHandlers(services: Services) {
  const { usageService, fileMonitorService, settingsService, currencyService, exportService } = services;

  // Usage data handlers
  ipcMain.handle('usage:get-stats', async () => {
    try {
      return await usageService.getAllUsageEntries();
    } catch (error) {
      log.ipc.error('usage:get-stats', error as Error);
      throw error;
    }
  });

  ipcMain.handle('usage:get-advanced-stats', async () => {
    try {
      return await usageService.getAdvancedUsageStats();
    } catch (error) {
      log.ipc.error('usage:get-advanced-stats', error as Error);
      throw error;
    }
  });

  ipcMain.handle('usage:get-business-intelligence', async () => {
    try {
      return await usageService.getBusinessIntelligence();
    } catch (error) {
      log.ipc.error('usage:get-business-intelligence', error as Error);
      throw error;
    }
  });

  ipcMain.handle('usage:get-by-date-range', async (_, start: string, end: string) => {
    try {
      return await usageService.getUsageByDateRange(start, end);
    } catch (error) {
      log.ipc.error('usage:get-by-date-range', error as Error);
      throw error;
    }
  });

  ipcMain.handle('usage:get-session-stats', async (_, sessionId: string) => {
    try {
      return await usageService.getSessionStats(sessionId);
    } catch (error) {
      log.ipc.error('usage:get-session-stats', error as Error);
      throw error;
    }
  });

  // Advanced analytics handlers
  ipcMain.handle('usage:detect-anomalies', async () => {
    try {
      return await usageService.detectAnomalies();
    } catch (error) {
      log.ipc.error('usage:detect-anomalies', error as Error);
      throw error;
    }
  });

  ipcMain.handle('usage:get-predictions', async () => {
    try {
      return await usageService.generatePredictions();
    } catch (error) {
      log.ipc.error('usage:get-predictions', error as Error);
      throw error;
    }
  });

  ipcMain.handle('usage:get-model-efficiency', async () => {
    try {
      return await usageService.getModelEfficiency();
    } catch (error) {
      log.ipc.error('usage:get-model-efficiency', error as Error);
      throw error;
    }
  });

  // Project analytics handlers
  ipcMain.handle('usage:get-project-breakdown', async () => {
    try {
      return await usageService.getProjectBreakdown();
    } catch (error) {
      log.ipc.error('usage:get-project-breakdown', error as Error);
      throw error;
    }
  });

  ipcMain.handle('usage:get-project-comparison', async () => {
    try {
      return await usageService.getProjectComparison();
    } catch (error) {
      log.ipc.error('usage:get-project-comparison', error as Error);
      throw error;
    }
  });

  ipcMain.handle('usage:get-project-sessions', async (_, projectName: string) => {
    try {
      return await usageService.getProjectSessions(projectName);
    } catch (error) {
      log.ipc.error('usage:get-project-sessions', error as Error);
      throw error;
    }
  });

  // File monitoring handlers
  ipcMain.handle('monitor:start', async (_, path: string) => {
    try {
      return await fileMonitorService.startMonitoring(path);
    } catch (error) {
      log.ipc.error('monitor:start', error as Error);
      throw error;
    }
  });

  ipcMain.handle('monitor:stop', async () => {
    try {
      return await fileMonitorService.stopMonitoring();
    } catch (error) {
      log.ipc.error('monitor:stop', error as Error);
      throw error;
    }
  });

  ipcMain.handle('monitor:status', () => {
    try {
      return fileMonitorService.getMonitoringStatus();
    } catch (error) {
      log.ipc.error('monitor:status', error as Error);
      throw error;
    }
  });

  // Settings handlers
  ipcMain.handle('settings:get', () => {
    try {
      return settingsService.getSettings();
    } catch (error) {
      log.ipc.error('settings:get', error as Error);
      throw error;
    }
  });

  ipcMain.handle('settings:update', (_, settings) => {
    try {
      settingsService.updateSettings(settings);
      return settingsService.getSettings();
    } catch (error) {
      log.ipc.error('settings:update', error as Error);
      throw error;
    }
  });

  // Export handlers with save dialog
  ipcMain.handle('export:csv', async (event, data) => {
    try {
      const { dialog } = await import('electron');
      const result = await dialog.showSaveDialog({
        title: 'Save CSV Export',
        defaultPath: `usage_export_${new Date().toISOString().split('T')[0]}.csv`,
        filters: [
          { name: 'CSV Files', extensions: ['csv'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      
      if (result.canceled || !result.filePath) {
        return { success: false, error: 'Export canceled by user' };
      }
      
      return await exportService.exportUsageDataToPath(data, result.filePath, { format: 'csv' });
    } catch (error) {
      log.ipc.error('export:csv', error as Error);
      throw error;
    }
  });

  ipcMain.handle('export:json', async (event, data) => {
    try {
      const { dialog } = await import('electron');
      const result = await dialog.showSaveDialog({
        title: 'Save JSON Export',
        defaultPath: `usage_export_${new Date().toISOString().split('T')[0]}.json`,
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      
      if (result.canceled || !result.filePath) {
        return { success: false, error: 'Export canceled by user' };
      }
      
      return await exportService.exportUsageDataToPath(data, result.filePath, { format: 'json' });
    } catch (error) {
      log.ipc.error('export:json', error as Error);
      throw error;
    }
  });

  ipcMain.handle('export:business-report', async (_, data) => {
    try {
      return await exportService.exportBusinessIntelligence(data);
    } catch (error) {
      log.ipc.error('export:business-report', error as Error);
      throw error;
    }
  });

  // Currency handlers
  ipcMain.handle('currency:get-rates', async () => {
    try {
      return await currencyService.getCurrentRates();
    } catch (error) {
      log.ipc.error('currency:get-rates', error as Error);
      throw error;
    }
  });

  ipcMain.handle('currency:convert', async (_, amount: number, from: string, to: string) => {
    try {
      if (!isValidCurrencyCode(from)) {
        throw new Error(`Invalid source currency code: ${from}`);
      }
      if (!isValidCurrencyCode(to)) {
        throw new Error(`Invalid target currency code: ${to}`);
      }
      return await currencyService.convertCurrency(amount, from, to);
    } catch (error) {
      log.ipc.error('currency:convert', error as Error);
      throw error;
    }
  });

  ipcMain.handle('currency:get-status', () => {
    try {
      return currencyService.getCacheStatus();
    } catch (error) {
      log.ipc.error('currency:get-status', error as Error);
      throw error;
    }
  });

  ipcMain.handle('currency:force-update', async () => {
    try {
      return await currencyService.forceUpdateRates();
    } catch (error) {
      log.ipc.error('currency:force-update', error as Error);
      throw error;
    }
  });

  // Centralized cost calculation handlers with currency support
  ipcMain.handle('cost-calculator:dashboard-metrics', async (_, currentPeriodData: unknown[], previousPeriodData: unknown[]) => {
    try {
      if (!isUsageEntryArray(currentPeriodData) || !isUsageEntryArray(previousPeriodData)) {
        throw new Error('Invalid usage data provided to dashboard-metrics');
      }
      const { calculateDashboardMetrics } = await import('../services/CostCalculatorService');
      return calculateDashboardMetrics(currentPeriodData, previousPeriodData);
    } catch (error) {
      log.ipc.error('cost-calculator:dashboard-metrics', error as Error);
      throw error;
    }
  });
  
  ipcMain.handle('cost-calculator:dashboard-metrics-with-currency', async (_, currentPeriodData: unknown[], previousPeriodData: unknown[], targetCurrency: string, rates: unknown) => {
    try {
      if (!isUsageEntryArray(currentPeriodData) || !isUsageEntryArray(previousPeriodData) || !isCurrencyRates(rates)) {
        throw new Error('Invalid data provided to dashboard-metrics-with-currency');
      }
      const { setCurrencyRates, calculateDashboardMetricsWithCurrency } = await import('../services/CostCalculatorService');
      setCurrencyRates(rates);
      return calculateDashboardMetricsWithCurrency(currentPeriodData, previousPeriodData, targetCurrency);
    } catch (error) {
      log.ipc.error('cost-calculator:dashboard-metrics-with-currency', error as Error);
      throw error;
    }
  });
  
  ipcMain.handle('cost-calculator:project-costs', async (_, entries: unknown[], targetCurrency: string, rates: unknown) => {
    try {
      if (!isUsageEntryArray(entries) || !isCurrencyRates(rates)) {
        throw new Error('Invalid data provided to project-costs');
      }
      const { setCurrencyRates, calculateProjectCostsByName } = await import('../services/CostCalculatorService');
      setCurrencyRates(rates);
      return calculateProjectCostsByName(entries, targetCurrency);
    } catch (error) {
      log.ipc.error('cost-calculator:project-costs', error as Error);
      throw error;
    }
  });

  ipcMain.handle('cost-calculator:total-cost', async (_, entries: unknown[], targetCurrency?: string) => {
    try {
      if (!isUsageEntryArray(entries)) {
        throw new Error('Invalid usage entries provided to total-cost');
      }
      const { calculateTotalCost } = await import('../services/CostCalculatorService');
      return calculateTotalCost(entries, targetCurrency);
    } catch (error) {
      log.ipc.error('cost-calculator:total-cost', error as Error);
      throw error;
    }
  });

  ipcMain.handle('cost-calculator:model-breakdown', async (_, entries: unknown[]) => {
    try {
      if (!isUsageEntryArray(entries)) {
        throw new Error('Invalid usage entries provided to model-breakdown');
      }
      const { calculateModelBreakdown } = await import('../services/CostCalculatorService');
      return calculateModelBreakdown(entries);
    } catch (error) {
      log.ipc.error('cost-calculator:model-breakdown', error as Error);
      throw error;
    }
  });
}