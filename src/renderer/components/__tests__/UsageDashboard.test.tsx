import React from 'react';
import { render, screen } from '@testing-library/react';
import UsageDashboard from '../UsageDashboard';
import { SettingsProvider } from '../../contexts/SettingsContext';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { UsageDataProvider } from '../../contexts/UsageDataContext';
import { DEFAULT_SETTINGS } from '@shared/constants';

// Mock i18n
jest.mock('../../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockSettings = DEFAULT_SETTINGS;

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <SettingsProvider initialSettings={mockSettings}>
      <ThemeProvider>
        <UsageDataProvider>
          {component}
        </UsageDataProvider>
      </ThemeProvider>
    </SettingsProvider>
  );
};

describe('UsageDashboard', () => {
  beforeEach(() => {
    // Mock Electron API responses
    (window.electronAPI.getUsageStats as jest.Mock).mockResolvedValue([]);
    (window.electronAPI.getSettings as jest.Mock).mockResolvedValue(mockSettings);
  });

  it('renders dashboard title', async () => {
    renderWithProviders(<UsageDashboard />);
    
    expect(screen.getByText('dashboard.title')).toBeInTheDocument();
  });

  it('renders overview cards', async () => {
    renderWithProviders(<UsageDashboard />);
    
    expect(screen.getByText('metrics.totalCost')).toBeInTheDocument();
    expect(screen.getByText('metrics.totalTokens')).toBeInTheDocument();
    expect(screen.getByText('metrics.sessionsCount')).toBeInTheDocument();
  });

  it('renders export buttons', async () => {
    renderWithProviders(<UsageDashboard />);
    
    expect(screen.getByText('export.csv')).toBeInTheDocument();
    expect(screen.getByText('export.json')).toBeInTheDocument();
  });

  it('renders date range selector', async () => {
    renderWithProviders(<UsageDashboard />);
    
    expect(screen.getByText('dateRange.last7Days')).toBeInTheDocument();
    expect(screen.getByText('dateRange.last30Days')).toBeInTheDocument();
    expect(screen.getByText('dateRange.last90Days')).toBeInTheDocument();
  });
});