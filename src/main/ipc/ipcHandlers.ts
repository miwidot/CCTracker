import { ipcMain } from 'electron';
import type { UsageService } from '../services/UsageService';
import type { FileMonitorService } from '../services/FileMonitorService';
import type { SettingsService } from '../services/SettingsService';
import type { CurrencyService } from '../services/CurrencyService';
import type { ExportService } from '../services/ExportService';
import type { CurrencyRates } from '@shared/types';

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
      console.error('Error in usage:get-stats:', error);
      throw error;
    }
  });

  ipcMain.handle('usage:get-advanced-stats', async () => {
    try {
      return await usageService.getAdvancedUsageStats();
    } catch (error) {
      console.error('Error in usage:get-advanced-stats:', error);
      throw error;
    }
  });

  ipcMain.handle('usage:get-business-intelligence', async () => {
    try {
      return await usageService.getBusinessIntelligence();
    } catch (error) {
      console.error('Error in usage:get-business-intelligence:', error);
      throw error;
    }
  });

  ipcMain.handle('usage:get-by-date-range', async (_, start: string, end: string) => {
    try {
      return await usageService.getUsageByDateRange(start, end);
    } catch (error) {
      console.error('Error in usage:get-by-date-range:', error);
      throw error;
    }
  });

  ipcMain.handle('usage:get-session-stats', async (_, sessionId: string) => {
    try {
      return await usageService.getSessionStats(sessionId);
    } catch (error) {
      console.error('Error in usage:get-session-stats:', error);
      throw error;
    }
  });

  // Advanced analytics handlers
  ipcMain.handle('usage:detect-anomalies', async () => {
    try {
      return await usageService.detectAnomalies();
    } catch (error) {
      console.error('Error in usage:detect-anomalies:', error);
      throw error;
    }
  });

  ipcMain.handle('usage:get-predictions', async () => {
    try {
      return await usageService.generatePredictions();
    } catch (error) {
      console.error('Error in usage:get-predictions:', error);
      throw error;
    }
  });

  ipcMain.handle('usage:get-model-efficiency', async () => {
    try {
      return await usageService.getModelEfficiency();
    } catch (error) {
      console.error('Error in usage:get-model-efficiency:', error);
      throw error;
    }
  });

  // Project analytics handlers
  ipcMain.handle('usage:get-project-breakdown', async () => {
    try {
      return await usageService.getProjectBreakdown();
    } catch (error) {
      console.error('Error in usage:get-project-breakdown:', error);
      throw error;
    }
  });

  ipcMain.handle('usage:get-project-comparison', async () => {
    try {
      return await usageService.getProjectComparison();
    } catch (error) {
      console.error('Error in usage:get-project-comparison:', error);
      throw error;
    }
  });

  ipcMain.handle('usage:get-project-sessions', async (_, projectName: string) => {
    try {
      return await usageService.getProjectSessions(projectName);
    } catch (error) {
      console.error('Error in usage:get-project-sessions:', error);
      throw error;
    }
  });

  // File monitoring handlers
  ipcMain.handle('monitor:start', async (_, path: string) => {
    try {
      return await fileMonitorService.startMonitoring(path);
    } catch (error) {
      console.error('Error in monitor:start:', error);
      throw error;
    }
  });

  ipcMain.handle('monitor:stop', async () => {
    try {
      return await fileMonitorService.stopMonitoring();
    } catch (error) {
      console.error('Error in monitor:stop:', error);
      throw error;
    }
  });

  ipcMain.handle('monitor:status', () => {
    try {
      return fileMonitorService.getMonitoringStatus();
    } catch (error) {
      console.error('Error in monitor:status:', error);
      throw error;
    }
  });

  // Settings handlers
  ipcMain.handle('settings:get', async () => {
    try {
      return settingsService.getSettings();
    } catch (error) {
      console.error('Error in settings:get:', error);
      throw error;
    }
  });

  ipcMain.handle('settings:update', async (_, settings) => {
    try {
      return await settingsService.updateSettings(settings);
    } catch (error) {
      console.error('Error in settings:update:', error);
      throw error;
    }
  });

  // Export handlers
  ipcMain.handle('export:csv', async (_, data) => {
    try {
      return await exportService.exportUsageData(data, { format: 'csv' });
    } catch (error) {
      console.error('Error in export:csv:', error);
      throw error;
    }
  });

  ipcMain.handle('export:json', async (_, data) => {
    try {
      return await exportService.exportUsageData(data, { format: 'json' });
    } catch (error) {
      console.error('Error in export:json:', error);
      throw error;
    }
  });

  ipcMain.handle('export:business-report', async (_, data) => {
    try {
      return await exportService.exportBusinessIntelligence(data);
    } catch (error) {
      console.error('Error in export:business-report:', error);
      throw error;
    }
  });

  // Currency handlers
  ipcMain.handle('currency:get-rates', async () => {
    try {
      return await currencyService.getCurrentRates();
    } catch (error) {
      console.error('Error in currency:get-rates:', error);
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
      console.error('Error in currency:convert:', error);
      throw error;
    }
  });

  ipcMain.handle('currency:get-status', () => {
    try {
      return currencyService.getCacheStatus();
    } catch (error) {
      console.error('Error in currency:get-status:', error);
      throw error;
    }
  });

  ipcMain.handle('currency:force-update', async () => {
    try {
      return await currencyService.forceUpdateRates();
    } catch (error) {
      console.error('Error in currency:force-update:', error);
      throw error;
    }
  });

  // Centralized cost calculation handlers with currency support
  ipcMain.handle('cost-calculator:dashboard-metrics', async (_, currentPeriodData: any[], previousPeriodData: any[]) => {
    try {
      const { calculateDashboardMetrics } = await import('../services/CostCalculatorService');
      return calculateDashboardMetrics(currentPeriodData, previousPeriodData);
    } catch (error) {
      console.error('Error in cost-calculator:dashboard-metrics:', error);
      throw error;
    }
  });
  
  ipcMain.handle('cost-calculator:dashboard-metrics-with-currency', async (_, currentPeriodData: any[], previousPeriodData: any[], targetCurrency: string, rates: any) => {
    try {
      const { setCurrencyRates, calculateDashboardMetricsWithCurrency } = await import('../services/CostCalculatorService');
      setCurrencyRates(rates);
      return calculateDashboardMetricsWithCurrency(currentPeriodData, previousPeriodData, targetCurrency);
    } catch (error) {
      console.error('Error in cost-calculator:dashboard-metrics-with-currency:', error);
      throw error;
    }
  });
  
  ipcMain.handle('cost-calculator:project-costs', async (_, entries: any[], targetCurrency: string, rates: any) => {
    try {
      const { setCurrencyRates, calculateProjectCostsByName } = await import('../services/CostCalculatorService');
      setCurrencyRates(rates);
      return calculateProjectCostsByName(entries, targetCurrency);
    } catch (error) {
      console.error('Error in cost-calculator:project-costs:', error);
      throw error;
    }
  });

  ipcMain.handle('cost-calculator:total-cost', async (_, entries: any[], targetCurrency?: string) => {
    try {
      const { calculateTotalCost } = await import('../services/CostCalculatorService');
      return calculateTotalCost(entries, targetCurrency);
    } catch (error) {
      console.error('Error in cost-calculator:total-cost:', error);
      throw error;
    }
  });

  ipcMain.handle('cost-calculator:model-breakdown', async (_, entries: any[]) => {
    try {
      const { calculateModelBreakdown } = await import('../services/CostCalculatorService');
      return calculateModelBreakdown(entries);
    } catch (error) {
      console.error('Error in cost-calculator:model-breakdown:', error);
      throw error;
    }
  });
}