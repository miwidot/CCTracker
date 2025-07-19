import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Activity, 
  TrendingUp, 
  AlertTriangle, 
  Clock,
  DollarSign,
  Zap,
  RefreshCw
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { type SessionBlock, type BurnRate, getBurnRateStatus, BURN_RATE_THRESHOLDS } from '@shared/burnRate';
import type { RealtimeStats } from '@shared/types';
import { formatNumber } from '../utils/formatting';
import { useSettings } from '../hooks/useSettings';

interface LiveMonitoringDashboardProps {
  refreshInterval?: number;
}

export const LiveMonitoringDashboard: React.FC<LiveMonitoringDashboardProps> = ({ 
  refreshInterval = 1000 
}) => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [stats, setStats] = useState<RealtimeStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const realtimeStats = await window.electronAPI.getRealtimeStats();
      // Convert serialized dates back to Date objects
      const parsedStats: RealtimeStats = {
        ...realtimeStats,
        burnRates: new Map(Object.entries(realtimeStats.burnRates)),
        activeBlocks: realtimeStats.activeBlocks.map((block: any) => ({
          ...block,
          startTime: new Date(block.startTime),
          endTime: new Date(block.endTime),
          entries: block.entries.map((entry: any) => ({
            ...entry,
            timestamp: new Date(entry.timestamp),
          })),
        })),
        lastUpdate: new Date(realtimeStats.lastUpdate),
      };
      setStats(parsedStats);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch realtime stats');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchStats();

    // Set up refresh interval
    const intervalId = setInterval(fetchStats, refreshInterval);

    // Start realtime monitoring
    window.electronAPI.startRealtimeMonitoring().catch(console.error);

    // Listen for realtime updates
    const unsubscribe = window.electronAPI.onRealtimeStatsUpdate((newStats: any) => {
      // Convert serialized dates back to Date objects
      const parsedStats: RealtimeStats = {
        ...newStats,
        burnRates: new Map(Object.entries(newStats.burnRates)),
        activeBlocks: newStats.activeBlocks.map((block: any) => ({
          ...block,
          startTime: new Date(block.startTime),
          endTime: new Date(block.endTime),
          entries: block.entries.map((entry: any) => ({
            ...entry,
            timestamp: new Date(entry.timestamp),
          })),
        })),
        lastUpdate: new Date(newStats.lastUpdate),
      };
      setStats(parsedStats);
      setLastUpdate(new Date());
    });

    return () => {
      clearInterval(intervalId);
      unsubscribe();
    };
  }, [fetchStats, refreshInterval]);

  const getBurnRateColor = (status: 'high' | 'moderate' | 'normal') => {
    switch (status) {
      case 'high':
        return 'text-red-600 dark:text-red-400';
      case 'moderate':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'normal':
        return 'text-green-600 dark:text-green-400';
    }
  };

  const getBurnRateBackground = (status: 'high' | 'moderate' | 'normal') => {
    switch (status) {
      case 'high':
        return 'bg-red-100 dark:bg-red-900/20';
      case 'moderate':
        return 'bg-yellow-100 dark:bg-yellow-900/20';
      case 'normal':
        return 'bg-green-100 dark:bg-green-900/20';
    }
  };

  const formatCurrency = (amount: number) => {
    // Map language to locale
    const localeMap: Record<string, string> = {
      'en': 'en-US',
      'de': 'de-DE',
      'fr': 'fr-FR',
      'es': 'es-ES',
      'ja': 'ja-JP',
      'zh': 'zh-CN',
    };
    
    const locale = localeMap[settings.language] || 'en-US';
    const currency = settings.currency || 'USD';
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          <span className="text-red-700 dark:text-red-300">{error}</span>
        </div>
      </div>
    );
  }

  const activeBlocks = stats?.activeBlocks || [];
  const hasActiveUsage = activeBlocks.length > 0;

  return (
    <div className="space-y-6">
      {/* Header with refresh indicator */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t('liveMonitoring.title', 'Live Monitoring')}
        </h2>
        <div className="flex items-center space-x-4">
          {lastUpdate && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {t('liveMonitoring.lastUpdate', 'Updated {{time}}', {
                time: formatDistanceToNow(lastUpdate, { addSuffix: true })
              })}
            </span>
          )}
          <Activity className={`w-5 h-5 ${hasActiveUsage ? 'text-green-500 animate-pulse' : 'text-gray-400'}`} />
        </div>
      </div>

      {/* Overall Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Active Burn Rate */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t('liveMonitoring.totalBurnRate', 'Total Burn Rate')}
            </h3>
            <Zap className="w-5 h-5 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatNumber(stats?.totalActiveTokensPerMinute || 0)}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('liveMonitoring.tokensPerMinute', 'tokens/minute')}
          </p>
        </div>

        {/* Hourly Cost Projection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t('liveMonitoring.hourlyCost', 'Hourly Cost')}
            </h3>
            <DollarSign className="w-5 h-5 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatCurrency(stats?.totalActiveCostPerHour || 0)}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('liveMonitoring.projected', 'projected')}
          </p>
        </div>

        {/* Active Sessions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t('liveMonitoring.activeSessions', 'Active Sessions')}
            </h3>
            <Clock className="w-5 h-5 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {activeBlocks.length}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {activeBlocks.length === 1 ? t('liveMonitoring.session', 'session') : t('liveMonitoring.sessions', 'sessions')}
          </p>
        </div>
      </div>

      {/* Active Sessions List */}
      {hasActiveUsage ? (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('liveMonitoring.activeProjects', 'Active Projects')}
          </h3>
          
          {activeBlocks.map((block) => {
            const burnRate = stats?.burnRates.get(block.id);
            if (!burnRate) return null;
            
            const status = getBurnRateStatus(burnRate);
            const duration = (new Date().getTime() - block.startTime.getTime()) / (1000 * 60);
            
            return (
              <div
                key={block.id}
                className={`${getBurnRateBackground(status)} border rounded-lg p-4 transition-all duration-200`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      {block.project}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('liveMonitoring.activeFor', 'Active for {{duration}} minutes', {
                        duration: Math.round(duration)
                      })}
                    </p>
                  </div>
                  <div className={`flex items-center space-x-2 ${getBurnRateColor(status)}`}>
                    <TrendingUp className="w-5 h-5" />
                    <span className="font-semibold">{status.toUpperCase()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('liveMonitoring.burnRate', 'Burn Rate')}
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {formatNumber(burnRate.tokensPerMinute)}
                      <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">
                        tokens/min
                      </span>
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('liveMonitoring.costRate', 'Cost Rate')}
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {formatCurrency(burnRate.costPerHour)}
                      <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">
                        /hour
                      </span>
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('liveMonitoring.totalTokens', 'Total Tokens')}
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {formatNumber(
                        block.tokenCounts.inputTokens + 
                        block.tokenCounts.outputTokens +
                        block.tokenCounts.cacheCreationTokens +
                        block.tokenCounts.cacheReadTokens
                      )}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('liveMonitoring.sessionCost', 'Session Cost')}
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {formatCurrency(block.costUSD)}
                    </p>
                  </div>
                </div>

                {/* Burn Rate Indicator Bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <span>{t('liveMonitoring.burnRateIndicator', 'Burn Rate Indicator')}</span>
                    <span>{formatNumber(burnRate.tokensPerMinuteForIndicator)} / {BURN_RATE_THRESHOLDS.HIGH}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        status === 'high' ? 'bg-red-500' : 
                        status === 'moderate' ? 'bg-yellow-500' : 
                        'bg-green-500'
                      }`}
                      style={{
                        width: `${Math.min(100, (burnRate.tokensPerMinuteForIndicator / BURN_RATE_THRESHOLDS.HIGH) * 100)}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
          <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {t('liveMonitoring.noActiveUsage', 'No Active Usage')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {t('liveMonitoring.startUsing', 'Start using Claude to see live monitoring data')}
          </p>
        </div>
      )}
    </div>
  );
};