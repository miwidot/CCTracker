import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';

// Utility function to format tokens in M format
const formatTokens = (tokens: number): string => {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(2)}M`;
  } else if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
};
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  CurrencyDollarIcon,
  CpuChipIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  DocumentArrowDownIcon,
  CalendarDaysIcon,
  ArrowPathIcon,
  ChartBarIcon,
  TableCellsIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useUsageData } from '../contexts/UsageDataContext';
import { useSettings } from '../contexts/SettingsContext';
import { useCurrency } from '../hooks/useCurrency';
import { useTranslation } from '../hooks/useTranslation';
import type { UsageEntry, SessionStats } from '@shared/types';

// Sub-components
interface OverviewCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  isLoading?: boolean;
  currency?: string;
}

const OverviewCard: React.FC<OverviewCardProps> = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  isLoading, 
  currency 
}) => {
  if (isLoading) {
    return (
      <div className="bg-[var(--bg-primary)] p-6 rounded-lg shadow-sm border border-[var(--border-color)] animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 bg-[var(--bg-tertiary)] rounded w-24"></div>
            <div className="h-8 bg-[var(--bg-tertiary)] rounded w-32"></div>
          </div>
          <div className="h-12 w-12 bg-[var(--bg-tertiary)] rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-primary)] p-6 rounded-lg shadow-sm border border-[var(--border-color)] hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--text-secondary)]">{title}</p>
          <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
            {typeof value === 'number' && currency ? `${currency} ${value.toFixed(2)}` : value}
          </p>
          {trend && (
            <p className={`text-sm mt-1 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value).toFixed(1)}%
            </p>
          )}
        </div>
        <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg">
          <Icon className="h-6 w-6 text-[var(--text-accent)]" />
        </div>
      </div>
    </div>
  );
};

interface DateRangePickerProps {
  startDate: Date;
  endDate: Date;
  onDateRangeChange: (start: Date | null, end: Date | null) => void;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onDateRangeChange,
}) => {
  const { t } = useTranslation();
  const presetRanges = [
    { label: t('dateRange.today'), days: 0 },
    { label: t('dateRange.7Days'), days: 7 },
    { label: t('dateRange.30Days'), days: 30 },
    { label: t('dateRange.all'), days: null },
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
      <div className="flex gap-2 flex-wrap">
        {presetRanges.map((range) => (
          <button
            key={range.label}
            onClick={() => {
              console.log(`BUTTON CLICKED: ${range.label} (${range.days} days)`);
              if (range.days === null) {
                // ALL option - will be handled by parent component
                onDateRangeChange(null, null); // Signal to use earliest data
              } else if (range.days === 0) {
                // Today option - show only today's data
                const start = startOfDay(new Date());
                const end = endOfDay(new Date());
                console.log(`TODAY: ${start} to ${end}`);
                onDateRangeChange(start, end);
              } else {
                const start = startOfDay(subDays(new Date(), range.days));
                const end = endOfDay(new Date());
                console.log(`${range.days} DAYS: ${start} to ${end}`);
                onDateRangeChange(start, end);
              }
            }}
            className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {range.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2 items-center">
        <input
          type="date"
          value={format(startDate, 'yyyy-MM-dd')}
          onChange={(e) => onDateRangeChange(startOfDay(new Date(e.target.value)), endDate)}
          className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
        <span className="text-gray-500">{t('dateRange.to')}</span>
        <input
          type="date"
          value={format(endDate, 'yyyy-MM-dd')}
          onChange={(e) => onDateRangeChange(startDate, endOfDay(new Date(e.target.value)))}
          className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
      </div>
    </div>
  );
};

interface ExportButtonsProps {
  data: UsageEntry[];
  onExport: (format: 'csv' | 'json') => void;
  isExporting: boolean;
}

const ExportButtons: React.FC<ExportButtonsProps> = ({ data, onExport, isExporting }) => {
  const { t } = useTranslation();
  return (
    <div className="flex gap-2">
      <button
        onClick={() => onExport('csv')}
        disabled={isExporting || data.length === 0}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        <DocumentArrowDownIcon className="h-4 w-4" />
        {t('export.csv')}
      </button>
      <button
        onClick={() => onExport('json')}
        disabled={isExporting || data.length === 0}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        <DocumentArrowDownIcon className="h-4 w-4" />
        {t('export.json')}
      </button>
    </div>
  );
};

interface SessionTableProps {
  sessions: SessionStats[];
  currency: string;
  isLoading: boolean;
}

const SessionTable: React.FC<SessionTableProps> = ({ sessions, currency, isLoading }) => {
  const { convertFromUSD, formatCurrency } = useCurrency();
  const { t } = useTranslation();
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <TableCellsIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>{t('warnings.noSessionsFound')}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t('sessions.sessionId')}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t('sessions.model')}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t('sessions.duration')}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t('sessions.messages')}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t('sessions.tokens')}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t('sessions.cost')}
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {sessions.slice(0, 10).map((session) => (
            <tr key={session.session_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                {session.session_id.substring(0, 8)}...
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {session.model}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {Math.round((new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / (1000 * 60))} {t('ui.minutes')}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {session.message_count}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {session.total_tokens.toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {formatCurrency(session.total_cost)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Main component
const UsageDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { usageData, sessionStats, isLoading, lastUpdated, refreshData } = useUsageData();
  const { settings } = useSettings();
  const { convertFromUSD, formatCurrency, formatCurrencyDetailed, getCurrencySymbol } = useCurrency();
  
  // State for centralized project costs
  const [projectCosts, setProjectCosts] = useState<Record<string, { costUSD: number; costConverted: number; formatted: string }>>({});
  
  // State for date range filtering
  const [dateRange, setDateRange] = useState({
    start: startOfDay(subDays(new Date(), 30)),
    end: endOfDay(new Date()),
  });
  
  // Force re-render when date range changes
  const [forceUpdate, setForceUpdate] = useState(0);
  
  // Calculate earliest data timestamp for ALL option
  const earliestDataDate = useMemo(() => {
    if (usageData.length === 0) return new Date();
    return new Date(Math.min(...usageData.map((entry: any) => new Date(entry.timestamp).getTime())));
  }, [usageData]);
  
  // State for export functionality
  const [isExporting, setIsExporting] = useState(false);
  
  // State for real-time updates
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter data based on date range
  const filteredData = useMemo(() => {
    const filtered = usageData.filter(entry => {
      const entryDate = new Date(entry.timestamp);
      const isInRange = isWithinInterval(entryDate, {
        start: startOfDay(dateRange.start),
        end: endOfDay(dateRange.end),
      });
      
      return isInRange;
    });
    
    console.log(`📊 FILTERED DATA: ${filtered.length}/${usageData.length} entries for range ${dateRange.start.toDateString()} to ${dateRange.end.toDateString()}`);
    if (filtered.length > 0) {
      console.log(`📅 Date span: ${new Date(filtered[0].timestamp).toDateString()} to ${new Date(filtered[filtered.length - 1].timestamp).toDateString()}`);
    }
    
    return filtered;
  }, [usageData, dateRange]);

  // Calculate unique sessions from filtered usage data
  const uniqueSessionsInRange = useMemo(() => {
    const sessionIds = new Set(filteredData.map(entry => entry.session_id));
    return Array.from(sessionIds);
  }, [filteredData]);

  // Filter sessions based on date range (for session table)
  const filteredSessions = useMemo(() => {
    return sessionStats.filter(session => {
      const sessionDate = new Date(session.start_time);
      return isWithinInterval(sessionDate, {
        start: startOfDay(dateRange.start),
        end: endOfDay(dateRange.end),
      });
    });
  }, [sessionStats, dateRange]);

  // Calculate overview metrics using centralized calculator
  const [overviewMetrics, setOverviewMetrics] = useState({
    totalCost: 0,
    totalTokens: 0,
    sessionsCount: 0,
    avgCostPerSession: 0,
    costTrend: 0,
  });

  useEffect(() => {
    const calculateMetrics = async () => {
      // Calculate trends (comparison with previous period) with normalized dates
      const normalizedStart = startOfDay(dateRange.start);
      const normalizedEnd = endOfDay(dateRange.end);
      const periodDays = Math.ceil((normalizedEnd.getTime() - normalizedStart.getTime()) / (1000 * 60 * 60 * 24));
      const previousPeriodStart = startOfDay(subDays(normalizedStart, periodDays));
      const previousPeriodEnd = normalizedStart;

      const previousPeriodData = usageData.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        return isWithinInterval(entryDate, {
          start: previousPeriodStart,
          end: previousPeriodEnd,
        });
      });

      try {
        // Use centralized cost calculator with currency support
        const currencies = await window.electronAPI.getCurrencyRates();
        const metrics = await window.electronAPI.calculateDashboardMetricsWithCurrency(
          filteredData, 
          previousPeriodData, 
          settings.currency,
          currencies
        );
        
        console.log(`🔍 OVERVIEW METRICS (CENTRALIZED): ${filteredData.length} entries, Sessions: ${metrics.sessionsCount}`);
        console.log(`💰 Total Cost: ${metrics.formattedTotalCost}, Avg/Session: ${metrics.formattedAvgCost}`);
        console.log(`📅 Date Range: ${dateRange.start.toISOString()} to ${dateRange.end.toISOString()}`);
        
        setOverviewMetrics({
          totalCost: metrics.totalCost,
          totalTokens: metrics.totalTokens,
          sessionsCount: metrics.sessionsCount,
          avgCostPerSession: metrics.avgCostPerSession,
          costTrend: metrics.costTrend,
        });
      } catch (error) {
        console.error('Failed to calculate dashboard metrics with centralized service:', error);
        // Fallback to basic calculations using centralized service
        try {
          const currencies = await window.electronAPI.getCurrencyRates();
          const totalCostUSD = await window.electronAPI.calculateTotalCost(filteredData);
          const totalCost = convertFromUSD(totalCostUSD);
          const fallbackSessionsCount = uniqueSessionsInRange.length;
          
          setOverviewMetrics({
            totalCost,
            totalTokens: filteredData.reduce((sum, entry) => sum + entry.total_tokens, 0),
            sessionsCount: fallbackSessionsCount,
            avgCostPerSession: fallbackSessionsCount > 0 ? totalCost / fallbackSessionsCount : 0,
            costTrend: 0,
          });
        } catch (fallbackError) {
          console.error('Fallback calculation also failed:', fallbackError);
        }
      }
    };

    calculateMetrics();
  }, [filteredData, uniqueSessionsInRange, dateRange, usageData, forceUpdate]);

  // Calculate project costs with centralized service
  useEffect(() => {
    const calculateProjectCosts = async () => {
      if (filteredData.length === 0) {
        setProjectCosts({});
        return;
      }
      
      try {
        const currencies = await window.electronAPI.getCurrencyRates();
        const costs = await window.electronAPI.calculateProjectCosts(filteredData, settings.currency, currencies);
        setProjectCosts(costs);
        
        // Debug project calculations
        console.log(`🏗️ PROJECT COSTS (CENTRALIZED): ${Object.keys(costs).length} projects calculated`);
        console.log(`📊 Project costs:`, costs);
      } catch (error) {
        console.error('Failed to calculate project costs:', error);
        setProjectCosts({});
      }
    };
    
    calculateProjectCosts();
  }, [filteredData, settings.currency]); // Removed formatCurrencyDetailed to prevent infinite loop

  // Prepare chart data
  const chartData = useMemo(() => {
    // Cost over time (daily aggregation)
    const costOverTime = filteredData.reduce((acc, entry) => {
      const date = format(new Date(entry.timestamp), 'yyyy-MM-dd');
      acc[date] = (acc[date] || 0) + convertFromUSD(entry.cost_usd);
      return acc;
    }, {} as Record<string, number>);

    const costChartData = Object.entries(costOverTime)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, cost]) => ({ date, cost }));

    // Token usage by model
    const tokensByModel = filteredData.reduce((acc, entry) => {
      acc[entry.model] = (acc[entry.model] || 0) + entry.total_tokens;
      return acc;
    }, {} as Record<string, number>);

    const tokenChartData = Object.entries(tokensByModel).map(([model, tokens]) => ({
      model,
      tokens,
    }));

    // Cost by model (for pie chart)
    const costByModel = filteredData
      .filter(entry => !entry.model.includes('<synthetic>'))
      .reduce((acc, entry) => {
        acc[entry.model] = (acc[entry.model] || 0) + convertFromUSD(entry.cost_usd);
        return acc;
      }, {} as Record<string, number>);

    const costPieData = Object.entries(costByModel).map(([model, cost]) => ({
      name: model,
      value: cost,
    }));

    return {
      costOverTime: costChartData,
      tokensByModel: tokenChartData,
      costByModel: costPieData,
    };
  }, [filteredData, convertFromUSD]);

  // Get currency symbol from hook
  const currencySymbol = getCurrencySymbol();

  // Export functionality
  const handleExport = useCallback(async (format: 'csv' | 'json') => {
    setIsExporting(true);
    try {
      const result = format === 'csv' 
        ? await window.electronAPI.exportCsv(filteredData)
        : await window.electronAPI.exportJson(filteredData);
      
      // Show success message or handle result
      console.log(`Export ${format.toUpperCase()} successful:`, result);
    } catch (error) {
      console.error(`Export ${format.toUpperCase()} failed:`, error);
    } finally {
      setIsExporting(false);
    }
  }, [filteredData]);

  // Refresh data
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshData]);

  // Chart colors
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('dashboard.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {lastUpdated && `${t('common.lastUpdated')}: ${format(lastUpdated, 'MMM dd, yyyy HH:mm:ss')}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowPathIcon className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </button>
          <ExportButtons
            data={filteredData}
            onExport={handleExport}
            isExporting={isExporting}
          />
        </div>
      </div>

      {/* Date Range Picker */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDaysIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('dateRange.title')}</h3>
        </div>
        <DateRangePicker
          startDate={dateRange.start}
          endDate={dateRange.end}
          onDateRangeChange={(start, end) => {
            if (start === null && end === null) {
              // ALL option - use earliest data date
              const allStart = startOfDay(earliestDataDate);
              const allEnd = endOfDay(new Date());
              console.log(`ALL OPTION: ${allStart} to ${allEnd}`);
              setDateRange({ start: allStart, end: allEnd });
            } else if (start && end) {
              console.log(`onDateRangeChange called: ${start} to ${end}`);
              setDateRange({ start, end });
            }
            setForceUpdate(prev => prev + 1);
            console.log(`State updated, forceUpdate: ${forceUpdate + 1}`);
          }}
        />
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <OverviewCard
          title={t('metrics.totalCost')}
          value={overviewMetrics.totalCost}
          icon={CurrencyDollarIcon}
          trend={{
            value: overviewMetrics.costTrend,
            isPositive: overviewMetrics.costTrend >= 0,
          }}
          isLoading={isLoading}
          currency={currencySymbol}
        />
        <OverviewCard
          title={t('metrics.totalTokens')}
          value={formatTokens(overviewMetrics.totalTokens)}
          icon={CpuChipIcon}
          isLoading={isLoading}
        />
        <OverviewCard
          title={t('metrics.sessionsCount')}
          value={overviewMetrics.sessionsCount}
          icon={ChatBubbleLeftRightIcon}
          isLoading={isLoading}
        />
        <OverviewCard
          title={t('metrics.avgCostPerSession')}
          value={overviewMetrics.avgCostPerSession}
          icon={ChartBarIcon}
          isLoading={isLoading}
          currency={currencySymbol}
        />
      </div>

      {/* Token Breakdown and Model Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Token Breakdown */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('metrics.tokenBreakdown')}
          </h3>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('metrics.inputTokens')}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatTokens(filteredData.reduce((sum, entry) => sum + entry.input_tokens, 0))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('metrics.outputTokens')}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatTokens(filteredData.reduce((sum, entry) => sum + entry.output_tokens, 0))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('metrics.cacheWrite')}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatTokens(filteredData.reduce((sum, entry) => sum + ((entry as any).cache_creation_tokens || 0), 0))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('metrics.cacheRead')}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatTokens(filteredData.reduce((sum, entry) => sum + ((entry as any).cache_read_tokens || 0), 0))}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Per Model Overview */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('metrics.perModelOverview')}
          </h3>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {chartData.costByModel.slice(0, 3).map((modelData) => {
                const modelTokens = filteredData
                  .filter(entry => entry.model === modelData.name)
                  .reduce((sum, entry) => sum + entry.total_tokens, 0);
                return (
                  <div key={modelData.name} className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {modelData.name.replace('claude-', '').replace('-20241022', '').replace('-20250514', '')}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatCurrencyDetailed(modelData.value, 4)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTokens(modelTokens)} tokens
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top 5 Projects */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('metrics.topProjects')}
          </h3>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {Object.entries(projectCosts)
                .sort(([, a], [, b]) => b.costConverted - a.costConverted)
                .slice(0, 5)
                .map(([project, data], index) => (
                  <div key={project} className="flex justify-between items-center">
                    <div className="flex items-center">
                      <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full w-5 h-5 flex items-center justify-center mr-2">
                        {index + 1}
                      </span>
                      <span className="text-sm text-gray-900 dark:text-white truncate">
                        {project}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {data.formatted}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Over Time Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('charts.costOverTime')}
          </h3>
          {isLoading ? (
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          ) : chartData.costOverTime.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData.costOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6B7280"
                  fontSize={12}
                  tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                />
                <YAxis 
                  stroke="#6B7280"
                  fontSize={12}
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [formatCurrencyDetailed(value, 4), 'Cost']}
                  labelFormatter={(label) => format(new Date(label), 'MMM dd, yyyy')}
                />
                <Line
                  type="monotone"
                  dataKey="cost"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <ChartBarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{t('charts.noCostData')}</p>
              </div>
            </div>
          )}
        </div>

        {/* Token Usage by Model Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('charts.tokenUsageByModel')}
          </h3>
          {isLoading ? (
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          ) : chartData.tokensByModel.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.tokensByModel}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="model" 
                  stroke="#6B7280"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  stroke="#6B7280"
                  fontSize={12}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [value.toLocaleString(), t('businessIntelligence.tokens')]}
                />
                <Bar dataKey="tokens" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <CpuChipIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{t('charts.noTokenData')}</p>
              </div>
            </div>
          )}
        </div>

        {/* Cost Distribution by Model */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('charts.costDistribution')}
          </h3>
          {isLoading ? (
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          ) : chartData.costByModel.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.costByModel}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.costByModel.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [formatCurrencyDetailed(value, 4), 'Cost']}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <CurrencyDollarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{t('charts.noCostDistribution')}</p>
              </div>
            </div>
          )}
        </div>

        {/* Recent Sessions Table */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('sessions.title')}
          </h3>
          <SessionTable
            sessions={filteredSessions.sort((a, b) => 
              new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
            )}
            currency={currencySymbol}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Error/Warning Messages */}
      {!isLoading && filteredData.length === 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-2" />
            <p className="text-yellow-800 dark:text-yellow-200">
              {t('warnings.noDataFound')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsageDashboard;