/**
 * Billing Block Dashboard Component
 * Displays 5-hour billing block tracking with burn rate and projections
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../hooks/useCurrency';
import type { BillingBlockSummary, BurnRateStatus, ProjectTokenStats } from '@shared/types/billing';
import type { UsageEntry } from '@shared/types';

interface BillingBlockDashboardProps {
  entries: UsageEntry[];
  className?: string;
}

export const BillingBlockDashboard: React.FC<BillingBlockDashboardProps> = ({ 
  entries, 
  className = '' 
}) => {
  const { t } = useTranslation();
  const { convertFromUSD, formatCurrency, getCurrencySymbol } = useCurrency();
  const [blocksSummary, setBlocksSummary] = useState<BillingBlockSummary | null>(null);
  const [currentBlockStatus, setCurrentBlockStatus] = useState<any>(null);
  const [projectStats, setProjectStats] = useState<ProjectTokenStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBillingData();
  }, [entries]);

  const loadBillingData = async () => {
    try {
      setIsLoading(true);
      
      const [summary, currentStatus, projectTokenStats] = await Promise.all([
        window.electronAPI.getBillingBlocksSummary(entries),
        window.electronAPI.getCurrentBlockStatus(),
        window.electronAPI.getProjectTokenStats()
      ]);

      setBlocksSummary(summary);
      setCurrentBlockStatus(currentStatus);
      setProjectStats(projectTokenStats);
    } catch (error) {
      console.error('Failed to load billing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrencyValue = (amountUSD: number): string => {
    const convertedAmount = convertFromUSD(amountUSD);
    return formatCurrency(convertedAmount);
  };

  const formatTokens = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const getBurnRateColor = (level: string): string => {
    switch (level) {
      case 'LOW': return 'text-green-600 dark:text-green-400';
      case 'MODERATE': return 'text-yellow-600 dark:text-yellow-400';
      case 'HIGH': return 'text-orange-600 dark:text-orange-400';
      case 'CRITICAL': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getProgressBarColor = (level: string): string => {
    switch (level) {
      case 'LOW': return 'bg-green-500';
      case 'MODERATE': return 'bg-yellow-500';
      case 'HIGH': return 'bg-orange-500';
      case 'CRITICAL': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const calculateBlockProgress = (): number => {
    if (!currentBlockStatus || !currentBlockStatus.isActive) return 0;
    
    const elapsed = Date.now() - new Date(currentBlockStatus.startTime).getTime();
    const total = new Date(currentBlockStatus.endTime).getTime() - new Date(currentBlockStatus.startTime).getTime();
    return Math.min(100, (elapsed / total) * 100);
  };

  const formatTimeRemaining = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (isLoading) {
    return (
      <div className={`p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
        </div>
      </div>
    );
  }

  if (!blocksSummary || !currentBlockStatus) {
    return (
      <div className={`p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg ${className}`}>
        <p className="text-gray-500 dark:text-gray-400">
          {t('billing.noData', 'No billing data available')}
        </p>
      </div>
    );
  }

  const progress = calculateBlockProgress();
  const { currentBlock } = blocksSummary;
  const { burnRateStatus } = currentBlockStatus;

  return (
    <div className={`p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('billing.currentBlock', 'Current Billing Block')}
        </h3>
        {currentBlockStatus.isActive ? (
          <span className="flex items-center text-sm text-green-600 dark:text-green-400">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            {t('billing.active', 'Active')}
          </span>
        ) : (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t('billing.inactive', 'No Active Block')}
          </span>
        )}
      </div>

      {currentBlockStatus.isActive && (
        <>
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('billing.blockProgress', 'Block Progress')}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {formatTimeRemaining(currentBlockStatus.remainingMinutes)} {t('billing.remaining', 'remaining')}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-300 ${getProgressBarColor(burnRateStatus.level)}`}
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
              <span>{Math.round(progress)}% complete</span>
              <span>5-hour block</span>
            </div>
          </div>

          {/* Burn Rate Status */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                {t('billing.burnRate', 'Burn Rate')}
              </div>
              <div className={`text-lg font-semibold ${getBurnRateColor(burnRateStatus.level)}`}>
                {formatTokens(Math.round(burnRateStatus.tokensPerMinute))}/min
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {burnRateStatus.level}
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                {t('billing.projectedCost', 'Projected Cost')}
              </div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {formatCurrencyValue(burnRateStatus.projectedBlockCost)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {t('billing.forThisBlock', 'for this block')}
              </div>
            </div>
          </div>

          {/* Current Cost */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg mb-6">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t('billing.currentBlockCost', 'Current Block Cost')}
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrencyValue(currentBlockStatus.totalCost || 0)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t('billing.totalTokens', 'Total Tokens')}
                </div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatTokens(
                    (currentBlockStatus.totalTokens?.input || 0) +
                    (currentBlockStatus.totalTokens?.output || 0) +
                    (currentBlockStatus.totalTokens?.cacheCreation || 0) +
                    (currentBlockStatus.totalTokens?.cacheRead || 0)
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Warning Message */}
          {burnRateStatus.warningMessage && (
            <div className={`p-3 rounded-lg mb-6 ${
              burnRateStatus.level === 'CRITICAL' 
                ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' 
                : 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800'
            }`}>
              <div className={`text-sm font-medium ${
                burnRateStatus.level === 'CRITICAL' 
                  ? 'text-red-800 dark:text-red-200' 
                  : 'text-orange-800 dark:text-orange-200'
              }`}>
                ⚠️ {burnRateStatus.warningMessage}
              </div>
            </div>
          )}
        </>
      )}

      {/* Token Breakdown */}
      {currentBlockStatus.totalTokens && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            {t('billing.tokenBreakdown', 'Token Breakdown')}
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {t('billing.inputTokens', 'Input')}
              </div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                {formatTokens(currentBlockStatus.totalTokens.input || 0)}
              </div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {t('billing.outputTokens', 'Output')}
              </div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                {formatTokens(currentBlockStatus.totalTokens.output || 0)}
              </div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {t('billing.cacheCreation', 'Cache Write')}
              </div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                {formatTokens(currentBlockStatus.totalTokens.cacheCreation || 0)}
              </div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {t('billing.cacheRead', 'Cache Read')}
              </div>
              <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {formatTokens(currentBlockStatus.totalTokens.cacheRead || 0)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};