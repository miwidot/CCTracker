import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useTranslation } from '../../hooks/useTranslation';
import { useChartTheme } from '../../hooks/useChartTheme';
import { useCurrency } from '../../hooks/useCurrency';

interface SessionDataPoint {
  sessionId: string;
  duration: number; // in minutes
  totalTokens: number;
  cost: number;
  tokensPerMinute: number;
  costPerToken: number;
  efficiency: number; // calculated efficiency score
  model: string;
}

interface SessionEfficiencyScatterProps {
  data: SessionDataPoint[];
  isLoading?: boolean;
}

export const SessionEfficiencyScatter: React.FC<SessionEfficiencyScatterProps> = ({
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
            {t('charts.sessionEfficiency.noData')}
          </div>
          <div className="text-sm">
            {t('charts.sessionEfficiency.noDataDesc')}
          </div>
        </div>
      </div>
    );
  }

  // Calculate averages for reference lines
  const avgDuration = data.reduce((sum, point) => sum + point.duration, 0) / data.length;
  const avgTokensPerMinute = data.reduce((sum, point) => sum + point.tokensPerMinute, 0) / data.length;

  // Color points based on efficiency
  const getPointColor = (efficiency: number) => {
    if (efficiency >= 80) return chartTheme.success;
    if (efficiency >= 60) return chartTheme.warning;
    return chartTheme.error;
  };

  // Transform data for scatter plot
  const scatterData = data.map(point => ({
    ...point,
    x: point.duration,
    y: point.tokensPerMinute,
    z: point.cost, // Used for bubble size
    fill: getPointColor(point.efficiency)
  }));

  const formatTooltipContent = (value: number, name: string, props: any) => {
    const dataPoint = props.payload;
    if (!dataPoint) return [value, name];

    switch (name) {
      case 'duration':
        return [`${value.toFixed(1)} min`, t('charts.sessionEfficiency.duration')];
      case 'tokensPerMinute':
        return [`${value.toFixed(0)} tokens/min`, t('charts.sessionEfficiency.tokensPerMinute')];
      case 'cost':
        return [formatCurrency(value), t('charts.sessionEfficiency.cost')];
      default:
        return [value, name];
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
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
        <div className="font-medium mb-2">{t('charts.sessionEfficiency.session')}: {data.sessionId.slice(0, 8)}...</div>
        <div className="space-y-1 text-sm">
          <div>{t('charts.sessionEfficiency.duration')}: {data.duration.toFixed(1)} min</div>
          <div>{t('charts.sessionEfficiency.tokensPerMinute')}: {data.tokensPerMinute.toFixed(0)}</div>
          <div>{t('charts.sessionEfficiency.totalTokens')}: {data.totalTokens.toLocaleString()}</div>
          <div>{t('charts.sessionEfficiency.cost')}: {formatCurrency(data.cost)}</div>
          <div>{t('charts.sessionEfficiency.efficiency')}: {data.efficiency.toFixed(0)}%</div>
          <div>{t('charts.sessionEfficiency.model')}: {data.model}</div>
        </div>
      </div>
    );
  };

  // Calculate efficiency zones
  const getEfficiencyZoneStats = () => {
    const zones = {
      high: data.filter(p => p.efficiency >= 80).length,
      medium: data.filter(p => p.efficiency >= 60 && p.efficiency < 80).length,
      low: data.filter(p => p.efficiency < 60).length,
    };
    
    const total = data.length;
    return {
      high: { count: zones.high, percentage: (zones.high / total) * 100 },
      medium: { count: zones.medium, percentage: (zones.medium / total) * 100 },
      low: { count: zones.low, percentage: (zones.low / total) * 100 },
    };
  };

  const efficiencyStats = getEfficiencyZoneStats();

  return (
    <div>
      {/* Chart */}
      <ResponsiveContainer width="100%" height={350}>
        <ScatterChart
          data={scatterData}
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
          <XAxis 
            type="number"
            dataKey="x"
            name="duration"
            stroke={chartTheme.axis}
            fontSize={12}
            label={{ 
              value: t('charts.sessionEfficiency.durationAxis'), 
              position: 'insideBottom', 
              offset: -10,
              style: { textAnchor: 'middle' }
            }}
          />
          <YAxis 
            type="number"
            dataKey="y"
            name="tokensPerMinute"
            stroke={chartTheme.axis}
            fontSize={12}
            label={{ 
              value: t('charts.sessionEfficiency.tokensPerMinuteAxis'), 
              angle: -90, 
              position: 'insideLeft',
              style: { textAnchor: 'middle' }
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Reference lines for averages */}
          <ReferenceLine 
            x={avgDuration} 
            stroke={chartTheme.textSecondary} 
            strokeDasharray="5 5" 
            opacity={0.6}
          />
          <ReferenceLine 
            y={avgTokensPerMinute} 
            stroke={chartTheme.textSecondary} 
            strokeDasharray="5 5" 
            opacity={0.6}
          />
          
          <Scatter 
            name={t('charts.sessionEfficiency.chartName')} 
            data={scatterData} 
            fill={chartTheme.primary}
          />
        </ScatterChart>
      </ResponsiveContainer>

      {/* Efficiency Zone Statistics */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="text-center p-3 bg-[var(--bg-tertiary)] rounded-lg">
          <div className="text-lg font-bold" style={{ color: chartTheme.success }}>
            {efficiencyStats.high.count}
          </div>
          <div className="text-xs text-[var(--text-secondary)]">
            {t('charts.sessionEfficiency.highEfficiency')} ({efficiencyStats.high.percentage.toFixed(0)}%)
          </div>
        </div>
        <div className="text-center p-3 bg-[var(--bg-tertiary)] rounded-lg">
          <div className="text-lg font-bold" style={{ color: chartTheme.warning }}>
            {efficiencyStats.medium.count}
          </div>
          <div className="text-xs text-[var(--text-secondary)]">
            {t('charts.sessionEfficiency.mediumEfficiency')} ({efficiencyStats.medium.percentage.toFixed(0)}%)
          </div>
        </div>
        <div className="text-center p-3 bg-[var(--bg-tertiary)] rounded-lg">
          <div className="text-lg font-bold" style={{ color: chartTheme.error }}>
            {efficiencyStats.low.count}
          </div>
          <div className="text-xs text-[var(--text-secondary)]">
            {t('charts.sessionEfficiency.lowEfficiency')} ({efficiencyStats.low.percentage.toFixed(0)}%)
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="mt-4 p-4 bg-[var(--bg-tertiary)] rounded-lg">
        <h4 className="font-medium text-[var(--text-primary)] mb-2">
          {t('charts.sessionEfficiency.insights')}
        </h4>
        <div className="text-sm text-[var(--text-secondary)] space-y-1">
          <div>• {t('charts.sessionEfficiency.averageDuration')}: {avgDuration.toFixed(1)} min</div>
          <div>• {t('charts.sessionEfficiency.averageRate')}: {avgTokensPerMinute.toFixed(0)} tokens/min</div>
          <div>• {t('charts.sessionEfficiency.bestQuadrant')}: {t('charts.sessionEfficiency.bestQuadrantDesc')}</div>
        </div>
      </div>
    </div>
  );
};