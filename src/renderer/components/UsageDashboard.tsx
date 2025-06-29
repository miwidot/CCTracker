import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { formatTokens, cleanModelName } from '@shared/utils';
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
  // ClockIcon,
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
import { useChartTheme } from '../hooks/useChartTheme';
import type { UsageEntry, SessionStats } from '@shared/types';
import { log } from '@shared/utils/logger';

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
  icon: iconComponent, 
  trend, 
  isLoading, 
  currency 
}) => {
  if (isLoading === true) {
    return (
      <div className="bg-[var(--bg-primary)] p-6 rounded-lg shadow-sm border border-[var(--border-color)] card theme-transition">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 bg-[var(--bg-tertiary)] rounded w-24 animate-skeleton" />
            <div className="h-8 bg-[var(--bg-tertiary)] rounded w-32 animate-skeleton animate-delay-100" />
          </div>
          <div className="h-12 w-12 bg-[var(--bg-tertiary)] rounded-lg animate-skeleton animate-delay-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-primary)] p-6 rounded-lg shadow-sm border border-[var(--border-color)] card interactive theme-transition animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="animate-slide-right">
          <p className="text-sm font-medium text-[var(--text-secondary)] theme-transition">{title}</p>
          <p className="text-2xl font-bold text-[var(--text-primary)] mt-1 theme-transition">
            {typeof value === 'number' && currency != null ? `${currency} ${value.toFixed(2)}` : value}
          </p>
          {trend && (
            <p className={`text-sm mt-1 font-medium animate-slide-up animate-delay-100 theme-transition ${trend.isPositive ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value).toFixed(1)}%
            </p>
          )}
        </div>
        <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg interactive-scale theme-transition animate-slide-left animate-delay-150">
          {React.createElement(iconComponent, { className: "h-6 w-6 text-[var(--text-accent)] theme-transition" })}
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
              if (range.days === null) {
                // ALL option - will be handled by parent component
                onDateRangeChange(null, null); // Signal to use earliest data
              } else if (range.days === 0) {
                // Today option - show only today's data
                const start = startOfDay(new Date());
                const end = endOfDay(new Date());
                onDateRangeChange(start, end);
              } else {
                const start = startOfDay(subDays(new Date(), range.days));
                const end = endOfDay(new Date());
                onDateRangeChange(start, end);
              }
            }}
            className="btn interactive-bounce px-3 py-1 text-sm bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-md hover:bg-[var(--color-hover)] theme-transition"
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
          className="px-3 py-1 text-sm border border-[var(--border-color)] rounded-md bg-[var(--bg-primary)] text-[var(--text-primary)]"
        />
        <span className="text-[var(--text-secondary)]">{t('dateRange.to')}</span>
        <input
          type="date"
          value={format(endDate, 'yyyy-MM-dd')}
          onChange={(e) => onDateRangeChange(startDate, endOfDay(new Date(e.target.value)))}
          className="px-3 py-1 text-sm border border-[var(--border-color)] rounded-md bg-[var(--bg-primary)] text-[var(--text-primary)]"
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
        className="btn btn-primary interactive-scale flex items-center gap-2 px-3 py-2 text-sm bg-[var(--color-success)] text-white rounded-md hover:bg-[var(--color-success)]/80 disabled:bg-[var(--text-muted)] disabled:cursor-not-allowed theme-transition"
      >
        <DocumentArrowDownIcon className="h-4 w-4" />
        {t('export.csv')}
      </button>
      <button
        onClick={() => onExport('json')}
        disabled={isExporting || data.length === 0}
        className="btn btn-primary interactive-scale flex items-center gap-2 px-3 py-2 text-sm bg-[var(--color-primary)] text-white rounded-md hover:bg-[var(--color-primary)]/80 disabled:bg-[var(--text-muted)] disabled:cursor-not-allowed theme-transition"
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

const SessionTable: React.FC<SessionTableProps> = ({ sessions, currency: _currency, isLoading }) => {
  const { convertFromUSD: _convertFromUSD, formatCurrency } = useCurrency();
  const { t } = useTranslation();
  if (isLoading) {
    return (
      <div className="space-y-2">
        {['session-sk-1', 'session-sk-2', 'session-sk-3', 'session-sk-4', 'session-sk-5'].map((key) => (
          <div key={key} className="h-12 bg-[var(--bg-skeleton)] rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--text-secondary)]">
        <TableCellsIcon className="h-12 w-12 mx-auto mb-2 opacity-50 text-[var(--text-muted)]" />
        <p>{t('warnings.noSessionsFound')}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-[var(--border-color)]">
        <thead className="bg-[var(--bg-secondary)]">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
              {t('sessions.sessionId')}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
              {t('sessions.model')}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
              {t('sessions.duration')}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
              {t('sessions.messages')}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
              {t('sessions.tokens')}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
              {t('sessions.cost')}
            </th>
          </tr>
        </thead>
        <tbody className="bg-[var(--bg-primary)] divide-y divide-[var(--border-color)]">
          {sessions.slice(0, 10).map((session) => (
            <tr key={session.session_id} className="hover:bg-[var(--color-hover)]">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-[var(--text-primary)]">
                {session.session_id.substring(0, 8)}...
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">
                {session.model}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">
                {Math.round((new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / (1000 * 60))} {t('ui.minutes')}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">
                {session.message_count}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">
                {session.total_tokens.toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">
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
  const chartTheme = useChartTheme();
  // Chart CSS variables available if needed
  // const chartCSSVars = getChartCSSVariables();
  
  // State for centralized project costs
  const [projectCosts, setProjectCosts] = useState<Record<string, { costUSD: number; costConverted: number; formatted: string }>>({});
  
  // State for date range filtering - default to today
  const [dateRange, setDateRange] = useState({
    start: startOfDay(new Date()),
    end: endOfDay(new Date()),
  });
  
  // Force re-render when date range changes
  const [forceUpdate, setForceUpdate] = useState(0);
  
  // Calculate earliest data timestamp for ALL option
  const earliestDataDate = useMemo(() => {
    if (usageData.length === 0) return new Date();
    return new Date(Math.min(...usageData.map((entry: UsageEntry) => new Date(entry.timestamp).getTime())));
  }, [usageData]);
  
  // State for export functionality
  const [isExporting, setIsExporting] = useState(false);
  
  // State for real-time updates
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // State for cost chart view type
  const [costChartView, setCostChartView] = useState<'daily' | 'cumulative'>('daily');

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
        const _currencies = await window.electronAPI.getCurrencyRates();
        const metrics = await window.electronAPI.calculateDashboardMetricsWithCurrency(
          filteredData, 
          previousPeriodData, 
          settings.currency,
          _currencies
        );
        
        
        setOverviewMetrics({
          totalCost: metrics.totalCost,
          totalTokens: metrics.totalTokens,
          sessionsCount: metrics.sessionsCount,
          avgCostPerSession: metrics.avgCostPerSession,
          costTrend: metrics.costTrend,
        });
      } catch (error) {
        log.component.error('UsageDashboard', error as Error);
        // Fallback to basic calculations using centralized service
        try {
          const _currenciesFallback = await window.electronAPI.getCurrencyRates();
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
          log.component.error('UsageDashboard', fallbackError as Error);
        }
      }
    };

    void calculateMetrics();
  }, [filteredData, uniqueSessionsInRange, dateRange, usageData, forceUpdate, settings.currency, convertFromUSD]);

  // Calculate project costs with centralized service
  useEffect(() => {
    const calculateProjectCosts = async () => {
      if (filteredData.length === 0) {
        setProjectCosts({});
        return;
      }
      
      try {
        const _currenciesProject = await window.electronAPI.getCurrencyRates();
        const costs = await window.electronAPI.calculateProjectCosts(filteredData, settings.currency, _currenciesProject);
        setProjectCosts(costs);
        
      } catch (error) {
        log.component.error('UsageDashboard', error as Error);
        setProjectCosts({});
      }
    };
    
    void calculateProjectCosts();
  }, [filteredData, settings.currency]); // Removed formatCurrencyDetailed to prevent infinite loop

  // Prepare chart data
  const chartData = useMemo(() => {
    // Cost over time (daily aggregation with enhanced data)
    const dailyStats = filteredData.reduce((acc, entry) => {
      const date = format(new Date(entry.timestamp), 'yyyy-MM-dd');
      if (!acc[date]) {
        acc[date] = { cost: 0, sessions: new Set(), entries: 0 };
      }
      acc[date].cost += convertFromUSD(entry.cost_usd);
      if (entry.session_id) {
        acc[date].sessions.add(entry.session_id);
      }
      acc[date].entries += 1;
      return acc;
    }, {} as Record<string, { cost: number; sessions: Set<string>; entries: number }>);

    const costChartData = Object.entries(dailyStats)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, stats], index, array) => {
        // Calculate cumulative cost
        const cumulativeCost = array
          .slice(0, index + 1)
          .reduce((sum, [, s]) => sum + s.cost, 0);
        
        // Calculate 7-day moving average
        const startIndex = Math.max(0, index - 6);
        const recentDays = array.slice(startIndex, index + 1);
        const avgCost = recentDays.reduce((sum, [, s]) => sum + s.cost, 0) / recentDays.length;
        
        return {
          date,
          dailyCost: stats.cost,
          cumulativeCost,
          avgCost,
          sessions: stats.sessions.size,
          entries: stats.entries,
          costPerSession: stats.sessions.size > 0 ? stats.cost / stats.sessions.size : 0,
        };
      });

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
      const _result = format === 'csv' 
        ? await window.electronAPI.exportCsv(filteredData)
        : await window.electronAPI.exportJson(filteredData);
      
      // Export completed successfully
    } catch (_error) {
      // Export failed - error is handled by the main process
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

  // Chart colors from theme
  const _COLORS = chartTheme.dataColors;

  return (
    <div className="space-y-6 p-6 theme-transition">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fade-in">
        <div className="animate-slide-right">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] theme-transition">{t('dashboard.title')}</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1 theme-transition">
            {lastUpdated && `${t('common.lastUpdated')}: ${format(lastUpdated, 'MMM dd, yyyy HH:mm:ss')}`}
          </p>
        </div>
        <div className="flex gap-2 animate-slide-left animate-delay-200">
          <button
            onClick={() => void handleRefresh()}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-[var(--text-secondary)] text-white rounded-md hover:bg-[var(--text-secondary)]/80 disabled:bg-[var(--text-muted)] disabled:cursor-not-allowed btn interactive-scale theme-transition"
          >
            <ArrowPathIcon className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </button>
          <ExportButtons
            data={filteredData}
            onExport={(format) => void handleExport(format)}
            isExporting={isExporting}
          />
        </div>
      </div>

      {/* Date Range Picker */}
      <div className="bg-[var(--bg-primary)] p-4 rounded-lg shadow-[var(--shadow-sm)] border border-[var(--border-color)] card theme-transition animate-slide-up animate-delay-100">
        <div className="flex items-center gap-2 mb-3 animate-slide-right">
          <CalendarDaysIcon className="h-5 w-5 text-[var(--text-secondary)] theme-transition" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)] theme-transition">{t('dateRange.title')}</h3>
        </div>
        <DateRangePicker
          startDate={dateRange.start}
          endDate={dateRange.end}
          onDateRangeChange={(start, end) => {
            if (start === null && end === null) {
              // ALL option - use earliest data date
              const allStart = startOfDay(earliestDataDate);
              const allEnd = endOfDay(new Date());
              setDateRange({ start: allStart, end: allEnd });
            } else if (start && end) {
              setDateRange({ start, end });
            }
            setForceUpdate(prev => prev + 1);
          }}
        />
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <div className="animate-slide-up animate-delay-200">
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
        </div>
        <div className="animate-slide-up animate-delay-300">
          <OverviewCard
            title={t('metrics.totalTokens')}
            value={formatTokens(overviewMetrics.totalTokens)}
            icon={CpuChipIcon}
            isLoading={isLoading}
          />
        </div>
        <div className="animate-slide-up animate-delay-400">
          <OverviewCard
            title={t('metrics.sessionsCount')}
            value={overviewMetrics.sessionsCount}
            icon={ChatBubbleLeftRightIcon}
            isLoading={isLoading}
          />
        </div>
        <div className="animate-slide-up animate-delay-500">
          <OverviewCard
            title={t('metrics.avgCostPerSession')}
            value={overviewMetrics.avgCostPerSession}
            icon={ChartBarIcon}
            isLoading={isLoading}
            currency={currencySymbol}
          />
        </div>
      </div>

      {/* Token Breakdown and Model Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Token Breakdown */}
        <div className="bg-[var(--bg-primary)] p-6 rounded-lg shadow-[var(--shadow-sm)] border border-[var(--border-color)] card theme-transition animate-slide-up animate-delay-600">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 theme-transition animate-slide-right">
            {t('metrics.tokenBreakdown')}
          </h3>
          {isLoading ? (
            <div className="space-y-3">
              {['token-sk-1', 'token-sk-2', 'token-sk-3', 'token-sk-4'].map((key, index) => (
                <div key={key} className="h-4 bg-[var(--bg-skeleton)] rounded animate-skeleton" style={{animationDelay: `${index * 100}ms`}} />
              ))}
            </div>
          ) : (
            <div className="space-y-3 stagger-children">
              <div className="flex justify-between">
                <span className="text-sm text-[var(--text-secondary)]">{t('metrics.inputTokens')}</span>
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {formatTokens(filteredData.reduce((sum, entry) => sum + entry.input_tokens, 0))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[var(--text-secondary)]">{t('metrics.outputTokens')}</span>
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {formatTokens(filteredData.reduce((sum, entry) => sum + entry.output_tokens, 0))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[var(--text-secondary)]">{t('metrics.cacheWrite')}</span>
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {formatTokens(filteredData.reduce((sum, entry) => sum + (entry.cache_creation_tokens ?? 0), 0))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[var(--text-secondary)]">{t('metrics.cacheRead')}</span>
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {formatTokens(filteredData.reduce((sum, entry) => sum + (entry.cache_read_tokens ?? 0), 0))}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Per Model Overview */}
        <div className="bg-[var(--bg-primary)] p-6 rounded-lg shadow-[var(--shadow-sm)] border border-[var(--border-color)] card theme-transition animate-slide-up animate-delay-700">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 theme-transition animate-slide-right">
            {t('metrics.perModelOverview')}
          </h3>
          {isLoading ? (
            <div className="space-y-3">
              {['model-sk-1', 'model-sk-2', 'model-sk-3'].map((key, index) => (
                <div key={key} className="h-12 bg-[var(--bg-skeleton)] rounded animate-skeleton" style={{animationDelay: `${index * 100}ms`}} />
              ))}
            </div>
          ) : (
            <div className="space-y-3 stagger-children">
              {chartData.costByModel.slice(0, 3).map((modelData, index) => {
                const modelTokens = filteredData
                  .filter(entry => entry.model === modelData.name)
                  .reduce((sum, entry) => sum + entry.total_tokens, 0);
                return (
                  <div key={modelData.name} className="p-3 bg-[var(--bg-tertiary)] rounded card interactive theme-transition animate-slide-up" style={{animationDelay: `${index * 100}ms`}}>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-[var(--text-primary)] truncate theme-transition">
                        {cleanModelName(modelData.name)}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)] theme-transition">
                        {formatCurrencyDetailed(modelData.value, 4)}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] theme-transition">
                      {formatTokens(modelTokens)} tokens
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top 5 Projects */}
        <div className="bg-[var(--bg-primary)] p-6 rounded-lg shadow-[var(--shadow-sm)] border border-[var(--border-color)]">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            {t('metrics.topProjects')}
          </h3>
          {isLoading ? (
            <div className="space-y-3">
              {['project-sk-1', 'project-sk-2', 'project-sk-3', 'project-sk-4', 'project-sk-5'].map((key) => (
                <div key={key} className="h-8 bg-[var(--bg-skeleton)] rounded animate-pulse" />
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
                      <span className="text-xs bg-[var(--bg-info)] text-[var(--text-accent)] rounded-full w-5 h-5 flex items-center justify-center mr-2">
                        {index + 1}
                      </span>
                      <span className="text-sm text-[var(--text-primary)] truncate">
                        {project.split('/').pop() ?? project}
                      </span>
                    </div>
                    <span className="text-xs text-[var(--text-secondary)]">
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
        {/* Enhanced Cost Analysis Chart */}
        <div className="bg-[var(--bg-primary)] p-6 rounded-lg shadow-[var(--shadow-sm)] border border-[var(--border-color)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              {costChartView === 'daily' ? 'Daily Spending' : 'Total Spending'}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setCostChartView('daily')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  costChartView === 'daily'
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--color-hover)]'
                }`}
              >
                Daily
              </button>
              <button
                onClick={() => setCostChartView('cumulative')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  costChartView === 'cumulative'
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--color-hover)]'
                }`}
              >
                Total
              </button>
            </div>
          </div>
          {isLoading ? (
            <div className="h-64 bg-[var(--bg-skeleton)] rounded animate-pulse" />
          ) : chartData.costOverTime.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData.costOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                  <XAxis 
                    dataKey="date" 
                    stroke={chartTheme.axis}
                    fontSize={12}
                    tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                  />
                  <YAxis 
                    stroke={chartTheme.axis}
                    fontSize={12}
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div style={{
                            backgroundColor: chartTheme.tooltipBackground,
                            border: `1px solid ${chartTheme.tooltipBorder}`,
                            borderRadius: '8px',
                            padding: '12px',
                            color: chartTheme.text,
                          }}>
                            <p className="font-medium">{format(new Date(label), 'MMM dd, yyyy')}</p>
                            <div className="mt-2 space-y-1">
                              <p>💰 Daily Cost: <span className="font-medium">{formatCurrencyDetailed(data.dailyCost, 4)}</span></p>
                              <p>📈 Total Spent: <span className="font-medium">{formatCurrencyDetailed(data.cumulativeCost, 4)}</span></p>
                              <p>📊 7-day Avg: <span className="font-medium">{formatCurrencyDetailed(data.avgCost, 4)}</span></p>
                              <p>🔧 Sessions: <span className="font-medium">{data.sessions}</span></p>
                              <p>💸 Cost/Session: <span className="font-medium">{formatCurrencyDetailed(data.costPerSession, 4)}</span></p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {costChartView === 'daily' ? (
                    <>
                      <Line
                        type="monotone"
                        dataKey="dailyCost"
                        stroke={chartTheme.primary}
                        strokeWidth={3}
                        dot={{ fill: chartTheme.primary, strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: chartTheme.primary, strokeWidth: 2 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="avgCost"
                        stroke={chartTheme.secondary}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                      />
                    </>
                  ) : (
                    <Line
                      type="monotone"
                      dataKey="cumulativeCost"
                      stroke={chartTheme.primary}
                      strokeWidth={3}
                      dot={{ fill: chartTheme.primary, strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: chartTheme.primary, strokeWidth: 2 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-3 flex justify-between text-sm text-[var(--text-secondary)]">
                <span>
                  {costChartView === 'daily' 
                    ? '💡 Solid line shows daily spending, dashed line shows 7-day average'
                    : '💡 Shows cumulative total spending over time'
                  }
                </span>
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-[var(--text-secondary)]">
              <div className="text-center">
                <ChartBarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{t('charts.noCostData')}</p>
              </div>
            </div>
          )}
        </div>

        {/* Token Usage by Model Chart */}
        <div className="bg-[var(--bg-primary)] p-6 rounded-lg shadow-[var(--shadow-sm)] border border-[var(--border-color)]">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            {t('charts.tokenUsageByModel')}
          </h3>
          {isLoading ? (
            <div className="h-64 bg-[var(--bg-skeleton)] rounded animate-pulse" />
          ) : chartData.tokensByModel.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.tokensByModel}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                <XAxis 
                  dataKey="model" 
                  stroke={chartTheme.axis}
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  stroke={chartTheme.axis}
                  fontSize={12}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: chartTheme.tooltipBackground,
                    border: `1px solid ${chartTheme.tooltipBorder}`,
                    borderRadius: '8px',
                    color: chartTheme.text,
                  }}
                  formatter={(value: number) => [value.toLocaleString(), t('businessIntelligence.tokens')]}
                />
                <Bar dataKey="tokens" fill={chartTheme.success} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-[var(--text-secondary)]">
              <div className="text-center">
                <CpuChipIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{t('charts.noTokenData')}</p>
              </div>
            </div>
          )}
        </div>

        {/* Cost Distribution by Model */}
        <div className="bg-[var(--bg-primary)] p-6 rounded-lg shadow-[var(--shadow-sm)] border border-[var(--border-color)]">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            {t('charts.costDistribution')}
          </h3>
          {isLoading ? (
            <div className="h-64 bg-[var(--bg-skeleton)] rounded animate-pulse" />
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
                  fill={chartTheme.primary}
                  dataKey="value"
                >
                  {chartData.costByModel.map((entry, index) => (
                    <Cell key={`cost-cell-${entry.name}`} fill={chartTheme.getDataColor(index)} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: chartTheme.tooltipBackground,
                    border: `1px solid ${chartTheme.tooltipBorder}`,
                    borderRadius: '8px',
                    color: chartTheme.text,
                  }}
                  formatter={(value: number) => [formatCurrencyDetailed(value, 4), 'Cost']}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-[var(--text-secondary)]">
              <div className="text-center">
                <CurrencyDollarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{t('charts.noCostDistribution')}</p>
              </div>
            </div>
          )}
        </div>

        {/* Recent Sessions Table */}
        <div className="bg-[var(--bg-primary)] p-6 rounded-lg shadow-[var(--shadow-sm)] border border-[var(--border-color)]">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
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
        <div className="bg-[var(--bg-warning)] border border-[var(--text-warning)] rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-[var(--text-warning)] mr-2" />
            <p className="text-[var(--text-warning)]">
              {t('warnings.noDataFound')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsageDashboard;