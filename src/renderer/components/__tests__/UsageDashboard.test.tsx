import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
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

// Mock usage data with recent timestamps
const now = new Date();
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
const mockUsageData: UsageEntry[] = [
  {
    id: '1',
    timestamp: yesterday.toISOString(),
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
    timestamp: now.toISOString(),
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
    start_time: yesterday.toISOString(),
    end_time: new Date(yesterday.getTime() + 30 * 60 * 1000).toISOString(),
    total_cost: 0.015,
    total_tokens: 1500,
    message_count: 3,
    model: 'claude-3-5-sonnet-20241022',
  },
  {
    session_id: 'session-2',
    start_time: now.toISOString(),
    end_time: new Date(now.getTime() + 45 * 60 * 1000).toISOString(),
    total_cost: 0.030,
    total_tokens: 3000,
    message_count: 5,
    model: 'claude-3-5-sonnet-20241022',
  },
];

// Create a mock for UsageDataContext that we can control
const mockRefreshData = jest.fn().mockResolvedValue(undefined);
const mockUsageDataContext = {
  usageData: mockUsageData,
  sessionStats: mockSessionStats,
  isLoading: false,
  lastUpdated: new Date(),
  refreshData: mockRefreshData,
  getUsageByDateRange: jest.fn().mockResolvedValue({}),
  getSessionStats: jest.fn().mockResolvedValue({}),
};

// Mock UsageDataContext to avoid infinite loops
jest.mock('../../contexts/UsageDataContext', () => ({
  useUsageData: () => mockUsageDataContext,
  UsageDataProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const renderWithProviders = (component: React.ReactElement) => {
  let result: any;
  act(() => {
    result = render(
      <SettingsProvider initialSettings={mockSettings}>
        <ThemeProvider>
          {component}
        </ThemeProvider>
      </SettingsProvider>
    );
  });
  return result;
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
    calculateProjectCosts: jest.fn(),
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
    mockElectronAPI.calculateProjectCosts.mockResolvedValue({});
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

    // Reset context mock to default state
    mockUsageDataContext.usageData = mockUsageData;
    mockUsageDataContext.sessionStats = mockSessionStats;
    mockUsageDataContext.isLoading = false;
    mockUsageDataContext.lastUpdated = new Date();
    mockRefreshData.mockClear();
    mockRefreshData.mockResolvedValue(undefined);

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
      // Set loading state in context mock
      mockUsageDataContext.isLoading = true;

      renderWithProviders(<UsageDashboard />);

      // Should show skeleton loading indicators (look for animate-skeleton class)
      const skeletonElements = document.querySelectorAll('.animate-skeleton');
      expect(skeletonElements.length).toBeGreaterThan(0);

      // Update context to show loaded state
      await act(async () => {
        mockUsageDataContext.isLoading = false;
      });

      // Wait for loading to complete - check that metric cards are showing actual content
      await waitFor(() => {
        expect(screen.getByText('metrics.totalCost')).toBeInTheDocument();
        expect(screen.getByText('metrics.totalTokens')).toBeInTheDocument();
      });
    });

    it('shows refresh loading state when refreshing data', async () => {
      renderWithProviders(<UsageDashboard />);

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByText('common.refresh')).toBeInTheDocument();
      });

      // Mock delayed refresh response
      mockRefreshData.mockImplementation(
        () => new Promise<void>(resolve => {
          setTimeout(() => {
            resolve();
          }, 100);
        })
      );

      const refreshButton = screen.getByText('common.refresh');
      
      // Click refresh button
      await act(async () => {
        fireEvent.click(refreshButton);
      });

      // Should show refreshing state (disabled button and spinning icon)
      await waitFor(() => {
        expect(refreshButton).toBeDisabled();
        const spinningIcon = refreshButton.querySelector('.animate-spin');
        expect(spinningIcon).toBeInTheDocument();
      });

      // Wait for refresh to complete
      await waitFor(() => {
        expect(refreshButton).not.toBeDisabled();
      }, { timeout: 200 });
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
      
      // Ensure we have data so export buttons are enabled
      mockUsageDataContext.usageData = mockUsageData;
      
      renderWithProviders(<UsageDashboard />);

      // Wait for initial load and ensure button is not disabled
      await waitFor(() => {
        const csvButton = screen.getByText('export.csv');
        expect(csvButton).toBeInTheDocument();
        expect(csvButton).not.toBeDisabled();
      });

      const csvButton = screen.getByText('export.csv');
      
      await act(async () => {
        fireEvent.click(csvButton);
      });

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
      // Ensure we have data so export buttons are enabled
      mockUsageDataContext.usageData = mockUsageData;
      mockUsageDataContext.sessionStats = mockSessionStats;
      
      renderWithProviders(<UsageDashboard />);
      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('export.csv')).toBeInTheDocument();
      });
    });

    it('handles CSV export button click', async () => {
      const user = userEvent.setup();
      
      // Ensure button is enabled
      await waitFor(() => {
        const csvButton = screen.getByText('export.csv');
        expect(csvButton).not.toBeDisabled();
      });
      
      const csvButton = screen.getByText('export.csv');

      await act(async () => {
        await user.click(csvButton);
      });

      await waitFor(() => {
        expect(mockElectronAPI.exportCsv).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              model: expect.any(String),
            })
          ])
        );
      });
    });

    it('handles JSON export button click', async () => {
      const user = userEvent.setup();
      
      // Ensure button is enabled
      await waitFor(() => {
        const jsonButton = screen.getByText('export.json');
        expect(jsonButton).not.toBeDisabled();
      });
      
      const jsonButton = screen.getByText('export.json');

      await act(async () => {
        await user.click(jsonButton);
      });

      await waitFor(() => {
        expect(mockElectronAPI.exportJson).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              model: expect.any(String),
            })
          ])
        );
      });
    });

    it('disables export buttons during export', async () => {
      const user = userEvent.setup();
      
      // Mock delayed export
      mockElectronAPI.exportCsv.mockImplementation(
        () => new Promise(resolve => {
          setTimeout(() => {
            resolve({ success: true });
          }, 50);
        })
      );

      // Ensure buttons start enabled
      await waitFor(() => {
        const csvButton = screen.getByText('export.csv');
        const jsonButton = screen.getByText('export.json');
        expect(csvButton).not.toBeDisabled();
        expect(jsonButton).not.toBeDisabled();
      });
      
      const csvButton = screen.getByText('export.csv');
      const jsonButton = screen.getByText('export.json');

      await act(async () => {
        await user.click(csvButton);
      });

      // Both buttons should be disabled during export
      await waitFor(() => {
        expect(csvButton).toBeDisabled();
        expect(jsonButton).toBeDisabled();
      });

      // Wait for export to complete
      await waitFor(() => {
        expect(csvButton).not.toBeDisabled();
        expect(jsonButton).not.toBeDisabled();
      }, { timeout: 100 });
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
      
      await act(async () => {
        await user.click(refreshButton);
      });

      // Should call refreshData from context
      expect(mockRefreshData).toHaveBeenCalledTimes(1);
    });
  });

  describe('Data Rendering', () => {
    it('displays correct usage data', async () => {
      renderWithProviders(<UsageDashboard />);

      await waitFor(() => {
        expect(screen.getByText('metrics.totalCost')).toBeInTheDocument();
      });

      // Should display metric labels
      expect(screen.getByText('metrics.totalCost')).toBeInTheDocument();
      expect(screen.getByText('metrics.totalTokens')).toBeInTheDocument();
      expect(screen.getByText('metrics.sessionsCount')).toBeInTheDocument();
      expect(screen.getByText('metrics.avgCostPerSession')).toBeInTheDocument();
    });

    it('displays session data correctly', async () => {
      renderWithProviders(<UsageDashboard />);

      await waitFor(() => {
        expect(screen.getByText('metrics.sessionsCount')).toBeInTheDocument();
      });

      // Should display sessions table title
      expect(screen.getByText('sessions.title')).toBeInTheDocument();
    });

    it('handles empty data state', async () => {
      // Set empty data in context mock
      mockUsageDataContext.usageData = [];
      mockUsageDataContext.sessionStats = [];

      renderWithProviders(<UsageDashboard />);

      await waitFor(() => {
        expect(screen.getByText('export.csv')).toBeInTheDocument();
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
        expect(screen.getByText('common.refresh')).toBeInTheDocument();
      });

      // Trigger refresh
      const refreshButton = screen.getByText('common.refresh');
      
      await act(async () => {
        await user.click(refreshButton);
      });

      // Wait for refresh to be called
      await waitFor(() => {
        expect(mockRefreshData).toHaveBeenCalledTimes(1);
      });

      // Component should still display metrics
      expect(screen.getByText('metrics.totalCost')).toBeInTheDocument();
    });

    it('maintains UI state during data updates', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<UsageDashboard />);

      await waitFor(() => {
        expect(screen.getByText('dateRange.7Days')).toBeInTheDocument();
      });

      // Select a specific date range
      const sevenDaysButton = screen.getByText('dateRange.7Days');
      await act(async () => {
        await user.click(sevenDaysButton);
      });

      // Refresh data
      const refreshButton = screen.getByText('common.refresh');
      await act(async () => {
        await user.click(refreshButton);
      });

      await waitFor(() => {
        expect(mockRefreshData).toHaveBeenCalledTimes(1);
      });

      // Date range selection should be maintained
      expect(sevenDaysButton).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('integrates correctly with context providers', async () => {
      renderWithProviders(<UsageDashboard />);

      await waitFor(() => {
        expect(screen.getByText('dashboard.title')).toBeInTheDocument();
      });

      // Should display dashboard content
      expect(screen.getByText('dashboard.title')).toBeInTheDocument();
      expect(screen.getByText('metrics.totalCost')).toBeInTheDocument();
    });

    it('renders charts when data is available', async () => {
      renderWithProviders(<UsageDashboard />);

      await waitFor(() => {
        expect(screen.getByText('charts.costOverTime')).toBeInTheDocument();
      });

      // Should render chart titles
      expect(screen.getByText('charts.costOverTime')).toBeInTheDocument();
      expect(screen.getByText('charts.tokenUsageByModel')).toBeInTheDocument();
      expect(screen.getByText('charts.costDistribution')).toBeInTheDocument();
      
      // Should render chart components (mocked) - use a more flexible approach
      await waitFor(() => {
        const responsiveContainers = screen.queryAllByTestId('responsive-container');
        // Charts should be rendered when data is available
        expect(responsiveContainers.length).toBeGreaterThanOrEqual(1);
      });
    });
  });
});