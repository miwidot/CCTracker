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

  ipcMain.handle('usage:get-by-date-range', async (_, start: string, end: string) => {
    return await usageService.getUsageByDateRange(start, end);
  });

  ipcMain.handle('usage:get-session-stats', async (_, sessionId: string) => {
    return await usageService.getSessionStats(sessionId);
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

  // Currency handlers
  ipcMain.handle('currency:get-rates', async () => {
    return await currencyService.getCurrentRates();
  });

  ipcMain.handle('currency:convert', async (_, amount: number, from: string, to: string) => {
    return await currencyService.convertCurrency(amount, from as any, to as any);
  });
}