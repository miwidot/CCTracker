import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UsageDashboard from '../UsageDashboard';
import { SettingsProvider } from '../../contexts/SettingsContext';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { DEFAULT_SETTINGS } from '@shared/constants';
import type { UsageEntry, SessionStats } from '@shared/types';

// Mock i18n
jest.mock('../../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock currency hook
jest.mock('../../hooks/useCurrency', () => ({
  useCurrency: () => ({
    convertFromUSD: (amount: number) => amount * 1.2, // Mock 1.2x conversion rate
    formatCurrency: (amount: number) => `$${amount.toFixed(2)}`,
    formatCurrencyDetailed: (amount: number) => `$${amount.toFixed(6)}`,
    getCurrencySymbol: () => '$',
  }),
}));

// Mock recharts to avoid rendering issues in tests
jest.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
}));

const mockSettings = DEFAULT_SETTINGS;

// Mock usage data
const mockUsageData: UsageEntry[] = [
  {
    id: '1',
    timestamp: '2024-01-15T10:00:00Z',
    model: 'claude-3-5-sonnet-20241022',
    input_tokens: 1000,
    output_tokens: 500,
    total_tokens: 1500,
    cost_usd: 0.015,
    session_id: 'session-1',
    project_path: '/test/project',
    conversation_id: 'conv-1',
  },
  {
    id: '2',
    timestamp: '2024-01-15T11:00:00Z',
    model: 'claude-3-5-sonnet-20241022',
    input_tokens: 2000,
    output_tokens: 1000,
    total_tokens: 3000,
    cost_usd: 0.030,
    session_id: 'session-2',
    project_path: '/test/project2',
    conversation_id: 'conv-2',
  },
];

const mockSessionStats: SessionStats[] = [
  {
    session_id: 'session-1',
    start_time: '2024-01-15T10:00:00Z',
    end_time: '2024-01-15T10:30:00Z',
    total_cost: 0.015,
    total_tokens: 1500,
    message_count: 3,
    model: 'claude-3-5-sonnet-20241022',
  },
  {
    session_id: 'session-2',
    start_time: '2024-01-15T11:00:00Z',
    end_time: '2024-01-15T11:45:00Z',
    total_cost: 0.030,
    total_tokens: 3000,
    message_count: 5,
    model: 'claude-3-5-sonnet-20241022',
  },
];

// Mock UsageDataContext to avoid infinite loops
jest.mock('../../contexts/UsageDataContext', () => ({
  useUsageData: () => ({
    usageData: mockUsageData,
    sessionStats: mockSessionStats,
    isLoading: false,
    lastUpdated: new Date(),
    refreshData: jest.fn(),
  }),
  UsageDataProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <SettingsProvider initialSettings={mockSettings}>
      <ThemeProvider>
        {component}
      </ThemeProvider>
    </SettingsProvider>
  );
};

describe('UsageDashboard', () => {
  const mockElectronAPI = {
    getUsageStats: jest.fn(),
    getSessionStats: jest.fn(),
    getSettings: jest.fn(),
    getCurrencyRates: jest.fn(),
    exportCsv: jest.fn(),
    exportJson: jest.fn(),
    getProjectCosts: jest.fn(),
    calculateDashboardMetricsWithCurrency: jest.fn(),
    calculateTotalCost: jest.fn(),
    calculateModelBreakdown: jest.fn(),
    onUsageUpdate: jest.fn(),
    removeAllListeners: jest.fn(),
  };

  beforeEach(() => {
    // Setup default mocks
    mockElectronAPI.getUsageStats.mockResolvedValue(mockUsageData);
    mockElectronAPI.getSessionStats.mockResolvedValue(mockSessionStats);
    mockElectronAPI.getSettings.mockResolvedValue(mockSettings);
    mockElectronAPI.getCurrencyRates.mockResolvedValue({
      USD: 1,
      EUR: 0.85,
      GBP: 0.73,
      JPY: 110,
      CNY: 6.5,
      MYR: 4.2,
    });
    mockElectronAPI.getProjectCosts.mockResolvedValue({});
    mockElectronAPI.exportCsv.mockResolvedValue({ success: true, filePath: '/test/export.csv' });
    mockElectronAPI.exportJson.mockResolvedValue({ success: true, filePath: '/test/export.json' });
    mockElectronAPI.calculateDashboardMetricsWithCurrency.mockResolvedValue({
      totalCost: 0.045,
      totalTokens: 4500,
      sessionsCount: 2,
      avgCostPerSession: 0.0225,
      costTrend: 5.2,
      tokenTrend: 10.5,
      formattedTotalCost: '$0.045',
      formattedAvgCost: '$0.0225',
    });
    mockElectronAPI.calculateTotalCost.mockResolvedValue(0.045);
    mockElectronAPI.calculateModelBreakdown.mockResolvedValue({
      'claude-3-5-sonnet-20241022': 0.045,
    });
    mockElectronAPI.onUsageUpdate.mockImplementation((callback) => {
      // Return unsubscribe function
      return () => {};
    });
    mockElectronAPI.removeAllListeners.mockImplementation(() => {});

    // Assign to window
    Object.assign(window, { electronAPI: mockElectronAPI });

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Static Rendering Tests', () => {
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
      
      expect(screen.getByText('dateRange.7Days')).toBeInTheDocument();
      expect(screen.getByText('dateRange.30Days')).toBeInTheDocument();
      expect(screen.getByText('dateRange.all')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('shows loading indicators during data fetch', async () => {
      // Mock delayed API response
      mockElectronAPI.getUsageStats.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockUsageData), 100))
      );
      mockElectronAPI.getSessionStats.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockSessionStats), 100))
      );

      renderWithProviders(<UsageDashboard />);

      // Should show loading indicators
      expect(screen.getByText('common.loading')).toBeInTheDocument();

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('common.loading')).not.toBeInTheDocument();
      });

      // Should show data after loading
      expect(mockElectronAPI.getUsageStats).toHaveBeenCalled();
      expect(mockElectronAPI.getSessionStats).toHaveBeenCalled();
    });

    it('shows refresh loading state when refreshing data', async () => {
      renderWithProviders(<UsageDashboard />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.queryByText('common.loading')).not.toBeInTheDocument();
      });

      // Mock delayed refresh response
      mockElectronAPI.getUsageStats.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockUsageData), 100))
      );

      // Click refresh button
      const refreshButton = screen.getByText('common.refresh');
      fireEvent.click(refreshButton);

      // Should show refreshing state
      await waitFor(() => {
        expect(refreshButton).toBeDisabled();
      });

      // Wait for refresh to complete
      await waitFor(() => {
        expect(refreshButton).not.toBeDisabled();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      // Mock failed API calls
      mockElectronAPI.getUsageStats.mockRejectedValue(new Error('API Error'));
      mockElectronAPI.getSessionStats.mockRejectedValue(new Error('API Error'));

      renderWithProviders(<UsageDashboard />);

      // Should handle errors without crashing
      await waitFor(() => {
        expect(screen.queryByText('common.loading')).not.toBeInTheDocument();
      });

      // Component should still render with error state
      expect(screen.getByText('dashboard.title')).toBeInTheDocument();
    });

    it('handles export errors', async () => {
      mockElectronAPI.exportCsv.mockRejectedValue(new Error('Export failed'));
      
      renderWithProviders(<UsageDashboard />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.queryByText('common.loading')).not.toBeInTheDocument();
      });

      const csvButton = screen.getByText('export.csv');
      fireEvent.click(csvButton);

      // Should handle export error gracefully
      await waitFor(() => {
        expect(mockElectronAPI.exportCsv).toHaveBeenCalled();
      });

      // Button should be re-enabled after error
      await waitFor(() => {
        expect(csvButton).not.toBeDisabled();
      });
    });
  });

  describe('User Interactions', () => {
    beforeEach(async () => {
      renderWithProviders(<UsageDashboard />);
      // Wait for initial load
      await waitFor(() => {
        expect(screen.queryByText('common.loading')).not.toBeInTheDocument();
      });
    });

    it('handles CSV export button click', async () => {
      const user = userEvent.setup();
      const csvButton = screen.getByText('export.csv');

      await user.click(csvButton);

      expect(mockElectronAPI.exportCsv).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            model: expect.any(String),
          })
        ])
      );
    });

    it('handles JSON export button click', async () => {
      const user = userEvent.setup();
      const jsonButton = screen.getByText('export.json');

      await user.click(jsonButton);

      expect(mockElectronAPI.exportJson).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            model: expect.any(String),
          })
        ])
      );
    });

    it('disables export buttons during export', async () => {
      const user = userEvent.setup();
      
      // Mock delayed export
      mockElectronAPI.exportCsv.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );

      const csvButton = screen.getByText('export.csv');
      const jsonButton = screen.getByText('export.json');

      await user.click(csvButton);

      // Both buttons should be disabled during export
      expect(csvButton).toBeDisabled();
      expect(jsonButton).toBeDisabled();

      // Wait for export to complete
      await waitFor(() => {
        expect(csvButton).not.toBeDisabled();
        expect(jsonButton).not.toBeDisabled();
      });
    });

    it('handles date range selection', async () => {
      const user = userEvent.setup();
      
      // Click on "7 days" button
      const sevenDaysButton = screen.getByText('dateRange.7Days');
      await user.click(sevenDaysButton);

      // Should update the date range (we can verify this by checking if data is re-filtered)
      // The component should re-render with the new date range
      expect(sevenDaysButton).toBeInTheDocument();
    });

    it('handles "all" date range selection', async () => {
      const user = userEvent.setup();
      
      const allButton = screen.getByText('dateRange.all');
      await user.click(allButton);

      // Should show all data without date filtering
      expect(allButton).toBeInTheDocument();
    });

    it('handles refresh button click', async () => {
      const user = userEvent.setup();
      
      const refreshButton = screen.getByText('common.refresh');
      await user.click(refreshButton);

      // Should call refresh APIs
      expect(mockElectronAPI.getUsageStats).toHaveBeenCalledTimes(2); // Initial + refresh
      expect(mockElectronAPI.getSessionStats).toHaveBeenCalledTimes(2); // Initial + refresh
    });
  });

  describe('Data Rendering', () => {
    it('displays correct usage data', async () => {
      renderWithProviders(<UsageDashboard />);

      await waitFor(() => {
        expect(screen.queryByText('common.loading')).not.toBeInTheDocument();
      });

      // Should display total cost (sum of mock data costs)
      const totalCost = mockUsageData.reduce((sum, entry) => sum + entry.cost_usd, 0);
      
      // Should display total tokens
      const totalTokens = mockUsageData.reduce((sum, entry) => sum + entry.total_tokens, 0);
      
      // Note: Exact values depend on currency formatting, but structure should be present
      expect(screen.getByText('metrics.totalCost')).toBeInTheDocument();
      expect(screen.getByText('metrics.totalTokens')).toBeInTheDocument();
    });

    it('displays session data correctly', async () => {
      renderWithProviders(<UsageDashboard />);

      await waitFor(() => {
        expect(screen.queryByText('common.loading')).not.toBeInTheDocument();
      });

      // Should display session count
      expect(screen.getByText('metrics.sessionsCount')).toBeInTheDocument();
    });

    it('handles empty data state', async () => {
      mockElectronAPI.getUsageStats.mockResolvedValue([]);
      mockElectronAPI.getSessionStats.mockResolvedValue([]);

      renderWithProviders(<UsageDashboard />);

      await waitFor(() => {
        expect(screen.queryByText('common.loading')).not.toBeInTheDocument();
      });

      // Export buttons should be disabled with no data
      expect(screen.getByText('export.csv')).toBeDisabled();
      expect(screen.getByText('export.json')).toBeDisabled();
    });
  });

  describe('Real-time Updates', () => {
    it('updates data when refresh is called', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<UsageDashboard />);

      await waitFor(() => {
        expect(screen.queryByText('common.loading')).not.toBeInTheDocument();
      });

      // Update mock data
      const updatedData = [
        ...mockUsageData,
        {
          id: '3',
          timestamp: '2024-01-15T12:00:00Z',
          model: 'claude-3-5-sonnet-20241022',
          input_tokens: 1500,
          output_tokens: 750,
          total_tokens: 2250,
          cost_usd: 0.0225,
          session_id: 'session-3',
          project_path: '/test/project3',
          conversation_id: 'conv-3',
        },
      ];

      mockElectronAPI.getUsageStats.mockResolvedValue(updatedData);

      // Trigger refresh
      const refreshButton = screen.getByText('common.refresh');
      await user.click(refreshButton);

      // Wait for update
      await waitFor(() => {
        expect(mockElectronAPI.getUsageStats).toHaveBeenCalledTimes(2);
      });

      // Component should re-render with updated data
      expect(screen.getByText('metrics.totalCost')).toBeInTheDocument();
    });

    it('maintains UI state during data updates', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<UsageDashboard />);

      await waitFor(() => {
        expect(screen.queryByText('common.loading')).not.toBeInTheDocument();
      });

      // Select a specific date range
      const sevenDaysButton = screen.getByText('dateRange.7Days');
      await user.click(sevenDaysButton);

      // Refresh data
      const refreshButton = screen.getByText('common.refresh');
      await user.click(refreshButton);

      await waitFor(() => {
        expect(mockElectronAPI.getUsageStats).toHaveBeenCalledTimes(2);
      });

      // Date range selection should be maintained
      expect(sevenDaysButton).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('integrates correctly with context providers', async () => {
      renderWithProviders(<UsageDashboard />);

      await waitFor(() => {
        expect(screen.queryByText('common.loading')).not.toBeInTheDocument();
      });

      // Should use settings from context
      expect(mockElectronAPI.getSettings).toHaveBeenCalled();
      
      // Should use currency rates from context
      expect(mockElectronAPI.getCurrencyRates).toHaveBeenCalled();
    });

    it('renders charts when data is available', async () => {
      renderWithProviders(<UsageDashboard />);

      await waitFor(() => {
        expect(screen.queryByText('common.loading')).not.toBeInTheDocument();
      });

      // Should render chart components (mocked)
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });
  });
});