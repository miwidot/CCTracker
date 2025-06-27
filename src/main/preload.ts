import { contextBridge, ipcRenderer } from 'electron';
import type { IPCChannels } from '@shared/types';

const api = {
  // Usage data methods
  getUsageStats: () => ipcRenderer.invoke('usage:get-stats'),
  getUsageByDateRange: (start: string, end: string) => 
    ipcRenderer.invoke('usage:get-by-date-range', start, end),
  getSessionStats: (sessionId: string) => 
    ipcRenderer.invoke('usage:get-session-stats', sessionId),

  // File monitoring methods
  startMonitoring: (path: string) => ipcRenderer.invoke('monitor:start', path),
  stopMonitoring: () => ipcRenderer.invoke('monitor:stop'),
  getMonitoringStatus: () => ipcRenderer.invoke('monitor:status'),

  // Settings methods
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (settings: any) => ipcRenderer.invoke('settings:update', settings),

  // Export methods
  exportToCsv: (data: any[]) => ipcRenderer.invoke('export:csv', data),
  exportToJson: (data: any[]) => ipcRenderer.invoke('export:json', data),

  // Currency methods
  getCurrencyRates: () => ipcRenderer.invoke('currency:get-rates'),
  convertCurrency: (amount: number, from: string, to: string) => 
    ipcRenderer.invoke('currency:convert', amount, from, to),

  // Event listeners
  onUsageUpdate: (callback: (data: any) => void) => {
    ipcRenderer.on('usage-updated', (_, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('usage-updated');
  },

  onFileSystemEvent: (callback: (event: any) => void) => {
    ipcRenderer.on('file-system-event', (_, event) => callback(event));
    return () => ipcRenderer.removeAllListeners('file-system-event');
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);

export type ElectronAPI = typeof api;