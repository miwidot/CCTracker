import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
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
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
            <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-32"></div>
          </div>
          <div className="h-12 w-12 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {typeof value === 'number' && currency ? `${currency} ${value.toFixed(2)}` : value}
          </p>
          {trend && (
            <p className={`text-sm mt-1 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value).toFixed(1)}%
            </p>
          )}
        </div>
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
      </div>
    </div>
  );
};

interface DateRangePickerProps {
  startDate: Date;
  endDate: Date;
  onDateRangeChange: (start: Date, end: Date) => void;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onDateRangeChange,
}) => {
  const presetRanges = [
    { label: 'Last 7 days', days: 7 },
    { label: 'Last 30 days', days: 30 },
    { label: 'Last 90 days', days: 90 },
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
      <div className="flex gap-2 flex-wrap">
        {presetRanges.map((range) => (
          <button
            key={range.days}
            onClick={() => onDateRangeChange(subDays(new Date(), range.days), new Date())}
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
          onChange={(e) => onDateRangeChange(new Date(e.target.value), endDate)}
          className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
        <span className="text-gray-500">to</span>
        <input
          type="date"
          value={format(endDate, 'yyyy-MM-dd')}
          onChange={(e) => onDateRangeChange(startDate, new Date(e.target.value))}
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
  return (
    <div className="flex gap-2">
      <button
        onClick={() => onExport('csv')}
        disabled={isExporting || data.length === 0}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        <DocumentArrowDownIcon className="h-4 w-4" />
        Export CSV
      </button>
      <button
        onClick={() => onExport('json')}
        disabled={isExporting || data.length === 0}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        <DocumentArrowDownIcon className="h-4 w-4" />
        Export JSON
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
        <p>No sessions found for the selected date range</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Session ID
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Model
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Duration
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Messages
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Tokens
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Cost
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
                {Math.round((new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / (1000 * 60))} min
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {session.message_count}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {session.total_tokens.toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {currency} {session.total_cost.toFixed(4)}
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
  const { usageData, sessionStats, isLoading, lastUpdated, refreshData } = useUsageData();
  const { settings } = useSettings();
  
  // State for date range filtering
  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 30),
    end: new Date(),
  });
  
  // State for export functionality
  const [isExporting, setIsExporting] = useState(false);
  
  // State for real-time updates
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter data based on date range
  const filteredData = useMemo(() => {
    return usageData.filter(entry => {
      const entryDate = new Date(entry.timestamp);
      return isWithinInterval(entryDate, {
        start: startOfDay(dateRange.start),
        end: endOfDay(dateRange.end),
      });
    });
  }, [usageData, dateRange]);

  // Filter sessions based on date range
  const filteredSessions = useMemo(() => {
    return sessionStats.filter(session => {
      const sessionDate = new Date(session.start_time);
      return isWithinInterval(sessionDate, {
        start: startOfDay(dateRange.start),
        end: endOfDay(dateRange.end),
      });
    });
  }, [sessionStats, dateRange]);

  // Calculate overview metrics
  const overviewMetrics = useMemo(() => {
    const totalCost = filteredData.reduce((sum, entry) => sum + entry.cost_usd, 0);
    const totalTokens = filteredData.reduce((sum, entry) => sum + entry.total_tokens, 0);
    const sessionsCount = filteredSessions.length;
    const avgCostPerSession = sessionsCount > 0 ? totalCost / sessionsCount : 0;

    // Calculate trends (comparison with previous period)
    const periodDays = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    const previousPeriodStart = subDays(dateRange.start, periodDays);
    const previousPeriodEnd = dateRange.start;

    const previousPeriodData = usageData.filter(entry => {
      const entryDate = new Date(entry.timestamp);
      return isWithinInterval(entryDate, {
        start: previousPeriodStart,
        end: previousPeriodEnd,
      });
    });

    const previousTotalCost = previousPeriodData.reduce((sum, entry) => sum + entry.cost_usd, 0);
    const costTrend = previousTotalCost > 0 ? ((totalCost - previousTotalCost) / previousTotalCost) * 100 : 0;

    return {
      totalCost,
      totalTokens,
      sessionsCount,
      avgCostPerSession,
      costTrend,
    };
  }, [filteredData, filteredSessions, dateRange, usageData]);

  // Prepare chart data
  const chartData = useMemo(() => {
    // Cost over time (daily aggregation)
    const costOverTime = filteredData.reduce((acc, entry) => {
      const date = format(new Date(entry.timestamp), 'yyyy-MM-dd');
      acc[date] = (acc[date] || 0) + entry.cost_usd;
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
    const costByModel = filteredData.reduce((acc, entry) => {
      acc[entry.model] = (acc[entry.model] || 0) + entry.cost_usd;
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
  }, [filteredData]);

  // Currency conversion
  const currencySymbol = useMemo(() => {
    const symbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
      CNY: '¥',
      MYR: 'RM',
    };
    return symbols[settings.currency] || '$';
  }, [settings.currency]);

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Usage Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {lastUpdated && `Last updated: ${format(lastUpdated, 'MMM dd, yyyy HH:mm:ss')}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowPathIcon className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
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
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Date Range</h3>
        </div>
        <DateRangePicker
          startDate={dateRange.start}
          endDate={dateRange.end}
          onDateRangeChange={(start, end) => setDateRange({ start, end })}
        />
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <OverviewCard
          title="Total Cost"
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
          title="Total Tokens"
          value={overviewMetrics.totalTokens.toLocaleString()}
          icon={CpuChipIcon}
          isLoading={isLoading}
        />
        <OverviewCard
          title="Sessions"
          value={overviewMetrics.sessionsCount}
          icon={ChatBubbleLeftRightIcon}
          isLoading={isLoading}
        />
        <OverviewCard
          title="Avg Cost/Session"
          value={overviewMetrics.avgCostPerSession}
          icon={ChartBarIcon}
          isLoading={isLoading}
          currency={currencySymbol}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Over Time Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Cost Over Time
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
                  tickFormatter={(value) => `${currencySymbol}${value.toFixed(2)}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${currencySymbol}${value.toFixed(4)}`, 'Cost']}
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
                <p>No cost data available for selected period</p>
              </div>
            </div>
          )}
        </div>

        {/* Token Usage by Model Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Token Usage by Model
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
                  formatter={(value: number) => [value.toLocaleString(), 'Tokens']}
                />
                <Bar dataKey="tokens" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <CpuChipIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No token data available for selected period</p>
              </div>
            </div>
          )}
        </div>

        {/* Cost Distribution by Model */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Cost Distribution by Model
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
                  formatter={(value: number) => [`${currencySymbol}${value.toFixed(4)}`, 'Cost']}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <CurrencyDollarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No cost distribution data available</p>
              </div>
            </div>
          )}
        </div>

        {/* Recent Sessions Table */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Sessions
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
              No usage data found for the selected date range. Try adjusting the date range or check if monitoring is enabled.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsageDashboard;