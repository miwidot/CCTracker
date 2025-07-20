import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, ComposedChart, Bar } from 'recharts';
import { useTranslation } from '../../hooks/useTranslation';
import { useChartTheme } from '../../hooks/useChartTheme';
import { useCurrency } from '../../hooks/useCurrency';

interface CacheTimelineData {
  date: string;
  cacheHitRate: number; // Percentage 0-100
  totalCacheReads: number;
  totalCacheCreations: number;
  costSavings: number; // USD saved from cache usage
  totalSessions: number;
  cacheEfficiency: number; // Overall efficiency score
}

interface CacheHitRateTimelineProps {
  data: CacheTimelineData[];
  isLoading?: boolean;
}

export const CacheHitRateTimeline: React.FC<CacheHitRateTimelineProps> = ({
  data,
  isLoading = false
}) => {
  const { t } = useTranslation();
  const chartTheme = useChartTheme();
  const { formatCurrency } = useCurrency();

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--text-accent)]" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center text-[var(--text-secondary)]">
        <div className="text-center">
          <div className="text-lg font-medium mb-2">
            {t('charts.cacheHitRateTimeline.noData')}
          </div>
          <div className="text-sm">
            {t('charts.cacheHitRateTimeline.noDataDesc')}
          </div>
        </div>
      </div>
    );
  }

  // Calculate summary statistics
  const totalCostSavings = data.reduce((sum, point) => sum + point.costSavings, 0);
  const avgCacheHitRate = data.reduce((sum, point) => sum + point.cacheHitRate, 0) / data.length;
  const totalCacheReads = data.reduce((sum, point) => sum + point.totalCacheReads, 0);
  const totalCacheCreations = data.reduce((sum, point) => sum + point.totalCacheCreations, 0);

  // Calculate trend
  const firstWeek = data.slice(0, Math.min(7, data.length));
  const lastWeek = data.slice(-Math.min(7, data.length));
  const firstWeekAvg = firstWeek.reduce((sum, p) => sum + p.cacheHitRate, 0) / firstWeek.length;
  const lastWeekAvg = lastWeek.reduce((sum, p) => sum + p.cacheHitRate, 0) / lastWeek.length;
  const trendDirection = lastWeekAvg > firstWeekAvg ? 'improving' : lastWeekAvg < firstWeekAvg ? 'declining' : 'stable';
  const trendPercentage = Math.abs(((lastWeekAvg - firstWeekAvg) / firstWeekAvg) * 100);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload[0]) return null;

    const data = payload[0].payload;
    
    return (
      <div 
        className="p-3 rounded-lg border shadow-lg"
        style={{
          backgroundColor: chartTheme.tooltipBackground,
          borderColor: chartTheme.tooltipBorder,
          color: chartTheme.text,
        }}
      >
        <div className="font-medium mb-2">{new Date(label).toLocaleDateString()}</div>
        <div className="space-y-1 text-sm">
          <div>Cache Hit Rate: {data.cacheHitRate.toFixed(1)}%</div>
          <div>Cache Reads: {data.totalCacheReads.toLocaleString()}</div>
          <div>Cache Creates: {data.totalCacheCreations.toLocaleString()}</div>
          <div>Cost Savings: {formatCurrency(data.costSavings)}</div>
          <div>Sessions: {data.totalSessions}</div>
        </div>
      </div>
    );
  };

  // Format chart data for better display
  const chartData = data.map(point => ({
    ...point,
    displayDate: new Date(point.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
  }));

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg text-center">
          <div className="text-lg font-bold text-[var(--text-primary)]">
            {avgCacheHitRate.toFixed(1)}%
          </div>
          <div className="text-xs text-[var(--text-secondary)]">
            {t('charts.cacheHitRateTimeline.avgHitRate')}
          </div>
        </div>
        <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg text-center">
          <div className="text-lg font-bold text-[var(--color-success)]">
            {formatCurrency(totalCostSavings)}
          </div>
          <div className="text-xs text-[var(--text-secondary)]">
            {t('charts.cacheHitRateTimeline.totalSavings')}
          </div>
        </div>
        <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg text-center">
          <div className="text-lg font-bold text-[var(--text-primary)]">
            {totalCacheReads.toLocaleString()}
          </div>
          <div className="text-xs text-[var(--text-secondary)]">
            {t('charts.cacheHitRateTimeline.cacheReads')}
          </div>
        </div>
        <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg text-center">
          <div className={`text-lg font-bold ${
            trendDirection === 'improving' ? 'text-[var(--color-success)]' : 
            trendDirection === 'declining' ? 'text-[var(--color-error)]' : 
            'text-[var(--text-secondary)]'
          }`}>
            {trendDirection === 'stable' ? '→' : trendDirection === 'improving' ? '↗' : '↘'}
            {trendPercentage.toFixed(0)}%
          </div>
          <div className="text-xs text-[var(--text-secondary)]">
            {t('charts.cacheHitRateTimeline.trend')}
          </div>
        </div>
      </div>

      {/* Main Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
          <XAxis 
            dataKey="displayDate" 
            stroke={chartTheme.axis}
            fontSize={12}
          />
          <YAxis 
            yAxisId="hitRate"
            orientation="left"
            stroke={chartTheme.axis}
            fontSize={12}
            domain={[0, 100]}
            label={{ 
              value: 'Cache Hit Rate (%)', 
              angle: -90, 
              position: 'insideLeft',
              style: { textAnchor: 'middle' }
            }}
          />
          <YAxis 
            yAxisId="savings"
            orientation="right"
            stroke={chartTheme.axis}
            fontSize={12}
            tickFormatter={(value) => `$${value.toFixed(2)}`}
            label={{ 
              value: 'Cost Savings', 
              angle: 90, 
              position: 'insideRight',
              style: { textAnchor: 'middle' }
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Cost savings as bars */}
          <Bar 
            yAxisId="savings"
            dataKey="costSavings" 
            fill={chartTheme.getDataColor(6)}
            opacity={0.6}
            name="Cost Savings"
          />
          
          {/* Cache hit rate as line */}
          <Line 
            yAxisId="hitRate"
            type="monotone" 
            dataKey="cacheHitRate" 
            stroke={chartTheme.primary}
            strokeWidth={3}
            dot={{ r: 4, fill: chartTheme.primary }}
            activeDot={{ r: 6, stroke: chartTheme.primary, strokeWidth: 2 }}
            name="Cache Hit Rate"
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Cache Efficiency Breakdown */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
          <h4 className="font-medium text-[var(--text-primary)] mb-3">
            {t('charts.cacheHitRateTimeline.cachePerformance')}
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">{t('charts.cacheHitRateTimeline.totalCacheOperations')}</span>
              <span className="font-medium">{(totalCacheReads + totalCacheCreations).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">{t('charts.cacheHitRateTimeline.cacheCreates')}</span>
              <span className="font-medium">{totalCacheCreations.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">{t('charts.cacheHitRateTimeline.cacheReads')}:</span>
              <span className="font-medium text-[var(--color-success)]">
                {totalCacheReads.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">{t('charts.cacheHitRateTimeline.hitRate')}</span>
              <span className="font-medium">
                {((totalCacheReads / (totalCacheReads + totalCacheCreations)) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
          <h4 className="font-medium text-[var(--text-primary)] mb-3">
            {t('charts.cacheHitRateTimeline.optimizationInsights')}
          </h4>
          <div className="text-sm text-[var(--text-secondary)] space-y-1">
            {avgCacheHitRate >= 70 ? (
              <div>• {t('charts.cacheHitRateTimeline.excellentCache')}</div>
            ) : avgCacheHitRate >= 50 ? (
              <div>• {t('charts.cacheHitRateTimeline.goodCache')}</div>
            ) : (
              <div>• {t('charts.cacheHitRateTimeline.lowCache')}</div>
            )}
            
            <div>• {t('charts.cacheHitRateTimeline.bestPeriod')} {data.reduce((best, current) => 
              current.cacheHitRate > best.cacheHitRate ? current : best
            ).date.split('T')[0]} ({data.reduce((best, current) => 
              current.cacheHitRate > best.cacheHitRate ? current : best
            ).cacheHitRate.toFixed(1)}%)</div>
            
            <div>• {t('charts.cacheHitRateTimeline.totalCostImpact')} {formatCurrency(totalCostSavings)} saved</div>
            
            {trendDirection === 'improving' && (
              <div className="text-[var(--color-success)]">
                • {t('charts.cacheHitRateTimeline.improvingTrend')} {trendPercentage.toFixed(1)}%
              </div>
            )}
            {trendDirection === 'declining' && (
              <div className="text-[var(--color-warning)]">
                • {t('charts.cacheHitRateTimeline.decliningTrend')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};