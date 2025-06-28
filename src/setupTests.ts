import '@testing-library/jest-dom';

// Mock Electron API
declare global {
  interface Global {
    window: {
      electronAPI: {
        getUsageStats: jest.Mock;
        getUsageByDateRange: jest.Mock;
        getSessionStats: jest.Mock;
        startMonitoring: jest.Mock;
        stopMonitoring: jest.Mock;
        getMonitoringStatus: jest.Mock;
        getSettings: jest.Mock;
        updateSettings: jest.Mock;
        exportCsv: jest.Mock;
        exportJson: jest.Mock;
        getCurrencyRates: jest.Mock;
        convertCurrency: jest.Mock;
        onUsageUpdate: jest.Mock;
        onFileSystemEvent: jest.Mock;
      };
    };
  }
}

(global as unknown as Global).window = {
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