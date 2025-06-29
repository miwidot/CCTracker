import React, { useState, useEffect, useMemo } from 'react';
import { format, subDays, differenceInDays } from 'date-fns';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  ArrowLeftIcon,
  FolderOpenIcon,
  CurrencyDollarIcon,
  CpuChipIcon,
  ChartBarIcon,
  LightBulbIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  CalendarDaysIcon,
  BeakerIcon,
  RocketLaunchIcon,
  PresentationChartLineIcon,
  ChatBubbleLeftRightIcon,
  TableCellsIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { useCurrency } from '../hooks/useCurrency';
import { useTranslation } from '../hooks/useTranslation';
import { useChartTheme } from '../hooks/useChartTheme';
import type { ProjectAnalytics, UsageEntry, SessionStats } from '@shared/types';
import { formatTokens, calculateSessionDuration } from '@shared/utils';
import { log } from '@shared/utils/logger';

interface ProjectDetailViewProps {
  project: ProjectAnalytics;
  onBack: () => void;
}

interface DetailedProjectData {
  usageEntries: UsageEntry[];
  sessions: SessionStats[];
  dailyStats: Array<{
    date: string;
    cost: number;
    tokens: number;
    sessions: number;
    avgCostPerSession: number;
  }>;
  modelStats: Array<{
    model: string;
    totalCost: number;
    totalTokens: number;
    sessionCount: number;
    avgCostPerToken: number;
    efficiency: 'high' | 'medium' | 'low';
  }>;
  cacheStats: {
    totalCacheWrites: number;
    totalCacheReads: number;
    cacheHitRatio: number;
    cacheSavings: number;
  };
  insights: Array<{
    type: 'optimization' | 'warning' | 'info' | 'success';
    title: string;
    description: string;
    action?: string;
  }>;
}

const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({ project, onBack }) => {
  const { t } = useTranslation();
  const { formatCurrency, formatCurrencyDetailed, convertFromUSD } = useCurrency();
  const chartTheme = useChartTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [detailedData, setDetailedData] = useState<DetailedProjectData | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  // Load detailed project data
  useEffect(() => {
    const loadDetailedData = async () => {
      setIsLoading(true);
      try {
        // Get all usage entries for this project using date range from 2020 to now
        const startDate = '2020-01-01';
        const endDate = format(new Date(), 'yyyy-MM-dd');
        const dateRangeData = await window.electronAPI.getUsageByDateRange(startDate, endDate);
        const projectEntries = dateRangeData.entries.filter((entry: UsageEntry) => 
          entry.project_path === project.project_path
        );

        // Get session stats for this project
        const projectSessions = dateRangeData.sessions.filter((session: SessionStats) =>
          projectEntries.some((entry: UsageEntry) => entry.session_id === session.session_id)
        );

        // Calculate daily statistics
        const dailyStatsMap = new Map<string, {
          cost: number;
          tokens: number;
          sessions: Set<string>;
        }>();

        projectEntries.forEach((entry: UsageEntry) => {
          const date = format(new Date(entry.timestamp), 'yyyy-MM-dd');
          const existing = dailyStatsMap.get(date) ?? { cost: 0, tokens: 0, sessions: new Set() };
          existing.cost += convertFromUSD(entry.cost_usd);
          existing.tokens += entry.total_tokens;
          if (entry.session_id != null && entry.session_id !== '') {
            existing.sessions.add(entry.session_id);
          }
          dailyStatsMap.set(date, existing);
        });

        const dailyStats = Array.from(dailyStatsMap.entries())
          .map(([date, stats]) => ({
            date,
            cost: stats.cost,
            tokens: stats.tokens,
            sessions: stats.sessions.size,
            avgCostPerSession: stats.sessions.size > 0 ? stats.cost / stats.sessions.size : 0,
          }))
          .sort((a, b) => a.date.localeCompare(b.date));

        // Calculate model statistics
        const modelStatsMap = new Map<string, {
          totalCost: number;
          totalTokens: number;
          sessionCount: number;
        }>();

        projectEntries.forEach((entry: UsageEntry) => {
          const existing = modelStatsMap.get(entry.model) ?? { totalCost: 0, totalTokens: 0, sessionCount: 0 };
          existing.totalCost += convertFromUSD(entry.cost_usd);
          existing.totalTokens += entry.total_tokens;
          modelStatsMap.set(entry.model, existing);
        });

        // Count unique sessions per model
        const sessionsByModel = new Map<string, Set<string>>();
        projectEntries.forEach((entry: UsageEntry) => {
          if (entry.session_id != null && entry.session_id !== '') {
            const sessions = sessionsByModel.get(entry.model) ?? new Set();
            sessions.add(entry.session_id);
            sessionsByModel.set(entry.model, sessions);
          }
        });

        const modelStats = Array.from(modelStatsMap.entries()).map(([model, stats]) => {
          const sessionCount = sessionsByModel.get(model)?.size ?? 0;
          const avgCostPerToken = stats.totalTokens > 0 ? stats.totalCost / stats.totalTokens : 0;
          
          // Determine efficiency based on cost per token
          let efficiency: 'high' | 'medium' | 'low' = 'medium';
          if (avgCostPerToken < 0.00001) efficiency = 'high';
          else if (avgCostPerToken > 0.00005) efficiency = 'low';

          return {
            model,
            totalCost: stats.totalCost,
            totalTokens: stats.totalTokens,
            sessionCount,
            avgCostPerToken,
            efficiency,
          };
        }).sort((a, b) => b.totalCost - a.totalCost);

        // Calculate cache statistics
        const totalCacheWrites = projectEntries.reduce((sum: number, entry: UsageEntry) => sum + (entry.cache_creation_tokens ?? 0), 0);
        const totalCacheReads = projectEntries.reduce((sum: number, entry: UsageEntry) => sum + (entry.cache_read_tokens ?? 0), 0);
        const cacheHitRatio = totalCacheWrites > 0 ? (totalCacheReads / totalCacheWrites) * 100 : 0;
        
        // Calculate cache savings (cache reads are ~90% cheaper than regular tokens)
        const totalCacheTokens = totalCacheReads + totalCacheWrites;
        const regularTokenCost = totalCacheTokens * 0.000003; // Approx regular token cost
        const actualCacheCost = (totalCacheWrites * 0.00000375) + (totalCacheReads * 0.0000003); // Sonnet-4 cache pricing
        const cacheSavings = convertFromUSD(regularTokenCost - actualCacheCost);

        const cacheStats = {
          totalCacheWrites,
          totalCacheReads,
          cacheHitRatio,
          cacheSavings,
        };

        // Generate insights
        const insights: DetailedProjectData['insights'] = [];

        // Cost optimization insights
        if (cacheHitRatio > 10) {
          insights.push({
            type: 'success',
            title: 'Excellent Cache Efficiency',
            description: `Your cache hit ratio of ${cacheHitRatio.toFixed(1)}% is saving significant costs through token reuse.`,
          });
        }

        if (cacheSavings > 1) {
          insights.push({
            type: 'optimization',
            title: 'Cache Savings Detected',
            description: `Cache usage has saved approximately ${formatCurrency(cacheSavings)} in token costs.`,
          });
        }

        // Model efficiency insights
        const inefficientModels = modelStats.filter(m => m.efficiency === 'low');
        if (inefficientModels.length > 0) {
          insights.push({
            type: 'warning',
            title: 'High Cost Models Detected',
            description: `Consider if ${inefficientModels[0].model} is necessary for all tasks, or if a more efficient model could be used.`,
            action: 'Review model usage patterns',
          });
        }

        // Usage pattern insights
        const recentDays = dailyStats.slice(-7);
        const avgRecentCost = recentDays.reduce((sum: number, day) => sum + day.cost, 0) / recentDays.length;
        const totalProjectCost = projectEntries.reduce((sum: number, entry: UsageEntry) => sum + convertFromUSD(entry.cost_usd), 0);
        
        if (avgRecentCost > totalProjectCost * 0.1) {
          insights.push({
            type: 'info',
            title: 'High Recent Activity',
            description: 'This project has seen increased usage in the past week.',
          });
        }

        // Session efficiency
        const avgTokensPerSession = projectSessions.reduce((sum: number, s: SessionStats) => sum + s.total_tokens, 0) / projectSessions.length;
        if (avgTokensPerSession > 100000) {
          insights.push({
            type: 'optimization',
            title: 'Large Sessions Detected',
            description: 'Consider breaking down large sessions into smaller, focused interactions to optimize cache usage.',
            action: 'Review session structure',
          });
        }

        setDetailedData({
          usageEntries: projectEntries,
          sessions: projectSessions,
          dailyStats,
          modelStats,
          cacheStats,
          insights,
        });

      } catch (error) {
        log.component.error('ProjectDetailView', error as Error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadDetailedData();
  }, [project.project_path, convertFromUSD, formatCurrency]);

  // Filter data based on time range
  const filteredDailyStats = useMemo(() => {
    if (!detailedData) return [];
    
    if (timeRange === 'all') return detailedData.dailyStats;
    
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    if (days <= 0) return detailedData.dailyStats;
    const cutoffDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
    
    return detailedData.dailyStats.filter(stat => stat.date >= cutoffDate);
  }, [detailedData, timeRange]);

  const projectAge = useMemo(() => {
    if (!detailedData?.dailyStats || detailedData.dailyStats.length === 0) return 0;
    const firstDate = new Date(detailedData.dailyStats[0].date);
    return differenceInDays(new Date(), firstDate);
  }, [detailedData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-secondary)] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center mb-6">
            <button
              onClick={onBack}
              className="mr-4 p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 text-[var(--text-secondary)]" />
            </button>
            <div className="h-8 bg-[var(--bg-skeleton)] rounded w-64 animate-pulse" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="bg-[var(--bg-primary)] p-6 rounded-lg">
                <div className="h-64 bg-[var(--bg-skeleton)] rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!detailedData) {
    return (
      <div className="min-h-screen bg-[var(--bg-secondary)] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center mb-6">
            <button
              onClick={onBack}
              className="mr-4 p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 text-[var(--text-secondary)]" />
            </button>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Project Details</h1>
          </div>
          <div className="text-center py-12">
            <ExclamationTriangleIcon className="h-12 w-12 text-[var(--text-warning)] mx-auto mb-4" />
            <p className="text-[var(--text-secondary)]">{t('projectDetail.failedToLoad')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button
              onClick={onBack}
              className="mr-4 p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 text-[var(--text-secondary)]" />
            </button>
            <div className="flex items-center space-x-3">
              <FolderOpenIcon className="h-8 w-8 text-[var(--color-primary)]" />
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                  {project.project_name}
                </h1>
                <p className="text-sm text-[var(--text-secondary)]">
                  {project.project_path}
                </p>
              </div>
            </div>
          </div>
          
          {/* Time Range Selector */}
          <div className="flex bg-[var(--bg-primary)] rounded-lg p-1">
            {(['7d', '30d', '90d', 'all'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  timeRange === range
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {range === 'all' ? t('dateRange.all') : range.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-[var(--bg-primary)] p-6 rounded-lg border border-[var(--border-color)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">{t('projectDetail.totalCost')}</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {formatCurrencyDetailed(project.total_cost, 2)}
                </p>
              </div>
              <CurrencyDollarIcon className="h-8 w-8 text-[var(--color-primary)]" />
            </div>
            <div className="mt-2 text-xs text-[var(--text-secondary)]">
              {t('projectDetail.sinceDate', { date: format(new Date(project.last_used), 'MMM dd, yyyy') })}
            </div>
          </div>

          <div className="bg-[var(--bg-primary)] p-6 rounded-lg border border-[var(--border-color)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">{t('projectDetail.totalTokens')}</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {formatTokens(project.total_tokens)}
                </p>
              </div>
              <CpuChipIcon className="h-8 w-8 text-[var(--color-primary)]" />
            </div>
            <div className="mt-2 text-xs text-[var(--text-secondary)]">
              {t('projectDetail.acrossSessions', { count: project.session_count })}
            </div>
          </div>

          <div className="bg-[var(--bg-primary)] p-6 rounded-lg border border-[var(--border-color)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">{t('projectDetail.cacheEfficiency')}</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {detailedData.cacheStats.cacheHitRatio.toFixed(1)}%
                </p>
              </div>
              <RocketLaunchIcon className="h-8 w-8 text-[var(--color-primary)]" />
            </div>
            <div className="mt-2 text-xs text-[var(--text-secondary)]">
              {formatTokens(detailedData.cacheStats.totalCacheReads)} {t('projectDetail.cacheReads')}
            </div>
          </div>

          <div className="bg-[var(--bg-primary)] p-6 rounded-lg border border-[var(--border-color)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">{t('projectDetail.projectAge')}</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {projectAge} days
                </p>
              </div>
              <CalendarDaysIcon className="h-8 w-8 text-[var(--color-primary)]" />
            </div>
            <div className="mt-2 text-xs text-[var(--text-secondary)]">
              {t('projectDetail.sinceFirstUsage')}
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Cost Over Time */}
          <div className="bg-[var(--bg-primary)] p-6 rounded-lg border border-[var(--border-color)]">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center">
              <ArrowTrendingUpIcon className="h-5 w-5 mr-2" />
              {t('projectDetail.costTrend')}
            </h3>
            {filteredDailyStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={filteredDailyStats}>
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
                    contentStyle={{
                      backgroundColor: chartTheme.tooltipBackground,
                      border: `1px solid ${chartTheme.tooltipBorder}`,
                      borderRadius: '8px',
                      color: chartTheme.text,
                    }}
                    formatter={(value: number) => [formatCurrencyDetailed(value, 4), 'Cost']}
                    labelFormatter={(label) => format(new Date(label), 'MMM dd, yyyy')}
                  />
                  <Area
                    type="monotone"
                    dataKey="cost"
                    stroke={chartTheme.primary}
                    fill={chartTheme.primary}
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-[var(--text-secondary)]">
                {t('projectDetail.noDataForRange')}
              </div>
            )}
          </div>

          {/* Model Distribution */}
          <div className="bg-[var(--bg-primary)] p-6 rounded-lg border border-[var(--border-color)]">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center">
              <PresentationChartLineIcon className="h-5 w-5 mr-2" />
              {t('projectDetail.modelUsage')}
            </h3>
            {detailedData.modelStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={detailedData.modelStats}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ model, totalCost }) => 
                      `${model.replace('claude-', '').replace('-20250514', '')} (${formatCurrency(totalCost)})`
                    }
                    outerRadius={80}
                    fill={chartTheme.primary}
                    dataKey="totalCost"
                  >
                    {detailedData.modelStats.map((entry, index) => (
                      <Cell key={`cell-${entry.model}`} fill={chartTheme.getDataColor(index)} />
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
                {t('projectDetail.noModelData')}
              </div>
            )}
          </div>
        </div>

        {/* Model Efficiency Table */}
        <div className="bg-[var(--bg-primary)] p-6 rounded-lg border border-[var(--border-color)] mb-8">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center">
            <BeakerIcon className="h-5 w-5 mr-2" />
            {t('projectDetail.modelEfficiency')}
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--border-color)]">
              <thead className="bg-[var(--bg-secondary)]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                    Model
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                    Total Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                    Total Tokens
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                    Sessions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                    Cost/Token
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                    Efficiency
                  </th>
                </tr>
              </thead>
              <tbody className="bg-[var(--bg-primary)] divide-y divide-[var(--border-color)]">
                {detailedData.modelStats.map((model) => (
                  <tr key={model.model} className="hover:bg-[var(--bg-tertiary)]">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--text-primary)]">
                      {model.model.replace('claude-', '').replace('-20250514', '')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">
                      {formatCurrencyDetailed(model.totalCost, 4)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">
                      {formatTokens(model.totalTokens)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">
                      {model.sessionCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">
                      {(model.avgCostPerToken * 1000000).toFixed(2)}μ¢
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        model.efficiency === 'high' 
                          ? 'bg-green-100 text-green-800' 
                          : model.efficiency === 'medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {model.efficiency}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* All Sessions List */}
        <div className="bg-[var(--bg-primary)] p-6 rounded-lg border border-[var(--border-color)] mb-8">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center">
            <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2" />
            {t('projectDetail.allSessions')} ({detailedData.sessions.length})
          </h3>
          {detailedData.sessions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--border-color)]">
                <thead className="bg-[var(--bg-secondary)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                      {t('sessions.sessionId')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                      {t('sessions.startTime')}
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
                  {detailedData.sessions
                    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
                    .map((session) => {
                      const duration = calculateSessionDuration(session.start_time, session.end_time);
                      return (
                        <tr key={session.session_id} className="hover:bg-[var(--color-hover)] transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-[var(--text-primary)]">
                            <div className="flex items-center">
                              <ChatBubbleLeftRightIcon className="h-4 w-4 text-[var(--text-secondary)] mr-2" />
                              {session.session_id.substring(0, 8)}...
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">
                            <div className="flex items-center">
                              <ClockIcon className="h-4 w-4 text-[var(--text-secondary)] mr-2" />
                              {format(new Date(session.start_time), 'MMM dd, HH:mm')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--bg-tertiary)] text-[var(--text-primary)]">
                              {session.model.replace('claude-', '').replace('-20250514', '')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">
                            {duration > 60 ? `${Math.floor(duration / 60)}h ${duration % 60}m` : `${duration}m`}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">
                            <div className="flex items-center">
                              <div className="w-2 h-2 bg-[var(--color-primary)] rounded-full mr-2" />
                              {session.message_count}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">
                            <div className="flex items-center">
                              <CpuChipIcon className="h-4 w-4 text-[var(--text-secondary)] mr-2" />
                              {formatTokens(session.total_tokens)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center">
                              <CurrencyDollarIcon className="h-4 w-4 text-[var(--color-success)] mr-2" />
                              <span className="text-[var(--color-success)]">
                                {formatCurrencyDetailed(convertFromUSD(session.total_cost), 4)}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-[var(--text-secondary)]">
              <TableCellsIcon className="h-12 w-12 mx-auto mb-2 opacity-50 text-[var(--text-muted)]" />
              <p>{t('warnings.noSessionsFound')}</p>
            </div>
          )}
        </div>

        {/* Insights & Recommendations */}
        <div className="bg-[var(--bg-primary)] p-6 rounded-lg border border-[var(--border-color)]">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center">
            <LightBulbIcon className="h-5 w-5 mr-2" />
            {t('projectDetail.insightsRecommendations')}
          </h3>
          <div className="space-y-4">
            {detailedData.insights.map((insight) => (
              <div
                key={`insight-${insight.type}-${insight.title}`}
                className={`p-4 rounded-lg border-l-4 ${
                  insight.type === 'success' 
                    ? 'bg-green-50 border-green-400'
                    : insight.type === 'warning'
                    ? 'bg-yellow-50 border-yellow-400'
                    : insight.type === 'optimization'
                    ? 'bg-blue-50 border-blue-400'
                    : 'bg-gray-50 border-gray-400'
                }`}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    {insight.type === 'success' && <CheckCircleIcon className="h-5 w-5 text-green-600" />}
                    {insight.type === 'warning' && <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />}
                    {insight.type === 'optimization' && <ChartBarIcon className="h-5 w-5 text-blue-600" />}
                    {insight.type === 'info' && <InformationCircleIcon className="h-5 w-5 text-gray-600" />}
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-gray-900">
                      {insight.title}
                    </h4>
                    <p className="text-sm text-gray-700 mt-1">
                      {insight.description}
                    </p>
                    {(insight.action != null && insight.action !== '') && (
                      <p className="text-sm font-medium text-blue-600 mt-2">
                        💡 {insight.action}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailView;