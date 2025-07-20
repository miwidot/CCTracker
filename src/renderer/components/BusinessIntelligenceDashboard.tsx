import React, { useState, useEffect, useCallback } from 'react';
import {
  ChartBarIcon,
  CpuChipIcon,
  ExclamationTriangleIcon,
  DocumentArrowDownIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  BoltIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { useTranslation } from '../hooks/useTranslation';
import { useChartTheme } from '../hooks/useChartTheme';
import { useCurrency } from '../hooks/useCurrency';
import { cleanModelName, capitalizeWords } from '@shared/utils';
import type { BusinessIntelligence, ModelEfficiency, UsageAnomaly } from '@shared/types';
import { log } from '@shared/utils/logger';

interface BIMetricCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'stable';
  };
  subtitle?: string;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
}

const BIMetricCard: React.FC<BIMetricCardProps> = ({ 
  title, 
  value, 
  // eslint-disable-next-line @typescript-eslint/naming-convention
  icon: IconComponent, 
  trend, 
  subtitle, 
  color: _color = 'blue' 
}) => {
  const getTrendIcon = () => {
    if (!trend) return null;
    switch (trend.direction) {
      case 'up': return <ArrowTrendingUpIcon className="h-4 w-4 text-[var(--color-success)]" />;
      case 'down': return <ArrowTrendingDownIcon className="h-4 w-4 text-[var(--color-error)]" />;
      case 'stable': return <MinusIcon className="h-4 w-4 text-[var(--text-secondary)]" />;
    }
  };

  return (
    <div className="card interactive-scale p-6 rounded-lg border-2 border-[var(--border-color)] bg-[var(--bg-secondary)] theme-transition hover:scale-105">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <IconComponent className="h-8 w-8 text-[var(--text-accent)]" />
          <div>
            <p className="text-sm font-medium text-[var(--text-secondary)]">{title}</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
            {Boolean(subtitle) && <p className="text-xs text-[var(--text-secondary)]">{subtitle}</p>}
          </div>
        </div>
        {trend && (
          <div className="flex items-center space-x-1">
            {getTrendIcon()}
            <span className="text-sm font-medium text-[var(--text-primary)]">{trend.value.toFixed(1)}%</span>
          </div>
        )}
      </div>
    </div>
  );
};

interface ModelEfficiencyTableProps {
  models: ModelEfficiency[];
}

const ModelEfficiencyTable: React.FC<ModelEfficiencyTableProps> = ({ models }) => {
  const { t } = useTranslation();
  const { formatCurrencyDetailed } = useCurrency();
  return (
  <div className="bg-[var(--bg-secondary)] rounded-lg shadow-sm border border-[var(--border-color)]">
    <div className="p-6 border-b border-[var(--border-color)]">
      <h3 className="text-lg font-semibold flex items-center text-[var(--text-primary)]">
        <CpuChipIcon className="h-5 w-5 mr-2 text-[var(--text-accent)]" />
        {t('businessIntelligence.modelEfficiencyRanking')}
      </h3>
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-[var(--border-color)]">
        <thead className="bg-[var(--bg-tertiary)]">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">{t('businessIntelligence.rank')}</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">{t('businessIntelligence.model')}</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">{t('businessIntelligence.costPerToken')}</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">{t('businessIntelligence.totalCost')}</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">{t('businessIntelligence.usageCount')}</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">{t('businessIntelligence.efficiencyScore')}</th>
          </tr>
        </thead>
        <tbody className="bg-[var(--bg-secondary)] divide-y divide-[var(--border-color)]">
          {models.slice(0, 10).map((model, index) => (
            <tr key={model.model} className={index < 3 ? 'bg-[var(--bg-success)]' : ''}>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  index === 0 ? 'bg-[var(--bg-warning)] text-[var(--text-warning)]' : 
                  index === 1 ? 'bg-[var(--color-active)] text-[var(--text-primary)]' :
                  index === 2 ? 'bg-[var(--bg-warning)] text-[var(--text-warning)]' :
                  'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                }`}>
                  #{index + 1}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--text-primary)]">
                {model.model}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                {formatCurrencyDetailed(model.costPerToken * 1000000, 2)}/M
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                {formatCurrencyDetailed(model.totalCost, 4)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                {model.usageCount.toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                {model.efficiency_score.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
  );
};

interface AnomalyAlertsProps {
  anomalies: UsageAnomaly[];
}

const AnomalyAlerts: React.FC<AnomalyAlertsProps> = ({ anomalies }) => {
  const { t } = useTranslation();
  const severityColors = {
    high: 'bg-[var(--bg-error)] border-[var(--text-error)] text-[var(--text-error)]',
    medium: 'bg-[var(--bg-warning)] border-[var(--text-warning)] text-[var(--text-warning)]',
    low: 'bg-[var(--bg-info)] border-[var(--text-accent)] text-[var(--text-accent)]',
  };

  return (
    <div className="bg-[var(--bg-secondary)] rounded-lg shadow-sm border border-[var(--border-color)]">
      <div className="p-6 border-b border-[var(--border-color)]">
        <h3 className="text-lg font-semibold flex items-center text-[var(--text-primary)]">
          <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-[var(--color-error)]" />
          {t('businessIntelligence.recentAnomalies')} ({anomalies.length})
        </h3>
      </div>
      <div className="p-6">
        {anomalies.length === 0 ? (
          <p className="text-[var(--text-secondary)] text-center py-8">{t('businessIntelligence.noAnomalies')}</p>
        ) : (
          <div className="space-y-3">
            {anomalies.slice(0, 5).map((anomaly, _index) => (
              <div
                key={`anomaly-${anomaly.timestamp}-${anomaly.type}-${anomaly.actual_value}`}
                className={`p-4 rounded-lg border-2 ${severityColors[anomaly.severity]}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold uppercase">
                        {anomaly.severity} • {capitalizeWords(anomaly.type.replace('_', ' '))}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)]">
                        {new Date(anomaly.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{anomaly.description}</p>
                    <p className="text-xs mt-1 text-[var(--text-secondary)]">
                      {t('businessIntelligence.deviation')}: {anomaly.deviation_percentage.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const BusinessIntelligenceDashboard: React.FC = () => {
  const { t } = useTranslation();
  const chartTheme = useChartTheme();
  const { formatCurrency, formatCurrencyDetailed } = useCurrency();
  // Chart CSS variables available if needed
  // const chartCSSVars = getChartCSSVariables();
  const [biData, setBiData] = useState<BusinessIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBusinessIntelligence = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await window.electronAPI.getBusinessIntelligence();
      setBiData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('analytics.errorMessage'));
      // Log error for debugging
      log.component.error('BusinessIntelligenceDashboard', err as Error);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadBusinessIntelligence();
  }, [loadBusinessIntelligence]);

  const [exportStatus, setExportStatus] = useState<{type: 'success' | 'error' | null, message: string}>({type: null, message: ''});

  const exportBusinessReport = async () => {
    if (!biData) return;
    
    try {
      const _result = await window.electronAPI.exportBusinessReport(biData);
      setExportStatus({type: 'success', message: t('businessIntelligence.exportSuccess')});
      // Clear notification after 3 seconds
      setTimeout(() => setExportStatus({type: null, message: ''}), 3000);
    } catch (_err) {
      setExportStatus({type: 'error', message: t('businessIntelligence.exportError')});
      // Clear notification after 5 seconds
      setTimeout(() => setExportStatus({type: null, message: ''}), 5000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--text-accent)] mx-auto" />
          <p className="mt-4 text-[var(--text-secondary)]">{t('businessIntelligence.generatingData')}</p>
        </div>
      </div>
    );
  }

  if (error !== null) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-[var(--color-error)] mx-auto" />
          <p className="mt-4 text-[var(--color-error)]">{error}</p>
          <button
            onClick={() => void loadBusinessIntelligence()}
            className="mt-4 px-4 py-2 bg-[var(--text-accent)] text-white rounded-lg hover:bg-opacity-90"
          >
            {t('analytics.retry')}
          </button>
        </div>
      </div>
    );
  }

  if (!biData) return null;

  // Prepare chart data
  const trendsChartData = biData.trends.daily.slice(-30).map(trend => ({
    date: new Date(trend.period).toLocaleDateString(),
    cost: trend.cost,
    tokens: trend.tokens / 1000, // Convert to thousands
    growth: trend.growth_rate,
  }));

  const _modelEfficiencyChartData = biData.model_efficiency.slice(0, 6).map(model => ({
    name: cleanModelName(model.model),
    efficiency: model.efficiency_score,
    cost: model.totalCost,
    usage: model.usageCount,
  }));

  const usagePatternData = [
    { time: 'Morning', usage: biData.usage_patterns.morning, period: '6AM-12PM' },
    { time: 'Afternoon', usage: biData.usage_patterns.afternoon, period: '12PM-6PM' },
    { time: 'Evening', usage: biData.usage_patterns.evening, period: '6PM-12AM' },
    { time: 'Night', usage: biData.usage_patterns.night, period: '12AM-6AM' },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <div className="bg-[var(--bg-secondary)] shadow-sm border-b border-[var(--border-color)]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-[var(--text-primary)] flex items-center">
                <BoltIcon className="h-8 w-8 mr-3 text-[var(--text-accent)]" />
                {t('businessIntelligence.title')}
              </h1>
              <p className="text-[var(--text-secondary)] mt-1">
                {t('businessIntelligence.subtitle')}
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => void loadBusinessIntelligence()}
                className="px-4 py-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-tertiary)] flex items-center text-[var(--text-primary)]"
              >
                <BoltIcon className="h-4 w-4 mr-2" />
                {t('common.refresh')}
              </button>
              <button
                onClick={() => void exportBusinessReport()}
                className="px-4 py-2 bg-[var(--text-accent)] text-white rounded-lg hover:bg-opacity-90 flex items-center"
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                {t('businessIntelligence.exportReport')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Export Status Notification */}
        {exportStatus.type && (
          <div className={`mb-6 p-4 rounded-lg border-2 ${
            exportStatus.type === 'success' 
              ? 'bg-[var(--bg-success)] border-[var(--color-success)] text-[var(--text-success)]' 
              : 'bg-[var(--bg-error)] border-[var(--color-error)] text-[var(--text-error)]'
          } animate-fade-in`}>
            <div className="flex items-center">
              {exportStatus.type === 'success' ? (
                <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
              ) : (
                <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
              )}
              <p className="font-medium">{exportStatus.message}</p>
            </div>
          </div>
        )}

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <BIMetricCard
            title={t('businessIntelligence.totalCost')}
            value={formatCurrencyDetailed(biData.total_cost, 4)}
            icon={CurrencyDollarIcon}
            color="green"
          />
          <BIMetricCard
            title={t('businessIntelligence.costBurnRate')}
            value={`${formatCurrencyDetailed(biData.cost_burn_rate, 4)}/hr`}
            icon={ClockIcon}
            subtitle={t('businessIntelligence.currentSpendingRate')}
            color="blue"
          />
          <BIMetricCard
            title={t('businessIntelligence.modelDiversity')}
            value={biData.model_diversity}
            icon={CpuChipIcon}
            subtitle={t('businessIntelligence.differentModelsUsed')}
            color="purple"
          />
          <BIMetricCard
            title={t('businessIntelligence.dataQuality')}
            value={`${biData.data_quality_score.toFixed(1)}%`}
            icon={ChartBarIcon}
            color="green"
          />
        </div>

        {/* Predictions Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <BIMetricCard
            title={t('businessIntelligence.predictedMonthlyCost')}
            value={formatCurrency(biData.predictions.predicted_monthly_cost)}
            icon={SparklesIcon}
            subtitle={`${biData.predictions.confidence_level.toFixed(1)}% ${t('businessIntelligence.confidence')}`}
            trend={{
              value: biData.predictions.cost_trend === 'increasing' ? 15 : 
                     biData.predictions.cost_trend === 'decreasing' ? -10 : 0,
              direction: biData.predictions.cost_trend === 'increasing' ? 'up' : 
                        biData.predictions.cost_trend === 'decreasing' ? 'down' : 'stable'
            }}
            color={biData.predictions.budget_risk.level === 'high' ? 'red' : 
                   biData.predictions.budget_risk.level === 'medium' ? 'yellow' : 'green'}
          />
          <BIMetricCard
            title={t('businessIntelligence.nextWeekForecast')}
            value={formatCurrency(biData.predictions.next_week_forecast.cost)}
            icon={CalendarDaysIcon}
            subtitle={`${(biData.predictions.next_week_forecast.tokens / 1000).toFixed(0)}K tokens`}
            color="blue"
          />
          <BIMetricCard
            title={t('businessIntelligence.budgetRisk')}
            value={biData.predictions.budget_risk.level.toUpperCase()}
            icon={ExclamationTriangleIcon}
            subtitle={biData.predictions.budget_risk.projected_overage > 0 ? 
              `${formatCurrency(biData.predictions.budget_risk.projected_overage)} ${t('businessIntelligence.overage')}` : t('businessIntelligence.onTrack')}
            color={biData.predictions.budget_risk.level === 'high' ? 'red' : 
                   biData.predictions.budget_risk.level === 'medium' ? 'yellow' : 'green'}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Cost Trends Chart */}
          <div className="bg-[var(--bg-secondary)] rounded-lg shadow-sm border border-[var(--border-color)] p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center text-[var(--text-primary)]">
              <ArrowTrendingUpIcon className="h-5 w-5 mr-2 text-[var(--text-accent)]" />
              {t('businessIntelligence.costTrends')}
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendsChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                <XAxis 
                  dataKey="date" 
                  stroke={chartTheme.axis}
                  fontSize={12}
                />
                <YAxis 
                  stroke={chartTheme.axis}
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: chartTheme.tooltipBackground,
                    border: `1px solid ${chartTheme.tooltipBorder}`,
                    borderRadius: '8px',
                    color: chartTheme.text,
                  }}
                  formatter={(value, name) => [
                    name === 'cost' ? formatCurrencyDetailed(Number(value), 4) : `${Number(value).toFixed(0)}K`,
                    name === 'cost' ? t('businessIntelligence.cost') : t('businessIntelligence.tokens')
                  ]} 
                />
                <Area 
                  type="monotone" 
                  dataKey="cost" 
                  stackId="1" 
                  stroke={chartTheme.primary} 
                  fill={chartTheme.primary} 
                  fillOpacity={0.6} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Usage Patterns */}
          <div className="bg-[var(--bg-secondary)] rounded-lg shadow-sm border border-[var(--border-color)] p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center text-[var(--text-primary)]">
              <ClockIcon className="h-5 w-5 mr-2 text-[var(--text-accent)]" />
              {t('businessIntelligence.usagePatternsByTime')}
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={usagePatternData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                <XAxis 
                  dataKey="time" 
                  stroke={chartTheme.axis}
                  fontSize={12}
                />
                <YAxis 
                  stroke={chartTheme.axis}
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: chartTheme.tooltipBackground,
                    border: `1px solid ${chartTheme.tooltipBorder}`,
                    borderRadius: '8px',
                    color: chartTheme.text,
                  }}
                  formatter={(value) => [`${value} ${t('businessIntelligence.sessions')}`, t('businessIntelligence.usage')]} 
                />
                <Bar dataKey="usage" fill={chartTheme.success} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Model Efficiency and Anomalies */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ModelEfficiencyTable models={biData.model_efficiency} />
          <AnomalyAlerts anomalies={biData.anomalies} />
        </div>

        {/* AI-Generated Insights & Recommendations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Usage Patterns & Insights */}
          <div className="bg-[var(--bg-secondary)] rounded-lg shadow-sm border border-[var(--border-color)] p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center text-[var(--text-primary)]">
              <BoltIcon className="h-5 w-5 mr-2 text-[var(--text-accent)]" />
              {t('businessIntelligence.usagePatterns')}
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg border-l-4 border-[var(--text-accent)]">
                <h4 className="font-medium text-[var(--text-primary)] mb-2">🎯 Model Optimization</h4>
                <p className="text-sm text-[var(--text-secondary)]">
                  Your most efficient model is <strong>{biData.most_efficient_model}</strong>. 
                  Consider using it for {Math.round((1 - (biData.model_efficiency.find(m => m.model === biData.most_efficient_model)?.efficiency_score || 0) / 100) * 30)}% more tasks to optimize costs.
                </p>
              </div>
              
              <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg border-l-4 border-[var(--color-success)]">
                <h4 className="font-medium text-[var(--text-primary)] mb-2">⏰ Peak Hours Analysis</h4>
                <p className="text-sm text-[var(--text-secondary)]">
                  You're most active during <strong>{biData.peak_usage_hours.join(', ')}</strong> on <strong>{biData.busiest_day_of_week}s</strong>. 
                  {biData.cost_burn_rate > 0.01 ? 'Consider scheduling heavy tasks during off-peak hours if possible.' : 'Your usage patterns are well-distributed.'}
                </p>
              </div>

              <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg border-l-4 border-[var(--color-warning)]">
                <h4 className="font-medium text-[var(--text-primary)] mb-2">📊 Session Efficiency</h4>
                <p className="text-sm text-[var(--text-secondary)]">
                  Average {biData.session_efficiency.toFixed(0)} tokens per session. 
                  {biData.session_efficiency > 5000 
                    ? 'Your sessions are comprehensive - consider breaking complex tasks into smaller focused sessions for better cost control.'
                    : 'Your sessions are well-sized for efficient AI interaction.'}
                </p>
              </div>
            </div>
          </div>

          {/* AI Recommendations */}
          <div className="bg-[var(--bg-secondary)] rounded-lg shadow-sm border border-[var(--border-color)] p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center text-[var(--text-primary)]">
              <SparklesIcon className="h-5 w-5 mr-2 text-[var(--text-accent)]" />
              {t('businessIntelligence.aiRecommendations')}
            </h3>
            <div className="space-y-4">
              {biData.predictions.budget_risk.level === 'high' && (
                <div className="p-4 bg-[var(--bg-error)] rounded-lg border-l-4 border-[var(--color-error)]">
                  <h4 className="font-medium text-[var(--text-error)] mb-2">🚨 Budget Alert</h4>
                  <p className="text-sm text-[var(--text-error)]">
                    Projected overage of {formatCurrency(biData.predictions.budget_risk.projected_overage)} this month. 
                    Consider switching to more efficient models or reducing session frequency.
                  </p>
                </div>
              )}
              
              <div className="p-4 bg-[var(--bg-info)] rounded-lg border-l-4 border-[var(--text-accent)]">
                <h4 className="font-medium text-[var(--text-primary)] mb-2">💡 Cost Optimization</h4>
                <p className="text-sm text-[var(--text-secondary)]">
                  {biData.model_efficiency.length > 1 
                    ? `Switch ${Math.round(((biData.model_efficiency[biData.model_efficiency.length - 1]?.costPerToken || 0) / (biData.model_efficiency[0]?.costPerToken || 1) - 1) * 100)}% of tasks from ${biData.model_efficiency[biData.model_efficiency.length - 1]?.model || 'expensive models'} to ${biData.most_efficient_model} to save ~${formatCurrency((biData.total_cost * 0.15))}/month.`
                    : 'Continue using your current model efficiently.'}
                </p>
              </div>

              <div className="p-4 bg-[var(--bg-success)] rounded-lg border-l-4 border-[var(--color-success)]">
                <h4 className="font-medium text-[var(--text-primary)] mb-2">📈 Growth Forecast</h4>
                <p className="text-sm text-[var(--text-secondary)]">
                  Based on current trends, expect {formatCurrency(biData.predictions.next_week_forecast.cost)} next week 
                  ({biData.predictions.cost_trend === 'increasing' ? '+' : biData.predictions.cost_trend === 'decreasing' ? '-' : '±'}
                  {Math.abs(((biData.predictions.next_week_forecast.cost / (biData.total_cost / 4)) - 1) * 100).toFixed(0)}% vs weekly average).
                </p>
              </div>

              <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg border-l-4 border-[var(--border-color)]">
                <h4 className="font-medium text-[var(--text-primary)] mb-2">🎲 Data Quality</h4>
                <p className="text-sm text-[var(--text-secondary)]">
                  Analysis confidence: {biData.data_quality_score.toFixed(0)}% 
                  ({biData.data_points_analyzed.toLocaleString()} data points, {biData.calculation_time_ms.toFixed(0)}ms processing)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics Summary */}
        <div className="bg-[var(--bg-secondary)] rounded-lg shadow-sm border border-[var(--border-color)] p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center text-[var(--text-primary)]">
            <ChartBarIcon className="h-5 w-5 mr-2 text-[var(--text-accent)]" />
            {t('businessIntelligence.performanceMetrics')}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
              <div className="text-2xl font-bold text-[var(--text-accent)]">{biData.tokens_per_hour.toFixed(0)}</div>
              <div className="text-sm text-[var(--text-secondary)]">{t('businessIntelligence.tokensPerHour')}</div>
            </div>
            <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
              <div className="text-2xl font-bold text-[var(--text-accent)]">{formatCurrencyDetailed(biData.cost_per_token * 1000000, 2)}</div>
              <div className="text-sm text-[var(--text-secondary)]">Cost/M Tokens</div>
            </div>
            <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
              <div className="text-2xl font-bold text-[var(--text-accent)]">{biData.model_diversity}</div>
              <div className="text-sm text-[var(--text-secondary)]">Models Used</div>
            </div>
            <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
              <div className="text-2xl font-bold text-[var(--text-accent)]">{biData.predictions.confidence_level.toFixed(0)}%</div>
              <div className="text-sm text-[var(--text-secondary)]">Forecast Confidence</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

