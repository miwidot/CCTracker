import '@testing-library/jest-dom';

// Mock Electron API
(global as any).window = {
  electronAPI: {
    getUsageStats: jest.fn(),
    getUsageByDateRange: jest.fn(),
    getSessionStats: jest.fn(),
    startMonitoring: jest.fn(),
    stopMonitoring: jest.fn(),
    getMonitoringStatus: jest.fn(),
    getSettings: jest.fn(),
    updateSettings: jest.fn(),
    exportCsv: jest.fn(),
    exportJson: jest.fn(),
    getCurrencyRates: jest.fn(),
    convertCurrency: jest.fn(),
    onUsageUpdate: jest.fn(() => () => {}),
    onFileSystemEvent: jest.fn(() => () => {}),
  }
};