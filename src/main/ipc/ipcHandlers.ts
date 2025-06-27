import { ipcMain } from 'electron';
import type { UsageService } from '../services/UsageService';
import type { FileMonitorService } from '../services/FileMonitorService';
import type { SettingsService } from '../services/SettingsService';
import type { CurrencyService } from '../services/CurrencyService';
import type { ExportService } from '../services/ExportService';

interface Services {
  usageService: UsageService;
  fileMonitorService: FileMonitorService;
  settingsService: SettingsService;
  currencyService: CurrencyService;
  exportService: ExportService;
}

export function setupIpcHandlers(services: Services) {
  const { usageService, fileMonitorService, settingsService, currencyService, exportService } = services;

  // Usage data handlers
  ipcMain.handle('usage:get-stats', async () => {
    return await usageService.getAllUsageEntries();
  });

  ipcMain.handle('usage:get-advanced-stats', async () => {
    return await usageService.getAdvancedUsageStats();
  });

  ipcMain.handle('usage:get-business-intelligence', async () => {
    return await usageService.getBusinessIntelligence();
  });

  ipcMain.handle('usage:get-by-date-range', async (_, start: string, end: string) => {
    return await usageService.getUsageByDateRange(start, end);
  });

  ipcMain.handle('usage:get-session-stats', async (_, sessionId: string) => {
    return await usageService.getSessionStats(sessionId);
  });

  // Advanced analytics handlers
  ipcMain.handle('usage:detect-anomalies', async () => {
    return await usageService.detectAnomalies();
  });

  ipcMain.handle('usage:get-predictions', async () => {
    return await usageService.generatePredictions();
  });

  ipcMain.handle('usage:get-model-efficiency', async () => {
    return await usageService.getModelEfficiency();
  });

  // Project analytics handlers
  ipcMain.handle('usage:get-project-breakdown', async () => {
    return await usageService.getProjectBreakdown();
  });

  ipcMain.handle('usage:get-project-comparison', async () => {
    return await usageService.getProjectComparison();
  });

  ipcMain.handle('usage:get-project-sessions', async (_, projectName: string) => {
    return await usageService.getProjectSessions(projectName);
  });

  // File monitoring handlers
  ipcMain.handle('monitor:start', async (_, path: string) => {
    return await fileMonitorService.startMonitoring(path);
  });

  ipcMain.handle('monitor:stop', async () => {
    return await fileMonitorService.stopMonitoring();
  });

  ipcMain.handle('monitor:status', async () => {
    return fileMonitorService.getMonitoringStatus();
  });

  // Settings handlers
  ipcMain.handle('settings:get', async () => {
    return await settingsService.getSettings();
  });

  ipcMain.handle('settings:update', async (_, settings) => {
    return await settingsService.updateSettings(settings);
  });

  // Export handlers
  ipcMain.handle('export:csv', async (_, data) => {
    return await exportService.exportUsageData(data, { format: 'csv' });
  });

  ipcMain.handle('export:json', async (_, data) => {
    return await exportService.exportUsageData(data, { format: 'json' });
  });

  ipcMain.handle('export:business-report', async (_, data) => {
    return await exportService.exportBusinessIntelligence(data);
  });

  // Currency handlers
  ipcMain.handle('currency:get-rates', async () => {
    return await currencyService.getCurrentRates();
  });

  ipcMain.handle('currency:convert', async (_, amount: number, from: string, to: string) => {
    return await currencyService.convertCurrency(amount, from as any, to as any);
  });

  ipcMain.handle('currency:get-status', async () => {
    return currencyService.getCacheStatus();
  });

  ipcMain.handle('currency:force-update', async () => {
    return await currencyService.forceUpdateRates();
  });

  // Centralized cost calculation handlers with currency support
  ipcMain.handle('cost-calculator:dashboard-metrics', async (_, currentPeriodData: any[], previousPeriodData: any[]) => {
    const { calculateDashboardMetrics } = await import('../services/CostCalculatorService');
    return calculateDashboardMetrics(currentPeriodData, previousPeriodData);
  });
  
  ipcMain.handle('cost-calculator:dashboard-metrics-with-currency', async (_, currentPeriodData: any[], previousPeriodData: any[], targetCurrency: string, rates: any) => {
    const { setCurrencyRates, calculateDashboardMetricsWithCurrency } = await import('../services/CostCalculatorService');
    setCurrencyRates(rates);
    return calculateDashboardMetricsWithCurrency(currentPeriodData, previousPeriodData, targetCurrency);
  });
  
  ipcMain.handle('cost-calculator:project-costs', async (_, entries: any[], targetCurrency: string, rates: any) => {
    const { setCurrencyRates, calculateProjectCostsByName } = await import('../services/CostCalculatorService');
    setCurrencyRates(rates);
    return calculateProjectCostsByName(entries, targetCurrency);
  });

  ipcMain.handle('cost-calculator:total-cost', async (_, entries: any[], targetCurrency?: string) => {
    const { calculateTotalCost } = await import('../services/CostCalculatorService');
    return calculateTotalCost(entries, targetCurrency);
  });

  ipcMain.handle('cost-calculator:model-breakdown', async (_, entries: any[]) => {
    const { calculateModelBreakdown } = await import('../services/CostCalculatorService');
    return calculateModelBreakdown(entries);
  });
}